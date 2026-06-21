/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Contractor, ProjectParams, ContractorAgreement, GeneralPriceGuide } from '../types';
import { Search, UserPlus, FileEdit, Trash2, CheckCircle, HelpCircle, X, AlertTriangle, Building2, Users, ArrowUpDown, ArrowUp, ArrowDown, Paperclip, FileText, Sparkles, Plus, Calendar, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';

interface ContractorsTabProps {
  projects: import('../types').Project[];
  activeProjectId: string;
  params: ProjectParams;
  contractors: Contractor[];
  onAddContractor: (newC: Contractor) => void;
  onUpdateContractor: (updatedC: Contractor) => void;
  onDeleteContractor: (id: string) => void;
  generalPriceGuide: GeneralPriceGuide;
  onUpdateGeneralPriceGuide: (newGuide: GeneralPriceGuide) => void;
}

type SortKey = 'id' | 'name' | 'document' | 'type' | 'bank' | 'status';

const getMimeTypeFromExtension = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'xls': return 'application/vnd.ms-excel';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
};

const extractExcelText = (ab: ArrayBuffer, fileName: string): string => {
  try {
    const workbook = XLSX.read(ab, { type: 'array' });
    let output = `Guía o acuerdo extraído del archivo Excel [${fileName}]:\n`;
    workbook.SheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      // Convert sheet rows to JSON array of arrays
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (jsonData.length > 0) {
        output += `\n--- HOJA: ${sheetName} ---\n`;
        jsonData.forEach((row: any) => {
          if (Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== "")) {
            // format row items separated by dashes
            const cleanCells = row.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : '');
            output += `| ${cleanCells.join(' - ')} |\n`;
          }
        });
      }
    });
    return output;
  } catch (err) {
    console.error("Error al leer Excel:", err);
    return `[Error al extraer texto del archivo Excel ${fileName}]`;
  }
};

export default function ContractorsTab({
  projects,
  activeProjectId,
  params,
  contractors,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor,
  generalPriceGuide,
  onUpdateGeneralPriceGuide,
}: ContractorsTabProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("Todos");

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedContractorIds, setSelectedContractorIds] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState<boolean>(false);

  // Dialog State
  const [isOpenForm, setIsOpenForm] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);

  // Contractor price agreements state
  const [agreements, setAgreements] = useState<ContractorAgreement[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [newAgObra, setNewAgObra] = useState<string>("");
  const [newAgContent, setNewAgContent] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [agSuccessMsg, setAgSuccessMsg] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // General Corporate Price Guide States
  const [showGeneralGuideModal, setShowGeneralGuideModal] = useState<boolean>(false);
  const [tempGeneralGuideContent, setTempGeneralGuideContent] = useState<string>("");
  const [tempGeneralGuideFile, setTempGeneralGuideFile] = useState<{name: string, data: string, mimeType: string} | null>(null);
  const [isUploadingGeneralFile, setIsUploadingGeneralFile] = useState<boolean>(false);
  const [genSuccessMsg, setGenSuccessMsg] = useState<string>("");
  const generalFileInputRef = useRef<HTMLInputElement>(null);

  // Editor Input Elements
  const [id, setId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [document, setDocument] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [type, setType] = useState<string>("Albañilería");
  const [status, setStatus] = useState<'Activo' | 'Inactivo'>("Activo");
  const [bank, setBank] = useState<string>("Banco Popular Dominicano");
  const [account, setAccount] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [observations, setObservations] = useState<string>("");

  // Sorting handler
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Sorting header renderer
  const renderSortHeader = (label: string, key: SortKey, isMono = false) => {
    const isActive = sortKey === key;
    return (
      <th 
        onClick={() => handleSort(key)} 
        className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-800 transition-colors group ${isMono ? 'font-mono' : ''}`}
      >
        <div className="flex items-center space-x-1 justify-start">
          <span>{label}</span>
          <span className="shrink-0 transition-colors">
            {isActive ? (
              sortOrder === 'asc' ? (
                <ArrowUp size={11} className="text-blue-600 font-bold" />
              ) : (
                <ArrowDown size={11} className="text-blue-600 font-bold" />
              )
            ) : (
              <ArrowUpDown size={11} className="text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-slate-400" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Search filter and sorting
  const filteredContractors = useMemo(() => {
    const filtered = contractors.filter(c => {
      // Visibility filter
      if (!showHidden && c.isHidden) return false;
      if (showHidden && !c.isHidden) return false;

      const matchSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.document.includes(searchTerm) ||
        c.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = typeFilter === "Todos" || c.type === typeFilter;
      
      return matchSearch && matchType;
    });

    if (sortKey) {
      filtered.sort((a, b) => {
        let valA = a[sortKey] || '';
        let valB = b[sortKey] || '';

        if (typeof valA === 'string') valA = valA.trim().toLowerCase();
        if (typeof valB === 'string') valB = valB.trim().toLowerCase();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [contractors, searchTerm, typeFilter, sortKey, sortOrder]);

  // Distinct types of contractors for category filtering
  const distinctTypes = useMemo(() => {
    const list = new Set(contractors.map(c => c.type));
    return Array.from(list).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [contractors]);

  const toggleSelectContractor = (idStr: string) => {
    setSelectedContractorIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) next.delete(idStr);
      else next.add(idStr);
      return next;
    });
  };

  const toggleSelectAllSearch = () => {
    if (selectedContractorIds.size > 0 && selectedContractorIds.size === filteredContractors.length) {
      setSelectedContractorIds(new Set());
    } else {
      const allIds = new Set(filteredContractors.map(c => c.id));
      setSelectedContractorIds(allIds);
    }
  };

  const handleMassDelete = () => {
    if (selectedContractorIds.size === 0) return;
    if (window.confirm(`¿Estás seguro que deseas eliminar ${selectedContractorIds.size} subcontratistas y todo su historial de esta base de datos?`)) {
      selectedContractorIds.forEach(cid => {
        onDeleteContractor(cid);
      });
      setSelectedContractorIds(new Set());
    }
  };

  const handleToggleContractorHidden = (contractor: Contractor) => {
    onUpdateContractor({ ...contractor, isHidden: !contractor.isHidden });
  };

  const handleOpenNewForm = () => {
    setIsEditing(false);
    // Auto-generate next Contractor ID
    const nextNum = contractors.length + 1;
    const padding = nextNum < 10 ? "00" : nextNum < 100 ? "0" : "";
    setId(`CONT-${padding}${nextNum}`);
    
    setName("");
    setDocument("");
    setPhone("");
    setAddress("");
    setType("Albañilería");
    setStatus("Activo");
    setBank("Banco Popular Dominicano");
    setAccount("");
    setEmail("");
    setObservations("");
    setErrorMessage("");
    setAgreements([]);
    setAssignedProjectIds(activeProjectId ? [activeProjectId] : []);
    setNewAgObra(params?.projectName || "");
    setNewAgContent("");
    setSelectedFile(null);
    setAgSuccessMsg("");
    setIsOpenForm(true);
  };

  const handleOpenEditForm = (c: Contractor) => {
    setIsEditing(true);
    setId(c.id);
    setName(c.name);
    setDocument(c.document);
    setPhone(c.phone);
    setAddress(c.address);
    setType(c.type);
    setStatus(c.status);
    setBank(c.bank);
    setAccount(c.account);
    setEmail(c.email);
    setObservations(c.observations);
    setErrorMessage("");
    setAgreements(c.agreements || []);
    setAssignedProjectIds(c.assignedProjectIds || (activeProjectId ? [activeProjectId] : []));
    setNewAgObra(params?.projectName || "");
    setNewAgContent("");
    setSelectedFile(null);
    setAgSuccessMsg("");
    setIsOpenForm(true);
  };

  const handleDocumentChange = (val: string) => {
    setDocument(val);
    if (!isEditing && val.trim()) {
      const existing = contractors.find(
        c => c.document.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (existing) {
        setName(existing.name);
        setPhone(existing.phone);
        setAddress(existing.address);
        setEmail(existing.email);
        setBank(existing.bank);
        setAccount(existing.account);
        setObservations(existing.observations);
      }
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    const finalName = name.trim() || "N/A";
    const finalDocument = document.trim() || "N/A";
    const finalAccount = account.trim() || "N/A";
    const finalPhone = phone.trim() || "N/A";
    const finalAddress = address.trim() || "N/A";
    const finalType = type.trim() || "N/A";
    const finalEmail = email.trim() || "N/A";
    const finalObservations = observations.trim() || "N/A";

    const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const normalizedName = normalizeStr(finalName);
    const normalizedType = normalizeStr(finalType);
    const normalizedDoc = finalDocument.replace(/[-., ]/g, '');

    // Check 1: Exactly same Name and Specialty (bypassed if finalName is "N/A")
    const dupNameSpecialty = finalName !== "N/A" && contractors.find(
      c => (isEditing ? c.id !== id : true) &&
           normalizeStr(c.name) === normalizedName &&
           normalizeStr(c.type) === normalizedType
    );

    if (dupNameSpecialty) {
      return setErrorMessage(`El contratista "${finalName}" ya está registrado con la actividad de "${finalType}". No se puede registrar la misma especialidad más de una vez para el mismo nombre.`);
    }

    // Check 2: Same Document and Specialty (bypassed if finalDocument is "N/A")
    const dupSpecialty = finalDocument !== "N/A" && contractors.find(
      c => (isEditing ? c.id !== id : true) &&
           c.document.trim().replace(/[-., ]/g, '') === normalizedDoc &&
           normalizeStr(c.type) === normalizedType
    );

    if (dupSpecialty) {
      return setErrorMessage(`El documento "${finalDocument}" ya está registrado con la especialidad "${finalType}" bajo el nombre "${dupSpecialty.name}". Verifique posibles datos duplicados.`);
    }

    // Check 3: Same Document but DIFFERENT name (bypassed if finalDocument is "N/A")
    const docWithDifferentName = finalDocument !== "N/A" && contractors.find(
      c => (isEditing ? c.id !== id : true) &&
           c.document.trim().replace(/[-., ]/g, '') === normalizedDoc &&
           normalizeStr(c.name) !== normalizedName
    );

    if (docWithDifferentName) {
      return setErrorMessage(`Alerta: La cédula ${finalDocument} ya pertenece a "${docWithDifferentName.name}". Verifique duplicidad de datos o Info4.`);
    }

    // Check duplicate ID (if brand new)
    if (!isEditing) {
      const dupId = contractors.find(c => c.id.trim() === id.trim());
      if (dupId) {
        return setErrorMessage(`El ID de contratista ${id} ya existe en el sistema`);
      }
    }

    const contractorObj: Contractor = {
      id,
      name: finalName,
      document: finalDocument,
      phone: finalPhone,
      address: finalAddress,
      type: finalType,
      status,
      bank,
      account: finalAccount,
      email: finalEmail,
      observations: finalObservations,
      agreements,
      assignedProjectIds
    };

    if (isEditing) {
      onUpdateContractor(contractorObj);
    } else {
      onAddContractor(contractorObj);
    }

    setIsOpenForm(false);
  };

  const handleOpenGeneralGuide = () => {
    setTempGeneralGuideContent(generalPriceGuide?.content || "");
    setTempGeneralGuideFile(generalPriceGuide?.fileName && generalPriceGuide?.fileBase64 ? {
      name: generalPriceGuide.fileName,
      data: generalPriceGuide.fileBase64,
      mimeType: generalPriceGuide.mimeType || "application/octet-stream"
    } : null);
    setGenSuccessMsg("");
    setShowGeneralGuideModal(true);
  };

  const handleSaveGeneralGuide = () => {
    onUpdateGeneralPriceGuide({
      content: tempGeneralGuideContent,
      fileName: tempGeneralGuideFile?.name || null,
      fileBase64: tempGeneralGuideFile?.data || null,
      mimeType: tempGeneralGuideFile?.mimeType || null,
      updatedAt: new Date().toISOString()
    });
    setGenSuccessMsg("Guía de precios guardada con éxito.");
    setTimeout(() => {
      setGenSuccessMsg("");
      setShowGeneralGuideModal(false);
    }, 1500);
  };

  const handleGeneralFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGeneralFile(true);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = reader.result as string;
        const base64Data = result.split(',')[1] || '';
        const resolvedMime = file.type || getMimeTypeFromExtension(file.name);
        
        setTempGeneralGuideFile({
          name: file.name,
          data: base64Data,
          mimeType: resolvedMime
        });

        const lowerName = file.name.toLowerCase();
        const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

        if (isExcel) {
          const abReader = new FileReader();
          abReader.onload = (excelEvent) => {
            const ab = excelEvent.target?.result as ArrayBuffer;
            const textContent = extractExcelText(ab, file.name);
            setTempGeneralGuideContent(textContent);
          };
          abReader.readAsArrayBuffer(file);
        } else if (resolvedMime.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
          const textReader = new FileReader();
          textReader.onload = (txtEvent) => {
            setTempGeneralGuideContent(txtEvent.target?.result as string);
          };
          textReader.readAsText(file);
        }
      } catch (err) {
        console.error("Error to parse file contents:", err);
      } finally {
        setIsUploadingGeneralFile(false);
      }
    };
    reader.onerror = () => {
      setIsUploadingGeneralFile(false);
      alert("Error al cargar el archivo de precios.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveGeneralFile = () => {
    setTempGeneralGuideFile(null);
    if (generalFileInputRef.current) {
      generalFileInputRef.current.value = "";
    }
  };

  return (
    <div id="contractors-tab" className="space-y-6">
      
      {/* Search Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Text Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por ID, nombre, cédula o RNC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 font-mono"
            />
          </div>

          {/* Specialty Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:border-blue-500 bg-white min-w-[150px]"
          >
            <option value="Todos">Todas las Especialidades</option>
            {distinctTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Mostrar Ocultos</span>
          </label>
        </div>

          {/* Actions Button Group */}
          <div className="flex flex-wrap gap-2 justify-end">
            {selectedContractorIds.size > 0 && (
              <button
                onClick={handleMassDelete}
                className="bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm animate-in fade-in"
              >
                <Trash2 size={15} />
                <span>Borrar Selección ({selectedContractorIds.size})</span>
              </button>
            )}

            <button
              onClick={handleOpenGeneralGuide}
              className="bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-slate-950 shadow-sm"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Guía Base de la Empresa</span>
            </button>

            <button
              onClick={handleOpenNewForm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-blue-700 shadow-sm"
            >
              <UserPlus size={15} />
              <span>Registrar Contratista</span>
            </button>
          </div>
        </div>

        {/* Contractors List Sheet Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              Base de Contratistas Registrados
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md font-mono">
              {filteredContractors.length} de {contractors.length} contratistas
            </span>
          </div>

          {filteredContractors.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Users size={32} className="mx-auto text-slate-300" strokeWidth={1.5} />
              <p className="text-xs font-medium">No se encontraron contratistas con los filtros seleccionados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedContractorIds.size > 0 && selectedContractorIds.size === filteredContractors.length}
                        onChange={toggleSelectAllSearch}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    {renderSortHeader("ID", "id", true)}
                    {renderSortHeader("Nombre", "name")}
                    {renderSortHeader("Cédula / RNC", "document", true)}
                    {renderSortHeader("Especialidad", "type")}
                    {renderSortHeader("Banco Receptor / Cuenta", "bank")}
                    {renderSortHeader("Estado", "status")}
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center select-none">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredContractors.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox"
                          checked={selectedContractorIds.has(c.id)}
                          onChange={() => toggleSelectContractor(c.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-900">{c.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <div>
                        <p>{c.name}</p>
                        <span className="text-[10px] text-slate-400 block font-normal">{c.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600 font-medium">{c.document}</td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-1">
                        <Building2 size={12} className="text-slate-400" />
                        <span className="text-slate-700 font-medium">{c.bank}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">{c.account}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === 'Activo' ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-semibold px-2 py-0.5 rounded-full text-[10px] inline-flex items-center space-x-1">
                          <CheckCircle size={10} />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 font-medium px-2 py-0.5 rounded-full text-[10px] inline-flex items-center">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        {activeDeleteId === c.id ? (
                          <div className="flex items-center space-x-1.5 bg-red-50 p-1 rounded border border-red-200">
                            <span className="text-[10px] text-red-600 font-bold">¿Borrar?</span>
                            <button
                              onClick={() => {
                                onDeleteContractor(c.id);
                                setActiveDeleteId(null);
                              }}
                              className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded hover:bg-red-700 cursor-pointer"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setActiveDeleteId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded hover:bg-slate-300 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleContractorHidden(c)}
                              title={c.isHidden ? "Mostrar contratista" : "Ocultar contratista"}
                              className={`p-1 rounded cursor-pointer transition-colors ${c.isHidden ? 'text-blue-500 hover:text-blue-900 hover:bg-blue-50' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
                            >
                              {c.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                              onClick={() => handleOpenEditForm(c)}
                              title="Editar expediente"
                              className="text-slate-500 hover:text-slate-900 p-1 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <FileEdit size={14} />
                            </button>
                            <button
                              onClick={() => setActiveDeleteId(c.id)}
                              title="Eliminar contratista"
                              className="text-red-500 hover:text-red-900 p-1 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-In Modal Form editor */}
      {isOpenForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <UserPlus size={16} className="text-blue-400" />
                  <span>{isEditing ? `Modificar Contratista: ${id}` : "Registrar Nuevo Contratista"}</span>
                </h3>
                <p className="text-[10px] text-slate-400">Asegure la validez de los datos de cuenta para que los pagos no fallen</p>
              </div>
              <button 
                onClick={() => setIsOpenForm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error alerts */}
            {errorMessage && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5">
                <AlertTriangle size={15} className="text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form body container */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID (Display/Edit) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ID Fiscal del Sistema (Fijo)</label>
                  <input
                    type="text"
                    value={id}
                    disabled
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono font-semibold text-slate-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estado Administrativo:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Activo' | 'Inactivo')}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Activo">Activo (Apto para reportes)</option>
                    <option value="Inactivo">Inactivo (Suspendido temporalmente)</option>
                  </select>
                </div>

                {/* Name */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo de la Razón Social:</label>
                  <input
                    type="text"
                    placeholder="Ej. Pedro Pérez o Ingeniería Estructural S.R.L."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                {/* Document (Cédula/RNC) */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Cédula o RNC (Identificación Oficial):</label>
                  <input
                    type="text"
                    placeholder="Ej. RNC: 1-31-45678-2 o Cédula: 001-XXXXXXX-X"
                    value={document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-blue-500"
                  />
                  {!isEditing && contractors.some(c => c.document.trim().toLowerCase() === document.trim().toLowerCase()) && (
                    <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                      ✓ Documento registrado. Datos cargados automáticamente.
                    </span>
                  )}
                </div>

                {/* Specialty / Type */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Especialidad de Trabajo en Obra:</label>
                  <input
                    type="text"
                    placeholder="Ej. Albañilería, Plomería, Hormigón, Acero, Limpieza"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    list="specialty-suggestions"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  />
                  <datalist id="specialty-suggestions">
                    <option value="Albañilería" />
                    <option value="Plomería / Hidráulica" />
                    <option value="Hormigón Armado" />
                    <option value="Varillero / Acero" />
                    <option value="Electricidad" />
                    <option value="Terminaciones finas" />
                    <option value="Pintura" />
                  </datalist>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Teléfono Móvil / Oficina:</label>
                  <input
                    type="tel"
                    placeholder="Ej. 809-555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico Principal:</label>
                  <input
                    type="email"
                    placeholder="Ej. contacto@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Dirección Comercial/Física Completa:</label>
                  <input
                    type="text"
                    placeholder="Calle, Número, Sector, Municipio"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Bank */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Entidad Bancaria de Pago:</label>
                  <select
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="Banco Popular Dominicano">Banco Popular Dominicano</option>
                    <option value="Banco de Reservas">Banco de Reservas (Banreservas)</option>
                    <option value="Banco BHD">Banco BHD</option>
                    <option value="Scotiabank República Dominicana">Scotiabank</option>
                    <option value="Asociación Popular de A. y Préstamos">Asociación Popular (APAP)</option>
                    <option value="Asociación Cibao de A. y Préstamos">Asociación Cibao (ACAP)</option>
                  </select>
                </div>

                {/* Bank Account */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Número de Cuenta Bancaria:</label>
                  <input
                    type="text"
                    placeholder="Ej. 1029384756 o IBAN / CLABE"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-mono focus:outline-hidden focus:border-blue-500 font-semibold"
                  />
                </div>

                {/* Observations */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Observaciones o Notas de Supervisión:</label>
                  <textarea
                    placeholder="Añadir notas particulares, aprobaciones técnicas, etc."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                {/* Project Assignment */}
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-2">Obras Asignadas:</label>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                    {projects.map((proj) => {
                      const isChecked = assignedProjectIds.includes(proj.id);
                      return (
                        <label key={proj.id} className="flex items-center space-x-2 cursor-pointer hover:bg-white p-1 rounded transition-colors group">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setAssignedProjectIds([...assignedProjectIds, proj.id]);
                              else setAssignedProjectIds(assignedProjectIds.filter(id => id !== proj.id));
                            }}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-900">{proj.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Agreements and Price sheets Section */}
                <div className="md:col-span-2 border-t border-slate-150 pt-4 mt-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                    <Paperclip size={14} className="text-blue-600" />
                    <span>📜 Acuerdos de Precios y Documentos Firmados</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
                    Gestiona acuerdos de precios cerrados o documentos escaneados de soporte para que la IA los analice al crear la hoja de producción. Como esta aplicación se adaptará para centralizar múltiples obras en el futuro, puedes asociar acuerdos a proyectos específicos.
                  </p>

                  {/* List of existing agreements */}
                  {agreements.length > 0 ? (
                    <div className="space-y-2.5 mb-4 pb-4">
                      {agreements.map((ag) => (
                        <div key={ag.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 relative hover:shadow-xs transition-shadow">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAgreements(agreements.filter(a => a.id !== ag.id));
                            }}
                            className="absolute top-2.5 right-2 text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            title="Eliminar acuerdo"
                          >
                            <X size={14} />
                          </button>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                              Obra: {ag.projectName}
                            </span>
                            {ag.fileName && (() => {
                              const ext = ag.fileName.split('.').pop()?.toLowerCase() || '';
                              let bgClass = "bg-slate-100 text-slate-700 border-slate-200";
                              let label = "Archivo";
                              if (ext === 'pdf') {
                                bgClass = "bg-rose-50 text-rose-800 border-rose-150";
                                label = "PDF Documento";
                              } else if (['xlsx', 'xls', 'csv'].includes(ext)) {
                                bgClass = "bg-emerald-50 text-emerald-800 border-emerald-150";
                                label = "Hoja de Cálculo";
                              } else if (['docx', 'doc'].includes(ext)) {
                                bgClass = "bg-sky-50 text-sky-800 border-sky-150";
                                label = "Contrato Word";
                              } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
                                bgClass = "bg-purple-50 text-purple-800 border-purple-150";
                                label = "Digitalización";
                              }
                              return (
                                <span className={`text-[10px] ${bgClass} px-2 py-0.5 rounded-sm flex items-center gap-1 font-extrabold border shadow-xs`}>
                                  <FileText size={10} />
                                  <span>{label}: {ag.fileName}</span>
                                </span>
                              );
                            })()}
                            <span className="text-[9px] text-slate-400 font-mono ml-auto">
                              Actualizado: {new Date(ag.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {ag.content && (
                            <pre className="text-[11px] text-slate-700 leading-normal font-sans bg-white border border-slate-100 rounded p-2 mt-1.5 max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                              {ag.content}
                            </pre>
                          )}

                          {ag.fileBase64 && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <a
                                href={`data:${ag.mimeType || 'application/octet-stream'};base64,${ag.fileBase64}`}
                                download={ag.fileName || 'document'}
                                className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 transition-all"
                              >
                                ⬇️ Descargar Archivo original
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-4 text-center text-slate-400 text-xs mb-4">
                      No hay acuerdos cargados. Añade uno a continuación para que la IA disponga de precios contractuales de referencia.
                    </div>
                  )}

                  {/* Form to add a new agreement */}
                  <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-3.5 space-y-3">
                    <span className="text-[11px] font-extrabold text-slate-750 uppercase tracking-wide block">
                      ➕ Añadir nuevo acuerdo o tarifa pactada
                    </span>
                    
                    {/* Success notification block */}
                    {agSuccessMsg && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[11px] font-semibold leading-relaxed flex items-start space-x-1.5 animate-fade-in relative shadow-xs">
                        <CheckCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <span>{agSuccessMsg}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAgSuccessMsg(""); }}
                          className="text-emerald-500 hover:text-emerald-700 absolute top-2 right-2 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Obra / Proyecto Asociado:</label>
                        <input
                          type="text"
                          placeholder="Ej. Torre Residencial Vista Real, General, etc."
                          value={newAgObra}
                          onChange={(e) => {
                            setNewAgObra(e.target.value);
                            setAgSuccessMsg("");
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-hidden focus:border-blue-500 font-semibold"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5 font-sans">Adjuntar Documento Contractual (PDF, Excel, Word, etc):</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept=".pdf, .xlsx, .xls, .docx, .doc, .txt, .csv, image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setAgSuccessMsg("");
                              if (file) {
                                setIsUploadingFile(true);
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  try {
                                    const base64Data = event.target?.result as string;
                                    const pureBase64 = base64Data.split(',')[1] || base64Data;
                                    const resolvedMime = file.type || getMimeTypeFromExtension(file.name);
                                    
                                    setSelectedFile({
                                      name: file.name,
                                      data: pureBase64,
                                      mimeType: resolvedMime,
                                    });
                                    
                                    const lowerName = file.name.toLowerCase();
                                    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

                                    if (isExcel) {
                                      const abReader = new FileReader();
                                      abReader.onload = (excelEvent) => {
                                        const ab = excelEvent.target?.result as ArrayBuffer;
                                        const textContent = extractExcelText(ab, file.name);
                                        setNewAgContent(textContent);
                                      };
                                      abReader.readAsArrayBuffer(file);
                                    } else if (resolvedMime.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
                                      const textReader = new FileReader();
                                      textReader.onload = (txtEvent) => {
                                        setNewAgContent(txtEvent.target?.result as string);
                                      };
                                      textReader.readAsText(file);
                                    }
                                  } catch (err) {
                                    console.error("Error al procesar archivo adjunto:", err);
                                    alert("No se pudo procesar el archivo. Formato no compatible.");
                                  } finally {
                                    setIsUploadingFile(false);
                                  }
                                };
                                reader.onerror = () => {
                                  alert("Error de lectura del archivo.");
                                  setIsUploadingFile(false);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-left font-semibold truncate flex items-center gap-1.5 focus:outline-hidden cursor-pointer"
                          >
                            <Paperclip size={12} className="text-slate-500" />
                            <span className="truncate">
                              {selectedFile ? selectedFile.name : (isUploadingFile ? "Cargando..." : "Elegir archivo...")}
                            </span>
                          </button>
                          
                          {selectedFile && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                              className="text-red-500 hover:text-red-700 p-1.5 bg-white border border-slate-300 rounded cursor-pointer"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Listado de precios o condiciones (Texto editable):</label>
                      <textarea
                        placeholder="Ej.&#13;Vaciado de losa m3: DOP 450&#13;Asentado block de 6 m2: DOP 120&#13;Terminación yeso rústico m2: DOP 100"
                        value={newAgContent}
                        onChange={(e) => {
                          setNewAgContent(e.target.value);
                          setAgSuccessMsg("");
                        }}
                        rows={3}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-hidden focus:border-blue-500 font-mono leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          const obra = newAgObra.trim();
                          if (!obra) {
                            alert("Por favor, escriba el nombre de la obra / de asociación.");
                            return;
                          }
                          if (!newAgContent.trim() && !selectedFile) {
                            alert("Por favor agregue los acuerdos de precios en texto, u adjunte un archivo de respaldo (PDF / Excel / Word).");
                            return;
                          }
                          
                          const newAg: ContractorAgreement = {
                            id: `ag-${Date.now()}`,
                            projectName: obra,
                            content: newAgContent.trim(),
                            fileName: selectedFile?.name,
                            fileBase64: selectedFile?.data,
                            mimeType: selectedFile?.mimeType,
                            updatedAt: new Date().toISOString()
                          };
                          
                          setAgreements([...agreements, newAg]);
                          setAgSuccessMsg(`✓ Acuerdo asociado correctamente para la obra "${obra}". Recuerde hacer clic en el botón azul de "Avanzar Cambios" abajo para guardarlo permanentemente en el servidor.`);
                          setNewAgContent("");
                          setSelectedFile(null);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs px-3.5 py-1.5 rounded-md font-bold flex items-center gap-1.5 cursor-pointer transition-all focus:outline-hidden"
                      >
                        <Plus size={12} />
                        Asociar Acuerdo de Precios
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-slate-100 pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md text-xs font-medium cursor-pointer"
                >
                  Cancelar Expediente
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 border border-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold cursor-pointer transition-all shadow-sm"
                >
                  {isEditing ? "Avanzar Cambios" : "Guardar Contratista"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERAL PRICE GUIDE MODAL */}
      {showGeneralGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="text-emerald-400" size={18} />
                <div>
                  <h3 className="font-bold text-sm">Guía de Precios Base de la Empresa General</h3>
                  <p className="text-[10px] text-slate-300">Auditoría Corporativa & Fallback de Precios</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowGeneralGuideModal(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              <div className="p-3 bg-blue-50 border border-blue-150 rounded-lg text-[11px] text-blue-900 leading-relaxed flex items-start gap-2.5">
                <Sparkles size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <strong>¿Cómo funciona el Fallback de Precios?</strong> Si un contratista no tiene cargado o indexado un acuerdo de precios contractual particular para la obra activa, el Auditor Automatizado de IA recurrirá inmediatamente a este pliego base corporativo para verificar los precios ingresados en las hojas de cubicación.
                </div>
              </div>

              {genSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-lg text-xs text-emerald-800 font-semibold">
                  {genSuccessMsg}
                </div>
              )}

              {/* File Attachment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">Documento Guía Base de Respaldo (Excel, Word, PDF o Imagen):</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={generalFileInputRef}
                    onChange={handleGeneralFileUpload}
                    accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => generalFileInputRef.current?.click()}
                    disabled={isUploadingGeneralFile}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Paperclip size={14} className="text-slate-600" />
                    <span>
                      {tempGeneralGuideFile ? "Reemplazar Documento" : "Adjuntar Guía Base Física"}
                    </span>
                  </button>

                  {tempGeneralGuideFile && (
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1 px-3 text-xs text-slate-700 font-mono">
                      <FileText size={14} className="text-blue-600" />
                      <span className="truncate max-w-[200px] font-bold">{tempGeneralGuideFile.name}</span>
                      <button
                        type="button"
                        onClick={handleRemoveGeneralFile}
                        className="text-red-500 hover:text-red-750 p-1 cursor-pointer"
                        title="Remover archivo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {isUploadingGeneralFile && (
                    <span className="text-xs text-slate-500 font-mono animate-pulse">Cargando archivo...</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Formatos recomendados: Excel (.xlsx), PDF firmado, Word (.docx) o digitalizaciones JPG/PNG. La IA procesará el contenido del archivo adjunto para extraer referencias de precios.
                </p>
              </div>

              {/* Text Area pricing guidelines */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-700 block">Listado de Precios Estándar en Texto (Editable):</label>
                  <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold">Consolidado</span>
                </div>
                <textarea
                  placeholder="Escriba aquí los renglones y sus precios base. Ejemplos:&#13;Vaciado de concreto de vigas m3: DOP 1,400.00&#13;Asentamiento de bloques de 8 m2: DOP 150.00&#13;Colocación de zapata de muro m3: DOP 800.00&#13;Excavación manual en cepas m3: DOP 650.00"
                  value={tempGeneralGuideContent}
                  onChange={(e) => setTempGeneralGuideContent(e.target.value)}
                  className="w-full h-64 border border-slate-300 rounded-lg p-3 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-slate-500 focus:border-slate-500 leading-relaxed bg-slate-50/50"
                />
                <p className="text-[10px] text-slate-400 leading-normal">
                  Consejo: Mantenga un renglón por línea con su respectivo precio aproximado o exacto. Esto facilitará enormemente que el Auditor de Inteligencia Artificial determine correspondencias semánticas con las cubicaciones cargadas de cada subcontratista.
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowGeneralGuideModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-md text-xs font-medium cursor-pointer transition-all"
              >
                Cerrar sin Guardar
              </button>
              <button
                type="button"
                onClick={handleSaveGeneralGuide}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white rounded-md text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                Guardar Pliego Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
