import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  MessageSquare, 
  Upload, 
  FileSpreadsheet, 
  Trash2, 
  Paperclip, 
  Send, 
  Sparkles, 
  Cpu, 
  Plus, 
  X, 
  CheckCircle2, 
  Info,
  Calendar,
  AlertCircle,
  Mic,
  MicOff,
  FileText,
  Copy,
  Check
} from 'lucide-react';
import { Contractor, ProductionSheet, ProductionRow, ProjectParams, GeneralPriceGuide } from '../types';

interface AiChatTabProps {
  contractors: Contractor[];
  sheets: ProductionSheet[];
  params: ProjectParams;
  onAddContractor: (newContractor: Contractor) => void;
  onUpdateContractor: (updatedContractor: Contractor) => void;
  onDeleteContractor: (id: string) => void;
  onUpdateSheet: (updatedSheet: ProductionSheet) => void;
  onAddSheet: (newSheet: ProductionSheet) => void;
  onDeleteSheet: (id: string) => void;
  onUpdateParams: (newParams: ProjectParams) => void;
  addAuditEntry: (action: string, details: string) => void;
  generalPriceGuide?: GeneralPriceGuide;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  filePreview?: { // Keeping for backward compatibility if needed
    name: string;
    type: 'image' | 'excel' | 'pdf';
    base64Url?: string;
    parsedDataSummary?: string;
  };
  filePreviews?: {
    name: string;
    type: 'image' | 'excel' | 'pdf';
    base64Url?: string;
    parsedDataSummary?: string;
  }[];
  extractedData?: {
    contractors?: any[];
    productionRows?: any[];
    actions?: {
      type: 'DELETE_CONTRACTOR' | 'UPDATE_CONTRACTOR' | 'CREATE_SHEET' | 'DELETE_SHEET' | 'UPDATE_PARAMS';
      payload: any;
      executed?: boolean;
    }[];
  };
}

export default function AiChatTab({
  contractors,
  sheets,
  params,
  onAddContractor,
  onUpdateContractor,
  onDeleteContractor,
  onUpdateSheet,
  onAddSheet,
  onDeleteSheet,
  onUpdateParams,
  addAuditEntry,
  generalPriceGuide
}: AiChatTabProps) {
  
  // --- CHAT & DOCUMENT ANALYZER STATE ---
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('nom_construction_ai_messages');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing messages from localStorage", e);
      }
    }
    return [
      {
        id: 'msg-init',
        sender: 'system',
        text: '¡Bienvenido al Asistente de Análisis de Obras con Inteligencia Artificial!\n\nAquí puedes escribir consultas libres sobre tus contratistas u hojas de reporte. También puedes arrastrar o subir imágenes (fotos de talonarios, recibos de cubicación de constructores, capturas de pantalla), archivos PDF o planillas de Excel (.xlsx). El modelo de Gemini analizará los datos y te permitirá agregarlos a la base de datos central de esta aplicación con un solo clic.',
        timestamp: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('nom_construction_ai_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn("Could not save AI messages to localStorage", e);
    }
  }, [messages]);
  
  const [inputText, setInputText] = useState('');
  const [confirmClearChat, setConfirmClearChat] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessageText = (id: string, text: string) => {
    const cleanText = text.split(/```json/)[0].trim();
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopiedMessageId(id);
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    }).catch(err => {
      console.error("No se pudo copiar el texto: ", err);
    });
  };

  const [isDraggingOverChat, setIsDraggingOverChat] = useState(false);

  const [selectedFiles, setSelectedFiles] = useState<{
    fileObj: File;
    name: string;
    type: 'image' | 'excel' | 'pdf';
    base64OrParsedSummary: string; // Base64 if image, formatted JSON/MD summary if excel or pdf
  }[]>([]);

  // Dynamic state for custom safe notification popups and visual touch confirmations in sandbox
  const [notification, setNotification] = useState<{
    type: 'success' | 'warn' | 'error' | null;
    message: string | null;
  }>({ type: null, message: null });

  const lastCreatedSheetIdRef = useRef<string | null>(null);
  const lastCreatedContractorIdRef = useRef<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirmation state for critical actions (DELETE_CONTRACTOR, DELETE_SHEET) without iframe-blocked browser prompt
  const [actionConfirmKey, setActionConfirmKey] = useState<string | null>(null);

  const showNotification = (type: 'success' | 'warn' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(prev => prev.message === message ? { type: null, message: null } : prev);
    }, 6000);
  };

  // --- RECONOCIMIENTO DE VOZ (SPEECH RECOGNITION) STATE ---
  const [isListening, setIsListening] = useState(false);
  const [interimSpeech, setInterimSpeech] = useState("");
  const isListeningRef = useRef(false);
  const [speechLanguage, setSpeechLanguage] = useState<'es-ES' | 'en-US'>('es-ES');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      showNotification('warn', "El reconocimiento de voz no está soportado en este navegador o requiere HTTPS en Google Chrome/Safari.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (isListeningRef.current) {
      isListeningRef.current = false;
      setIsListening(false);
      setInterimSpeech("");
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    isListeningRef.current = true;
    startSpeechRecognition(SpeechRecognition);
  };

  const startSpeechRecognition = (SpeechRecognition: any) => {
    setSpeechError(null);
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimSpeech("");
      };

      recognition.onresult = (event: any) => {
        let finalTranscriptPiece = '';
        let interimTranscriptPiece = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptPiece += event.results[i][0].transcript;
          } else {
            interimTranscriptPiece += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscriptPiece) {
          setInputText(prev => prev ? `${prev} ${finalTranscriptPiece}` : finalTranscriptPiece);
        }
        setInterimSpeech(interimTranscriptPiece);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        
        if (event.error === 'not-allowed') {
          setSpeechError("Permiso de micrófono denegado. Permita el acceso en su navegador.");
          isListeningRef.current = false;
          setIsListening(false);
          setInterimSpeech("");
        } else if (event.error === 'no-speech') {
          // Ignore, we will restart on end
        } else {
          setSpeechError(`Error de reconocimiento: ${event.error}`);
          isListeningRef.current = false;
          setIsListening(false);
          setInterimSpeech("");
        }
        
        setTimeout(() => {
          setSpeechError(null);
        }, 4000);
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          // Restart since it stopped but user didn't request to stop
          try {
             recognition.start();
          } catch(e) {
             // In case of error restarting
             isListeningRef.current = false;
             setIsListening(false);
             setInterimSpeech("");
          }
        } else {
          setIsListening(false);
          setInterimSpeech("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (error) {
      console.error("Failed to start speech recognition", error);
      isListeningRef.current = false;
      setIsListening(false);
      setInterimSpeech("");
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Handle Drag & Drop / Upload of local documents
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files as any) as File[];
      if (selectedFiles.length + files.length > 5) {
        showNotification('warn', "Puedes subir un máximo de 5 archivos simultáneamente.");
        files.splice(5 - selectedFiles.length); // Limit to remaining slots
      }
      files.forEach(file => processIncomingFile(file));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processIncomingFile = (file: File) => {
    const MAX_MB = 4;
    const MAX_BYTES = MAX_MB * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      showNotification('warn', `El archivo ${file.name} excede el límite temporal de ${MAX_MB}MB por archivo.`);
      return;
    }

    const fileType = file.type;
    const lowerName = file.name.toLowerCase();
    const isImage = fileType.includes('image/') || lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');
    const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
    const isPdf = fileType === 'application/pdf' || lowerName.endsWith('.pdf');

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Str = e.target?.result as string;
        // Strip out metadata header for API
        const cleanBase64 = base64Str.split(',')[1];
        setSelectedFiles(prev => {
          if (prev.length >= 5) return prev;
          return [...prev, {
            fileObj: file,
            name: file.name,
            type: 'image',
            base64OrParsedSummary: cleanBase64
          }];
        });
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Str = e.target?.result as string;
        // Strip out metadata header for API
        const cleanBase64 = base64Str.split(',')[1];
        setSelectedFiles(prev => {
          if (prev.length >= 5) return prev;
          return [...prev, {
            fileObj: file,
            name: file.name,
            type: 'pdf',
            base64OrParsedSummary: cleanBase64
          }];
        });
      };
      reader.readAsDataURL(file);
    } else if (isExcel) {
      // Parse local Excel sheets client-side using SheetJS
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const ab = e.target?.result;
          const workbook = XLSX.read(ab, { type: 'array' });
          let summaryOutput = `Resumen estructurado del Excel subido [${file.name}]:\n`;
          
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            if (jsonData.length > 0) {
              summaryOutput += `--- Pestaña: ${sheetName} ---\n`;
              // Format first 15 lines of content
              jsonData.slice(0, 15).forEach((row: any) => {
                if (Array.isArray(row)) {
                  summaryOutput += `| ${row.map(cell => cell !== null && cell !== undefined ? String(cell) : '').join(' | ')} |\n`;
                }
              });
              if (jsonData.length > 15) {
                summaryOutput += `(... y ${jsonData.length - 15} filas más)\n`;
              }
            }
          });

          setSelectedFiles(prev => {
            if (prev.length >= 5) return prev;
            return [...prev, {
              fileObj: file,
              name: file.name,
              type: 'excel',
              base64OrParsedSummary: summaryOutput
            }];
          });
        } catch (err) {
          showNotification('error', "Error leyendo el archivo Excel y sus tablas.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      showNotification('warn', `Formato de archivo no soportado (${file.name}). Por favor suba imágenes (PNG, JPG), PDF o archivos de Excel (XLSX).`);
    }
  };

  const handleDetectCostAnomalies = async () => {
    if (!generalPriceGuide || !generalPriceGuide.content) {
      setMessages(prev => [...prev, {
        id: `msg-sys-${Date.now()}`,
        sender: 'system',
        text: 'No se detectó una "Guía de Precios Base de la Empresa General" en el sistema. Debe configurar los precios de la empresa o acuerdos de un contratista para poder detectar anomalías.',
        timestamp: new Date().toISOString()
      }]);
      return;
    }

    const promptText = `ACTÚA COMO AUDITOR DE COSTOS ESTRICTO (MAXIMA CONCISIÓN, SIN RODEOS). 
REGLA 1: ANTES de emitir un veredicto, REVISA y HOMOLOGA los términos de referencia (descripciones, unidades) de las hojas de producción para que sean lógicamente coherentes con el listado de la "Guía de Precios General". Lee, comprende y asimila los sinónimos y variaciones técnicas antes de asumir un error.
REGLA 2: Devuelve SOLO 'anomalías de costos', identificando 'priceUnit' (precio unitario) cargado que sea inusualmente alto, discordante, o desfasado respecto a la guía base deducida.
REGLA 3: Genera la salida hiper-resumida (para consumir los mínimos tokens). Usa formato tabular simple o bullets cortos: Hoja | Partida | Precio Cargado | Referencial deducido. Muestra sólo anomalías.`;

    const userMessageId = `msg-user-${Date.now()}`;
    const newUserMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: "Revisa y homologa estrictamente las hojas actuales, identifica cualquier anomalía de costos comparada con la Guía Base.",
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsSending(true);

    try {
      // Optimizamos el payload para ahorrar tokens de entrada
      const body: any = {
        message: promptText,
        appState: {
          guide: generalPriceGuide.content, // solo mandamos el texto de la guía
          sheets: sheets.map(s => ({
            name: s.name,
            rows: s.rows.map(r => ({
              desc: r.description,
              u: r.unit,
              p: r.priceUnit
            }))
          }))
        }
      };

      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const textResponse = await response.text();

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}: ${textResponse.substring(0, 50)}...`);
      }

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch(e) {
        throw new Error(`Error de parseo JSON. Estado: ${response.status}.`);
      }
      const answer = data.text;

      setMessages(prev => [...prev, {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        text: answer,
        timestamp: new Date().toISOString()
      }]);
      addAuditEntry("IA Analista", "Se ejecutó detección de anomalías de costos hiper-optimizada.");
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: `msg-error-${Date.now()}`,
        sender: 'system',
        text: `Error de conexión con la IA al buscar anomalías: ${error.message}`,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsSending(false);
    }
  };

  // Chat message send handler calling server API
  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && selectedFiles.length === 0) return;

    let userText = inputText.trim();
    if (selectedFiles.length > 0 && !userText) {
      userText = `He subido ${selectedFiles.length > 1 ? 'archivos' : 'un archivo'}: ${selectedFiles.map(f => f.name).join(', ')}. Analízalo por favor.`;
    }
    const userMessageId = `msg-user-${Date.now()}`;
    
    // Save image or PDF previews
    const filePreviews = selectedFiles.map(f => {
      let previewBase64Url: string | undefined;
      if (f.type === 'image' || f.type === 'pdf') {
        previewBase64Url = `data:${f.fileObj.type};base64,${f.base64OrParsedSummary}`;
      }
      return {
        name: f.name,
        type: f.type,
        base64Url: previewBase64Url,
        parsedDataSummary: f.type === 'excel' ? f.base64OrParsedSummary : undefined
      };
    });

    const newUserMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: userText,
      timestamp: new Date().toISOString(),
      filePreviews: filePreviews.length > 0 ? filePreviews : undefined
    };

    setMessages(prev => [...prev, newUserMessage]);
    
    // Clear inputs immediately
    setInputText('');
    const currentFiles = [...selectedFiles];
    setSelectedFiles([]);
    setIsSending(true);

    try {
      // Build request body for server endpoint with full real-time appState
      const body: any = {
        message: userText,
        appState: {
          generalPriceGuide: generalPriceGuide?.content, // Optimizamos tokens mandando solo el texto
          params: { ...params, companyLogo: undefined }, // Excluir logo b64 para no consumir miles de tokens
          contractors: contractors.map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status
          })),
          sheets: sheets.map(s => ({
            id: s.id,
            name: s.name,
            supervisor: s.supervisor,
            activity: s.activity,
            activeReportId: s.activeReportId,
            reports: s.reports ? s.reports.map(rep => ({
              id: rep.id,
              name: rep.name,
              status: rep.status
            })) : [],
            rows: s.rows.map(r => ({
              id: r.id,
              cId: r.contractorId,
              desc: r.description,
              qty: r.quantity,
              u: r.unit,
              pU: r.priceUnit
            }))
          }))
        }
      };

      if (currentFiles.length > 0) {
        body.files = [];
        let excelDataStr = "";
        
        currentFiles.forEach(f => {
          if (f.type === 'image') {
            body.files.push({
              mimeType: f.fileObj.type || "image/jpeg",
              base64: f.base64OrParsedSummary
            });
          } else if (f.type === 'pdf') {
            body.files.push({
              mimeType: "application/pdf",
              base64: f.base64OrParsedSummary
            });
          } else if (f.type === 'excel') {
            excelDataStr += `\n\n[DATOS EXTRAÍDOS DEL EXCEL SUBIDO: ${f.name}]:\n${f.base64OrParsedSummary}`;
          } else if (f.type === 'parsedContext') {
            excelDataStr += `\n\n${f.base64OrParsedSummary}`;
          }
        });
        
        if (excelDataStr) {
          body.message = `${userText}${excelDataStr}`;
        }
      }

      let textResponse = "";
      
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json' // Explicitly demand JSON
        },
        body: JSON.stringify(body)
      });

      textResponse = await response.text();

      if (!response.ok) {
        let errMsg = `Error HTTP ${response.status}: ${response.statusText}. `;
        try {
          const errJson = JSON.parse(textResponse);
          errMsg += errJson.error || JSON.stringify(errJson);
        } catch(e) {
          if (response.status === 413) {
            errMsg = "El tamaño de los archivos adjuntos excede el límite permitido por la plataforma (413 Payload Too Large). Por favor, intenta subir archivos más pequeños o envíalos de uno en uno.";
          } else {
            errMsg += `Servidor devolvió formato inesperado (posible bloqueo NGINX o límite excedido). Primeros caracteres: ${textResponse.substring(0, 50)}`;
          }
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = JSON.parse(textResponse);
      } catch(e) {
        throw new Error(`Error de parseo JSON. Estado: ${response.status}. Respuesta Inesperada: ${textResponse.substring(0, 50)}...`);
      }
      
      const answer = data.text;

      // Extract JSON coded segments labeled: "```json:extracted_data"
      let parsedExtraction: any = null;
      try {
        let blockStart = answer.indexOf('```json:extracted_data');
        let offset = 22;
        
        if (blockStart === -1) {
          // Fallback to standard json block just in case
          blockStart = answer.indexOf('```json');
          offset = 7;
        }

        if (blockStart !== -1) {
          const blockEnd = answer.indexOf('```', blockStart + offset);
          if (blockEnd !== -1) {
            const rawJsonStr = answer.substring(blockStart + offset, blockEnd).trim();
            parsedExtraction = JSON.parse(rawJsonStr);
          }
        }
      } catch (e) {
        console.error("No se pudo parsear el bloque de JSON de extracción en la respuesta:", e);
      }

      setMessages(prev => [
        ...prev, 
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'assistant',
          text: answer,
          timestamp: new Date().toISOString(),
          extractedData: parsedExtraction || undefined
        }
      ]);

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          sender: 'system',
          text: `⚠️ Error de Comunicación: No se pudo contactar con Gemini AI. Asegúrate de tener una GEMINI_API_KEY configurada. Detalles: ${err.message}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Quick Action: Inject AI Extracted Contractor into Live State
  const handleImportContractor = (imported: any) => {
    // Validate doc length and duplicates (Document + Specialty combination as in ContractorsTab)
    const cleanDoc = (imported.document || "").replace(/\D/g, '');
    const cleanType = (imported.type || "").toLowerCase().trim();
    if (cleanDoc) {
      const docDup = contractors.some(c => 
        c.document.replace(/\D/g, '') === cleanDoc && 
        cleanDoc !== '' && 
        (c.type || "").toLowerCase().trim() === cleanType
      );
      if (docDup) {
        showNotification('warn', `El contratista con Cédula/RNC '${imported.document}' ya está registrado con la especialidad o tipo '${imported.type || "Albañilería"}' en tu base de datos.`);
        return;
      }
    }

    const nextIdNum = contractors.reduce((acc, current) => {
      const parsed = parseInt(current.id.replace("CON-", ""));
      return !isNaN(parsed) && parsed > acc ? parsed : acc;
    }, 0);
    const generatedId = `CON-${String(nextIdNum + 1).padStart(3, '0')}`;

    const newCont: Contractor = {
      id: generatedId,
      name: imported.name || "Contratista Importado",
      document: cleanDoc || "N/A",
      phone: imported.phone || "S/D",
      address: imported.address || "S/D",
      type: imported.type || "Albañilería",
      status: 'Activo',
      bank: imported.bank || 'Banco de Reservas',
      account: imported.account || '000000',
      email: imported.email || '',
      observations: imported.observations || "Importado mediante IA Document Analyzer"
    };

    onAddContractor(newCont);
    addAuditEntry(
      "Creación de Contratista (IA)",
      `Se agregó contratista "${newCont.name}" (${newCont.id}) tras escanear un documento con Gemini API.`
    );
    showNotification('success', `¡Contratista "${newCont.name}" importado con éxito con el ID ${newCont.id}!`);
  };

  // Quick Action: Import AI Extracted Production Row into Sheets
  const handleImportProductionRow = (importedRow: any, targetSheetId: string) => {
    const destSheet = sheets.find(s => s.id === targetSheetId);
    if (!destSheet) {
      showNotification('error', "Hoja de destino inválida.");
      return;
    }

    // Try to link the contractor by name
    const matchedContractor = contractors.find(
      c => c.name.toLowerCase().includes((importedRow.contractorName || "").toLowerCase())
    );

    const linkedId = matchedContractor ? matchedContractor.id : (destSheet.contractorId || contractors[0]?.id || "CON-001");

    const nextNo = destSheet.rows.length > 0 
      ? Math.max(...destSheet.rows.map(r => r.no)) + 1 
      : 1;

    // Separate budget and actual quantities
    const qtyEstim = parseFloat(importedRow.quantityEstim !== undefined ? importedRow.quantityEstim : importedRow.quantity) || 1;
    const qtyActual = parseFloat(importedRow.quantityActual !== undefined ? importedRow.quantityActual : 0);

    const newRow: ProductionRow = {
      id: `row-ia-${Date.now()}-${Math.floor(Math.random() * 1050)}`,
      no: nextNo,
      contractorId: linkedId,
      description: importedRow.description || "Actividad Extractada por IA",
      quantity: qtyEstim,
      unit: importedRow.unit || 'm2',
      priceUnit: parseFloat(importedRow.priceUnit) || 1.0,
      observations: importedRow.observations || "Importado mediante Chat de Análisis Documentos IA",
      createdReportId: undefined // Will be set below
    };

    let updatedReports = destSheet.reports ? [...destSheet.reports] : [];
    let activeRepId = destSheet.activeReportId;

    if (qtyActual > 0 || updatedReports.length === 0) {
      // Find latest OPEN report
      let openReportIndex = updatedReports.findIndex(r => r.status === 'ABIERTO');
      
      if (openReportIndex === -1) {
        // Need to create a new report
        const newReportId = `rep-${Date.now()}`;
        const newReport: any = {
          id: newReportId,
          name: `Reporte #${updatedReports.length + 1} (IA)`,
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0],
          status: 'ABIERTO',
          quantities: {},
          discount1: 0,
          discount2: 0,
        };
        updatedReports.push(newReport);
        activeRepId = newReportId;
        openReportIndex = updatedReports.length - 1;
      } else {
        activeRepId = updatedReports[openReportIndex].id;
      }
    }

    newRow.createdReportId = activeRepId;

    // Initialize/Update quantities map within any reports associated with this sheet
    updatedReports = updatedReports.map((r) => {
      const existingQuants = r.quantities || {};
      if (activeRepId && r.id === activeRepId) {
        return {
          ...r,
          quantities: {
            ...existingQuants,
            [newRow.id]: qtyActual,
          },
        };
      } else {
        return {
          ...r,
          quantities: {
            ...existingQuants,
            [newRow.id]: existingQuants[newRow.id] || 0,
          },
        };
      }
    });

    const updatedSheet: any = {
      ...destSheet,
      rows: [...destSheet.rows, newRow],
      reports: updatedReports,
      activeReportId: activeRepId
    };

    onUpdateSheet(updatedSheet);
    addAuditEntry(
      "Modificación de Hojas (IA)",
      `Se importó cubicación del trabajo: "${newRow.description}" a la hoja excel "${destSheet.name}" por análisis de Gemini IA con Cant. Estimada: ${qtyEstim} y Cant. Actual: ${qtyActual}.`
    );
    showNotification('success', `¡Partida "${newRow.description}" insertada con éxito en la planilla "${destSheet.name}"!`);
  };

  // Handler to execute AI triggered state mutations with verification and Audit logging
  const handleExecuteAction = (messageId: string, actionIndex: number, action: any) => {
    const { type, payload } = action;
    const confirmKey = `${messageId}-${actionIndex}`;

    // For critical operations, implement clear visual confirmation instead of iframe-blocked native window.confirm
    if ((type === 'DELETE_CONTRACTOR' || type === 'DELETE_SHEET') && actionConfirmKey !== confirmKey) {
      setActionConfirmKey(confirmKey);
      showNotification('warn', `Por favor presione de nuevo el botón de acción para confirmar la eliminación definitiva.`);
      return;
    }

    // Reset confirmation state
    setActionConfirmKey(null);

    try {
      switch (type) {
        case 'DELETE_CONTRACTOR': {
          const targetCont = contractors.find(c => c.id === payload.id);
          if (!targetCont) {
            showNotification('error', `No se encontró el contratista con ID: ${payload.id}`);
            return;
          }
          onDeleteContractor(payload.id);
          showNotification('success', `¡Contratista "${targetCont.name}" (${payload.id}) fue eliminado exitosamente!`);
          break;
        }

        case 'CREATE_CONTRACTOR': {
          const nextIdNum = contractors.reduce((acc, current) => {
            const parsed = parseInt(current.id.replace("CON-", ""));
            return !isNaN(parsed) && parsed > acc ? parsed : acc;
          }, 0);
          const generatedId = `CON-${String(nextIdNum + 1).padStart(3, '0')}`;

          const newCont: Contractor = {
            id: generatedId,
            name: payload.name || "Nuevo Contratista IA",
            document: payload.document || "N/A",
            phone: payload.phone || "S/D",
            address: payload.address || "S/D",
            type: payload.type || "Variada",
            status: 'Activo',
            bank: payload.bank || 'No especificado',
            account: payload.account || '00000',
            email: payload.email || '',
            observations: payload.observations || "Creado por Acción IA.",
            agreements: []
          };
          onAddContractor(newCont);
          lastCreatedContractorIdRef.current = generatedId;
          showNotification('success', `¡Contratista "${newCont.name}" creado con éxito con el ID ${newCont.id}!`);
          break;
        }

        case 'UPDATE_CONTRACTOR': {
          let resolvedId = payload.id;
          if (resolvedId === 'NEW_CONTRACTOR_ID') {
            if (lastCreatedContractorIdRef.current) {
               resolvedId = lastCreatedContractorIdRef.current;
            } else {
               showNotification('error', 'Por favor ejecuta primero el comando para Crear Contratista.');
               return;
            }
          }
          const targetCont = contractors.find(c => c.id === resolvedId);
          if (!targetCont) {
            showNotification('error', `No se encontró el contratista con ID: ${resolvedId}`);
            return;
          }
          const updated = {
            ...targetCont,
            ...payload,
            id: resolvedId
          };
          onUpdateContractor(updated);
          showNotification('success', `¡Contratista "${targetCont.name}" actualizado con éxito mediante comandos IA!`);
          break;
        }

        case 'CREATE_SHEET': {
          // If a contractorId is specified, let's verify if we need to link it
          let linkedContId = payload.contractorId;
          if (linkedContId === 'NEW_CONTRACTOR_ID') {
            if (lastCreatedContractorIdRef.current) {
               linkedContId = lastCreatedContractorIdRef.current;
            } else {
               showNotification('error', 'Error: No se encontró el contratista encolado. Ejecute primero el comando de crear contratista.');
               return;
            }
          }
          
          // If no explicit ID is given but a contractor name is mentioned, let's search in our live list
          if (!linkedContId && payload.contractorName) {
            const found = contractors.find(c => c.name.toLowerCase().includes(payload.contractorName.toLowerCase()));
            if (found) {
              linkedContId = found.id;
            }
          }

          if (!linkedContId) {
            showNotification('error', 'No se puede crear la hoja: Debe existir un contratista vinculado a la hoja de reporte. Especifique o cree un contratista.');
            return;
          }

          // Gather any production rows extracted in the same chat message to pre-populate the sheet
          const associatedMessage = messages.find(m => m.id === messageId);
          const initialRows: ProductionRow[] = [];
          let hasActualQts = false;
          
          if (associatedMessage?.extractedData?.productionRows) {
            associatedMessage.extractedData.productionRows.forEach((row: any, idx: number) => {
              // Match contractor for each row
              let rContractorId = linkedContId;
              if (row.contractorName) {
                const found = contractors.find(c => c.name.toLowerCase().includes(row.contractorName.toLowerCase()));
                if (found) {
                  rContractorId = found.id;
                }
              }
              if (!rContractorId) {
                // Default to first active contractor
                rContractorId = contractors[0]?.id || "CON-001";
              }

              const qtyEstim = parseFloat(row.quantityEstim !== undefined ? row.quantityEstim : row.quantity) || 1;
              const qtyActual = parseFloat(row.quantityActual !== undefined ? row.quantityActual : 0);
              if (qtyActual > 0) hasActualQts = true;
              
              initialRows.push({
                id: `row-ia-${Date.now()}-${idx}-${Math.floor(Math.random() * 1050)}`,
                no: idx + 1,
                contractorId: rContractorId,
                description: row.description || "Actividad Extractada por IA",
                quantity: qtyEstim,
                unit: row.unit || 'm2',
                priceUnit: parseFloat(row.priceUnit) || 1.0,
                observations: row.observations || "Cargada automáticamente al crear hoja desde documento",
                _tempQtyActual: qtyActual
              } as any);
            });
          }

          const repData: any[] = [];
          let initialActiveRepId = undefined;
          
          if (hasActualQts) {
            const newRepId = `rep-${Date.now()}`;
            const quantsMap: Record<string, number> = {};
            initialRows.forEach((r: any) => {
              quantsMap[r.id] = r._tempQtyActual || 0;
              r.createdReportId = newRepId;
              delete r._tempQtyActual; // clean up
            });
            repData.push({
              id: newRepId,
              name: "Reporte #1 (IA)",
              dateFrom: new Date().toISOString().split('T')[0],
              dateTo: new Date().toISOString().split('T')[0],
              status: 'ABIERTO',
              quantities: quantsMap,
              discount1: 0,
              discount2: 0,
            });
            initialActiveRepId = newRepId;
          } else {
             // clean up anyway just in case
             initialRows.forEach((r: any) => { delete r._tempQtyActual; });
          }

          const nextSheet: ProductionSheet = {
            id: `sheet-${Date.now()}`,
            name: payload.name || "Nueva Hoja IA",
            supervisor: payload.supervisor || "Supervisor Obras",
            dateFrom: new Date().toISOString().split('T')[0],
            dateTo: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
            code: payload.code || `IA-${Math.floor(Math.random() * 100)}`,
            activity: payload.activity || "Trabajos Varios",
            rows: initialRows,
            reports: repData,
            activeReportId: initialActiveRepId || "",
            contractorId: linkedContId || undefined,
            applyIsr: payload.applyIsr ?? true,
            applyTss: payload.applyTss ?? false,
            applyPension: payload.applyPension ?? false,
            applyWarranty: payload.applyWarranty ?? true,
            applyItbis: payload.applyItbis ?? false
          };
          onAddSheet(nextSheet);
          lastCreatedSheetIdRef.current = nextSheet.id;
          
          let successMessage = `¡Hoja de reporte "${nextSheet.name}" creada con éxito para la actividad "${nextSheet.activity}"!`;
          if (initialRows.length > 0) {
            successMessage += ` Se importó el desglose de ${initialRows.length} partidas desde el documento procesado.`;
          }
          showNotification('success', successMessage);
          break;
        }

        case 'UPDATE_SHEET': {
          let resolvedId = payload.id;
          if (resolvedId === 'NEW_SHEET_ID') {
            if (lastCreatedSheetIdRef.current) {
              resolvedId = lastCreatedSheetIdRef.current;
            } else {
              showNotification('error', 'Por favor ejecuta primero el comando para Crear la Hoja.');
              return;
            }
          }
          const targetSheet = sheets.find(s => s.id === resolvedId);
          if (!targetSheet) {
            showNotification('error', `No se encontró la hoja de cubicaciones con ID: ${resolvedId}`);
            return;
          }
          const updated = {
            ...targetSheet,
            ...payload,
            id: resolvedId // ensure id isn't overwritten by 'NEW_SHEET_ID'
          };
          onUpdateSheet(updated);
          showNotification('success', `¡Datos de la hoja "${targetSheet.name}" actualizados con éxito!`);
          break;
        }

        case 'UPDATE_REPORT': {
          let resolvedId = payload.sheetId;
          if (resolvedId === 'NEW_SHEET_ID') {
            if (lastCreatedSheetIdRef.current) {
              resolvedId = lastCreatedSheetIdRef.current;
            } else {
              showNotification('error', 'Por favor ejecuta primero el comando para Crear la Hoja.');
              return;
            }
          }
          const targetSheet = sheets.find(s => s.id === resolvedId);
          if (!targetSheet) {
            showNotification('error', `No se encontró la hoja de cubicaciones con ID: ${resolvedId}`);
            return;
          }
          let updatedReports = targetSheet.reports ? [...targetSheet.reports] : [];
          let repIndex = updatedReports.findIndex(r => r.id === targetSheet.activeReportId);
          if (repIndex === -1 && updatedReports.length > 0) {
            repIndex = updatedReports.findIndex(r => r.status === 'ABIERTO');
          }
          if (repIndex === -1) {
             showNotification('warn', 'No hay reportes abiertos para asignar las reducciones de este Anticipo/Descuento.');
             return;
          }
          
          updatedReports[repIndex] = {
             ...updatedReports[repIndex],
             advancePayment: payload.advancePayment !== undefined ? payload.advancePayment : updatedReports[repIndex].advancePayment,
             discount1: payload.discount1 !== undefined ? payload.discount1 : updatedReports[repIndex].discount1,
             discount1Label: payload.discount1Label !== undefined ? payload.discount1Label : updatedReports[repIndex].discount1Label,
             discount2: payload.discount2 !== undefined ? payload.discount2 : updatedReports[repIndex].discount2,
             discount2Label: payload.discount2Label !== undefined ? payload.discount2Label : updatedReports[repIndex].discount2Label,
          };
          onUpdateSheet({ ...targetSheet, reports: updatedReports });
          showNotification('success', `¡Anticipos/Descuentos agregados correctamente al reporte activo de la hoja "${targetSheet.name}"!`);
          break;
        }

        case 'ADD_ROWS_TO_SHEET': {
          let resolvedId = payload.sheetId;
          if (resolvedId === 'NEW_SHEET_ID') {
            if (lastCreatedSheetIdRef.current) {
              resolvedId = lastCreatedSheetIdRef.current;
            } else {
              showNotification('error', 'Por favor ejecuta primero el comando para Crear la Hoja.');
              return;
            }
          }
          const targetSheet = sheets.find(s => s.id === resolvedId);
          if (!targetSheet) {
            showNotification('error', `No se encontró la hoja de cubicaciones con ID: ${resolvedId}`);
            return;
          }

          if (!payload.rows || payload.rows.length === 0) {
            showNotification('error', `No se enviaron partidas para agregar.`);
            return;
          }

          let nextNo = targetSheet.rows.length > 0 
            ? Math.max(...targetSheet.rows.map(r => r.no)) + 1 
            : 1;

          let updatedReports = targetSheet.reports ? [...targetSheet.reports] : [];
          let activeRepId = targetSheet.activeReportId;
          
          let hasActualQts = false;
          payload.rows.forEach((r: any) => {
             const qa = parseFloat(r.quantityActual !== undefined ? r.quantityActual : 0);
             if (qa > 0) hasActualQts = true;
          });

          if ((hasActualQts && updatedReports.length === 0) || (hasActualQts && updatedReports.findIndex(r => r.status === 'ABIERTO') === -1)) {
            // Need to create a new report
            const newReportId = `rep-${Date.now()}`;
            const newReport: any = {
              id: newReportId,
              name: `Reporte #${updatedReports.length + 1} (IA)`,
              dateFrom: new Date().toISOString().split('T')[0],
              dateTo: new Date().toISOString().split('T')[0],
              status: 'ABIERTO',
              quantities: {},
              discount1: 0,
              discount2: 0,
            };
            updatedReports.push(newReport);
            activeRepId = newReportId;
          } else if (hasActualQts) {
             const openIndex = updatedReports.findIndex(r => r.status === 'ABIERTO');
             activeRepId = updatedReports[openIndex].id;
          }

          const newRows: ProductionRow[] = [];
          const tempQtyMap: Record<string, number> = {};

          payload.rows.forEach((row: any, idx: number) => {
             const rContractorId = targetSheet.contractorId || contractors[0]?.id || "CON-001";
             const qtyEstim = parseFloat(row.quantityEstim !== undefined ? row.quantityEstim : row.quantity) || 1;
             const qtyActual = parseFloat(row.quantityActual !== undefined ? row.quantityActual : 0);
             
             const rId = `row-ia-${Date.now()}-${idx}-${Math.floor(Math.random() * 1050)}`;
             tempQtyMap[rId] = qtyActual;

             newRows.push({
               id: rId,
               no: nextNo + idx,
               contractorId: rContractorId,
               description: row.description || "Actividad Extraída por IA",
               quantity: qtyEstim,
               unit: row.unit || 'm2',
               priceUnit: parseFloat(row.priceUnit) || 1.0,
               observations: row.observations || "Insertada dinámicamente vía IA",
               createdReportId: activeRepId
             });
          });

          updatedReports = updatedReports.map((r) => {
            const existingQuants = r.quantities || {};
            if (activeRepId && r.id === activeRepId) {
              return {
                ...r,
                quantities: {
                  ...existingQuants,
                  ...tempQtyMap
                },
              };
            } else {
              const zeroes: Record<string, number> = {};
              Object.keys(tempQtyMap).forEach(k => zeroes[k] = 0);
              return {
                ...r,
                quantities: {
                  ...existingQuants,
                  ...zeroes
                },
              };
            }
          });

          onUpdateSheet({
             ...targetSheet,
             rows: [...targetSheet.rows, ...newRows],
             reports: updatedReports,
             activeReportId: activeRepId
          });

          showNotification('success', `¡Se insertaron ${newRows.length} partidas a la hoja "${targetSheet.name}" exitosamente!`);
          break;
        }

        case 'UPDATE_MEASUREMENT_SUPPORT': {
          let resolvedSheetId = payload.sheetId;
          if (resolvedSheetId === 'NEW_SHEET_ID') {
            resolvedSheetId = lastCreatedSheetIdRef.current || resolvedSheetId;
          }
          const targetSheet = sheets.find(s => s.id === resolvedSheetId);
          if (!targetSheet) {
            showNotification('error', `No se encontró la hoja con ID: ${resolvedSheetId}`);
            return;
          }
          const targetRow = targetSheet.rows.find(r => r.id === payload.rowId);
          if (!targetRow) {
            showNotification('error', `No se encontró la partida con ID: ${payload.rowId}`);
            return;
          }
          const targetType = payload.type || 'quantityActual';
          const newFormula = payload.formula;

          // Process the update
          if (targetType === 'quantity' || targetType === 'quantityEstim') {
             const updatedRows = targetSheet.rows.map(r => {
               if (r.id === payload.rowId) {
                  let qty = r.quantity;
                  if (payload.formula) {
                     try {
                        qty = payload.formula.startsWith('=') ? (parseFloat(new Function('return ' + payload.formula.substring(1))()) || 0) : (parseFloat(payload.formula) || 0);
                     } catch(e) {
                        qty = r.quantity; // default to existing if eval fails (ex: =SUM or =C5)
                     }
                  }
                  
                  if (payload.gridJson) {
                     try {
                        const parsedGrid = typeof payload.gridJson === 'string' ? JSON.parse(payload.gridJson) : payload.gridJson;
                        
                        // Parse simple grid logic or let user re-evaluate based on formula
                        if (parsedGrid && typeof parsedGrid === 'object') {
                           return { 
                              ...r, 
                              quantityFormula: payload.formula || r.quantityFormula,
                              quantityGrid: typeof payload.gridJson === 'string' ? payload.gridJson : JSON.stringify(payload.gridJson),
                              quantity: payload.formula ? qty : r.quantity 
                           };
                        }
                     } catch (e) {
                        console.error('Error parsing gridJson from Gemini', e);
                     }
                  }

                  return { ...r, quantityFormula: payload.formula || r.quantityFormula, quantity: payload.formula ? qty : r.quantity };
               }
               return r;
             });
             onUpdateSheet({ ...targetSheet, rows: updatedRows });
          } else {
             // quantityActual -> belongs to report. We get the latest open report or the active one
             const updatedReports = targetSheet.reports ? [...targetSheet.reports] : [];
             let repIndex = updatedReports.findIndex(r => r.id === targetSheet.activeReportId);
             if (repIndex === -1 && updatedReports.length > 0) {
               repIndex = updatedReports.findIndex(r => r.status === 'ABIERTO');
             }
             if (repIndex === -1) {
               showNotification('warn', 'No hay reportes abiertos para asignar esta medición actual.');
               return;
             }
             
             const rep = updatedReports[repIndex];
             let qty = rep.quantities?.[payload.rowId] || 0;
             if (payload.formula) {
                 try {
                     qty = payload.formula.startsWith('=') ? (parseFloat(new Function('return ' + payload.formula.substring(1))()) || 0) : (parseFloat(payload.formula) || 0);
                 } catch(e) {
                     qty = rep.quantities?.[payload.rowId] || 0;
                 }
             }

             let updatedGridJsonStr = rep.grids?.[payload.rowId];
             if (payload.gridJson) {
                try {
                   updatedGridJsonStr = typeof payload.gridJson === 'string' ? payload.gridJson : JSON.stringify(payload.gridJson);
                } catch(e) {}
             }
             
             updatedReports[repIndex] = {
               ...rep,
               formulas: {
                 ...(rep.formulas || {}),
                 [payload.rowId]: payload.formula || rep.formulas?.[payload.rowId]
               },
               grids: {
                 ...(rep.grids || {}),
                 [payload.rowId]: updatedGridJsonStr
               },
               quantities: {
                 ...(rep.quantities || {}),
                 [payload.rowId]: payload.formula ? qty : rep.quantities?.[payload.rowId]
               }
             };

             onUpdateSheet({ ...targetSheet, reports: updatedReports });
          }
          showNotification('success', `¡Soporte de medición de ${targetType === 'quantity' || targetType === 'quantityEstim' ? 'Presupuesto' : 'Reporte en curso'} actualizado!`);
          break;
        }

        case 'DELETE_SHEET': {
          const targetSheet = sheets.find(s => s.id === payload.id);
          if (!targetSheet) {
            showNotification('error', `No se encontró la hoja de cubicaciones con ID: ${payload.id}`);
            return;
          }
          onDeleteSheet(payload.id);
          showNotification('success', `¡Hoja de cubicación "${targetSheet.name}" eliminada exitosamente del sistema!`);
          break;
        }

        case 'UPDATE_PARAMS': {
          const mergedParams = {
            ...params,
            ...payload
          };
          onUpdateParams(mergedParams);
          showNotification('success', `¡Parámetros globales del proyecto actualizados con éxito bajo indicación de IA!`);
          break;
        }

        default:
          showNotification('error', `Acción no reconocida por el procesador local: ${type}`);
          return;
      }

      // Mark as executed inside state to show green UI checkmark
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.extractedData && m.extractedData.actions) {
          const updatedActions = [...m.extractedData.actions];
          updatedActions[actionIndex] = { ...updatedActions[actionIndex], executed: true };
          return {
            ...m,
            extractedData: {
              ...m.extractedData,
              actions: updatedActions
            }
          };
        }
        return m;
      }));

    } catch (error: any) {
      showNotification('error', `Hubo un inconveniente al aplicar los cambios de IA: ${error.message || error}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Dynamic Inline Notification Banner (Iframe / sandbox compliant UI) */}
      {notification.message && (
        <div className={`fixed top-4 right-4 z-50 p-4 max-w-md rounded-xl border shadow-lg flex items-start justify-between gap-3 animate-slide-in ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-emerald-100/40' 
            : notification.type === 'error'
              ? 'bg-rose-50 border-rose-250 text-rose-950 shadow-rose-100/40'
              : 'bg-amber-50 border-amber-250 text-amber-950 shadow-amber-100/40'
        }`}>
          <div className="flex items-center space-x-2.5 text-xs font-semibold">
            {notification.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className={notification.type === 'error' ? 'text-rose-600 shrink-0' : 'text-amber-605 shrink-0'} />
            )}
            <p className="leading-snug pr-2">{notification.message}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification({ type: null, message: null })}
            className="text-slate-400 hover:text-slate-700 font-bold text-xs leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🚀 Premium Design-Focused Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500 text-[10px] uppercase tracking-widest font-black font-mono p-1 px-2 rounded-md leading-none text-white animate-pulse">
              Gemini AI
            </span>
            <span className="bg-slate-800 text-[10px] uppercase font-bold p-1 px-2 rounded-md leading-none text-slate-300">
              Asistente de Análisis de Obras
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
            Análisis Documental y Chat Inteligente
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Digitalice planillas enteras, fotos de talonarios de cubicación o listas de subcontratistas al instante. Cargue archivos locales de Excel o imágenes de recibos para que Gemini formule las filas automáticas de control.
          </p>
        </div>
      </div>

      {/* CHAT AND DOCUMENT ANALYZER WITH IMAGE RECOGNITION (GEMINI) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* LEFT CHAT CONTROL PANEL */}
        <div 
          className={`lg:col-span-8 flex flex-col bg-white border rounded-xl shadow-sm min-h-[580px] max-h-[700px] transition-colors relative ${isDraggingOverChat ? 'border-dashed border-emerald-400 bg-emerald-50/50' : 'border-slate-200'}`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverChat(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverChat(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDraggingOverChat(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const files = Array.from(e.dataTransfer.files) as File[];
              if (selectedFiles.length + files.length > 5) {
                showNotification('warn', 'Solo puede subir un máximo de 5 archivos simultáneos.');
                return;
              }
              // Simulate file input change event
              files.forEach((f: File) => {
                const fakeEvent = { target: { files: [f] } };
                handleFileChange(fakeEvent as any);
              });
            }
          }}
        >
          {isDraggingOverChat && (
            <div className="absolute inset-0 z-50 bg-emerald-50/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border-2 border-emerald-400 border-dashed pointer-events-none">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 text-emerald-600">
                <Upload size={32} />
              </div>
              <p className="text-emerald-800 font-bold text-lg">Suelte los archivos aquí para analizarlos</p>
            </div>
          )}

          {/* Chat header panel */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-t-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Cpu size={16} />
              </div>
              <div className="text-left">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Asistente Artificial de Cubicaciones & Contratistas
                </h2>
                <div className="flex items-center space-x-1.5 text-[10px] text-emerald-600 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gemini 3.5 Flash Activo</span>
                </div>
              </div>
            </div>

            {confirmClearChat ? (
              <div className="flex items-center space-x-1 bg-red-50 p-1 px-1.5 rounded-lg border border-red-200">
                <span className="text-[10px] text-red-600 font-bold">¿Limpiar chat?</span>
                <button
                  onClick={() => {
                    setMessages([
                      {
                        id: 'msg-init-reset',
                        sender: 'system',
                        text: 'Historial de chat restablecido. Suba un documento o escriba su consulta para comenzar.',
                        timestamp: new Date().toISOString()
                      }
                    ]);
                    setConfirmClearChat(false);
                  }}
                  className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded hover:bg-red-700 cursor-pointer"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmClearChat(false)}
                  className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded hover:bg-slate-300 cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleDetectCostAnomalies}
                  disabled={isSending}
                  className="flex items-center space-x-1 p-1 px-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer transition-colors disabled:opacity-50"
                  title="Detectar Anomalías de Costos"
                >
                  <AlertCircle size={13} />
                  <span className="text-[10px] font-bold">Auditar Costos</span>
                </button>
                <button
                  onClick={() => setConfirmClearChat(true)}
                  className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Limpiar chat"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Chat Messages flow scroll layout */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isSys = msg.sender === 'system';
              
              return (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
                >
                  {/* Timestamp / Sender line */}
                  <span className="text-[9px] text-[#808080] font-mono select-none px-1">
                    {isUser ? 'Tú (Operador)' : isSys ? 'Sistema' : 'Gemini AI'} • {new Date(msg.timestamp).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Speech bubbles layout */}
                  <div className={`relative group max-w-[85%] rounded-2xl p-4 text-[12.5px] border leading-relaxed text-left ${
                    isUser 
                      ? 'bg-blue-600 text-white border-blue-600 rounded-tr-none shadow-xs' 
                      : isSys 
                        ? 'bg-slate-100 text-slate-700 border-slate-200 border-dashed rounded-tl-none font-medium' 
                        : 'bg-slate-50 text-slate-800 border-slate-150 rounded-tl-none shadow-xs'
                  }`}>
                    {/* Botón para copiar texto del mensaje */}
                    <button
                      onClick={() => handleCopyMessageText(msg.id, msg.text)}
                      className={`absolute right-2 top-2 p-1.5 rounded-lg transition-all opacity-100 md:opacity-0 group-hover:opacity-100 focus:opacity-100 hover:scale-105 active:scale-95 cursor-pointer z-10 ${
                        isUser 
                          ? 'bg-blue-700 hover:bg-blue-800 text-blue-100 border border-blue-500' 
                          : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                      title={copiedMessageId === msg.id ? "¡Copiado!" : "Copiar texto"}
                    >
                      {copiedMessageId === msg.id ? (
                        <Check size={12} className="text-emerald-500 font-extrabold" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>

                    <p className="whitespace-pre-wrap pr-5">{msg.text.split(/```json/)[0].trim()}</p>

                    {/* Attachment thumbnails inside message */}
                    {(msg.filePreviews && msg.filePreviews.length > 0) ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {msg.filePreviews.map((fpreview, idx) => (
                          <div key={idx} className="p-2 bg-slate-900/10 rounded-lg border border-slate-900/10 flex items-center space-x-2.5 max-w-sm shrink-0">
                            {fpreview.type === 'image' ? (
                              <>
                                <img 
                                  src={fpreview.base64Url} 
                                  alt="Previsualizar imagen" 
                                  className="w-12 h-12 object-cover rounded border border-slate-150 bg-white" 
                                />
                                <div className="text-[10px] text-left truncate flex-1 w-24">
                                  <p className="font-bold text-slate-800 truncate select-all">{fpreview.name}</p>
                                  <p className="text-slate-500">Imagen / Captura de pantalla</p>
                                </div>
                              </>
                            ) : fpreview.type === 'pdf' ? (
                              <>
                                <div className="w-10 h-10 rounded bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                                  <FileText size={18} />
                                </div>
                                <div className="text-[10px] text-left truncate flex-1 w-24">
                                  <p className="font-bold text-slate-800 truncate select-all">{fpreview.name}</p>
                                  <p className="text-slate-500">Documento PDF digitalizado</p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                  <FileSpreadsheet size={18} />
                                </div>
                                <div className="text-[10px] text-left truncate flex-1 w-24">
                                  <p className="font-bold text-slate-800 truncate select-all">{fpreview.name}</p>
                                  <p className="text-slate-500">Hoja Excel procesada</p>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : msg.filePreview ? (
                      <div className="mt-2.5 p-2 bg-slate-900/10 rounded-lg border border-slate-900/10 flex items-center space-x-2.5 max-w-sm">
                        {msg.filePreview.type === 'image' ? (
                          <>
                            <img 
                              src={msg.filePreview.base64Url} 
                              alt="Previsualizar imagen" 
                              className="w-12 h-12 object-cover rounded border border-slate-150 bg-white" 
                            />
                            <div className="text-[10px] text-left truncate">
                              <p className="font-bold text-slate-800 truncate select-all">{msg.filePreview.name}</p>
                              <p className="text-slate-500">Imagen / Captura de pantalla</p>
                            </div>
                          </>
                        ) : msg.filePreview.type === 'pdf' ? (
                          <>
                            <div className="w-10 h-10 rounded bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="text-[10px] text-left truncate">
                              <p className="font-bold text-slate-800 truncate select-all">{msg.filePreview.name}</p>
                              <p className="text-slate-500">Documento PDF digitalizado</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                              <FileSpreadsheet size={18} />
                            </div>
                            <div className="text-[10px] text-left truncate">
                              <p className="font-bold text-slate-800 truncate select-all">{msg.filePreview.name}</p>
                              <p className="text-slate-500">Hoja Excel procesada</p>
                            </div>
                          </>
                        )}
                      </div>
                    ) : null}

                    {/* --- INTERACTIVE CARD ACTIONS FOR AI EXTRACTIONS --- */}
                    {msg.extractedData && (
                      <div className="mt-3.5 pt-3 border-t border-slate-200 space-y-3">
                        <span className="flex items-center text-[10px] uppercase font-black text-emerald-700 tracking-wider">
                          <Sparkles size={11} className="mr-1 animate-spin text-emerald-600" />
                          ¡Importación con un Clic Detectada por IA!
                        </span>

                        {/* Render Extracted Contractors List */}
                        {msg.extractedData.contractors && msg.extractedData.contractors.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-extrabold block">Contratistas Detectados:</span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.extractedData.contractors.map((c: any, index: number) => {
                                // Validate if already exists with the same specialty/type
                                const exists = contractors.some(
                                  orig => 
                                    ((orig.name.toLowerCase().trim() === (c.name || "").toLowerCase().trim() &&
                                      (orig.type || "").toLowerCase().trim() === (c.type || "").toLowerCase().trim()) || 
                                     (orig.document.replace(/\D/g, '') === (c.document || "").replace(/\D/g, '') && 
                                      c.document && 
                                      (orig.type || "").toLowerCase().trim() === (c.type || "").toLowerCase().trim()))
                                );

                                return (
                                  <div key={index} className="bg-white border border-slate-200 p-2.5 rounded-lg flex justify-between items-center text-xs shadow-xs text-left">
                                    <div className="space-y-0.5 truncate pr-1">
                                      <p className="font-black text-slate-800 truncate">{c.name}</p>
                                      <p className="text-[10px] text-slate-500 leading-none">
                                        Doc: <span className="font-mono">{c.document || 'S/D'}</span> | Tipo: <strong className="text-slate-700">{c.type || 'Plomería'}</strong>
                                      </p>
                                    </div>
                                    
                                    {exists ? (
                                      <span className="text-[9px] bg-slate-100 text-slate-500 uppercase font-bold p-1 px-2 rounded-md leading-none border border-slate-200 shrink-0">
                                        Registrado
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleImportContractor(c)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] p-1 px-3 rounded shadow-xs border border-emerald-500 hover:scale-105 cursor-pointer shrink-0 transition-transform flex items-center space-x-1"
                                      >
                                        <Plus size={11} />
                                        <span>Registrar</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Render Extracted Production Rows Activities */}
                        {msg.extractedData.productionRows && msg.extractedData.productionRows.length > 0 && (
                          <div className="space-y-3">
                            <span className="text-[10px] text-slate-500 font-extrabold block font-mono">Partidas Extraídas (Agrupadas por Contratista):</span>
                            {(() => {
                              // Group by contractor
                              const groupedRows = msg.extractedData.productionRows.reduce((acc: any, curr: any, originalIndex: number) => {
                                const cName = curr.contractorName || 'Múltiples / Sin Especificar';
                                if (!acc[cName]) acc[cName] = [];
                                acc[cName].push({ row: curr, originalIndex });
                                return acc;
                              }, {});

                              return Object.entries(groupedRows).map(([contractorName, items]: [string, any], groupIndex: number) => {
                                // Default sheet calculation for bulk import
                                let applicableSheets = sheets;
                                const matchedContractor = contractors.find(
                                  c => c.name.toLowerCase().includes((contractorName || "").toLowerCase())
                                );
                                if (matchedContractor) {
                                  applicableSheets = sheets.filter(s => s.contractorId === matchedContractor.id);
                                }
                                const sKey = `target-sheet-select-bulk-${msg.id}-${groupIndex}`;

                                return (
                                  <div key={groupIndex} className="bg-slate-50/50 border border-slate-200 p-2.5 rounded-xl space-y-2.5">
                                    <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-2 rounded-lg">
                                      <div>
                                        <span className="text-[11px] text-blue-900 font-bold block tracking-tight">
                                          {contractorName}
                                        </span>
                                        <span className="text-[9px] text-blue-600 block">{items.length} actividad(es)</span>
                                      </div>
                                      <div className="flex items-center space-x-1.5">
                                        <select
                                          id={sKey}
                                          className="text-[10px] p-1 bg-white border border-blue-200 rounded text-slate-700 outline-none w-36 shrink-0 focus:border-blue-400"
                                        >
                                          {applicableSheets.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.activity})</option>
                                          ))}
                                          {applicableSheets.length === 0 && sheets.length > 0 && sheets.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                          {sheets.length === 0 && <option value="">Sin hojas creadas</option>}
                                        </select>
                                        <button
                                          onClick={() => {
                                            const sel = document.getElementById(sKey) as HTMLSelectElement;
                                            if (sel && sel.value) {
                                              // Bulk import
                                              items.forEach((item: any) => handleImportProductionRow(item.row, sel.value));
                                            } else {
                                              showNotification('warn', "No hay hoja destino válida. Crea una hoja de reporte primero.");
                                            }
                                          }}
                                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] p-1 px-2.5 rounded shadow-xs cursor-pointer text-center transition-all flex items-center space-x-1"
                                        >
                                          <Plus size={10} />
                                          <span>Cargar Todo</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                      {items.map(({ row: r, originalIndex: rIndex }: any) => {
                                        return (
                                          <div 
                                            key={rIndex} 
                                            className="bg-white border border-slate-200 p-2 rounded-lg text-xs space-y-1.5 text-left shadow-sm"
                                          >
                                            <div className="flex justify-between items-start gap-1">
                                              <div className="space-y-0.5">
                                                <p className="font-bold text-slate-800">{r.description}</p>
                                                <p className="text-[10px] text-slate-500 text-pretty">
                                                  {r.quantityActual !== undefined && r.quantityActual > 0 ? (
                                                    <>
                                                      Cubicación: <strong className="text-indigo-700 font-mono font-bold">{r.quantityActual} {r.unit}</strong> (De {r.quantityEstim || r.quantity || 1} presupuestado)
                                                    </>
                                                  ) : (
                                                    <>
                                                      Cant: <strong className="text-slate-800">{r.quantityEstim || r.quantity || 1} {r.unit}</strong>
                                                    </>
                                                  )}
                                                  {" • P.U: "}<strong className="text-emerald-700">${r.priceUnit}</strong>
                                                </p>
                                              </div>
                                              <span className="text-[10px] font-black text-emerald-800 font-mono bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                                                RD$ {((r.quantityActual !== undefined && r.quantityActual > 0 ? r.quantityActual : (r.quantityEstim || r.quantity || 1)) * r.priceUnit).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}

                        {/* Render Extracted Actions (Modifications & Interactions) */}
                        {msg.extractedData.actions && msg.extractedData.actions.length > 0 && (
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-250">
                            <span className="text-[10px] text-slate-550 font-extrabold block uppercase tracking-wider font-mono">Comandos y Acciones de Control IA:</span>
                            <div className="grid grid-cols-1 gap-2">
                              {msg.extractedData.actions.map((act: any, actIndex: number) => {
                                const isExecuted = !!act.executed;
                                const confirmKey = `${msg.id}-${actIndex}`;
                                const isPendingConfirm = actionConfirmKey === confirmKey;

                                let title = "";
                                let desc = "";
                                let btnText = "Ejecutar";
                                let themeClasses = "bg-slate-50 border-slate-200 text-slate-800";
                                let btnClasses = "bg-blue-600 hover:bg-blue-500 border-blue-500 text-white";

                                switch (act.type) {
                                  case 'DELETE_CONTRACTOR':
                                    title = `Eliminar Contratista de Nómina`;
                                    desc = `ID: ${act.payload.id}. Se borrará del listado de ajusteros activos.`;
                                    btnText = isPendingConfirm ? `⚠️ Confirmar Borrado` : `Confirmar Eliminación`;
                                    themeClasses = `bg-rose-50 border-rose-200 text-rose-900`;
                                    btnClasses = isPendingConfirm 
                                      ? `bg-red-700 hover:bg-red-800 text-white border-red-700 animate-pulse`
                                      : `bg-rose-600 hover:bg-rose-500 text-white border-rose-600`;
                                    break;
                                  case 'CREATE_CONTRACTOR':
                                    title = `Crear Nuevo Contratista`;
                                    desc = `Especialidad: ${act.payload.type || 'N/A'}, Nombre: ${act.payload.name || 'S/D'}`;
                                    btnText = `Añadir Contratista`;
                                    themeClasses = `bg-indigo-50 border-indigo-200 text-indigo-950`;
                                    btnClasses = `bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-600`;
                                    break;
                                  case 'UPDATE_CONTRACTOR':
                                    title = `Actualizar Datos de Contratista`;
                                    desc = `ID: ${act.payload.id}. Cambios: ` + 
                                           Object.entries(act.payload)
                                            .filter(([k]) => k !== 'id')
                                            .map(([k, v]) => `${k === 'name' ? 'Nombre' : k === 'phone' ? 'Tel.' : k === 'bank' ? 'Banco' : k === 'account' ? 'Cuenta' : k}: ${v}`)
                                            .join(', ');
                                    btnText = `Aplicar Cambios`;
                                    themeClasses = `bg-sky-50 border-sky-200 text-sky-900`;
                                    btnClasses = `bg-sky-600 hover:bg-sky-500 text-white border-sky-600`;
                                    break;
                                  case 'CREATE_SHEET':
                                    title = `Crear Hoja de Reporte`;
                                    desc = `Actividad: "${act.payload.activity || 'Varios'}". Código: "${act.payload.code || 'IA'}". Supervisor: "${act.payload.supervisor || 'N/A'}"`;
                                    btnText = `Crear Hoja`;
                                    themeClasses = `bg-emerald-50 border-emerald-200 text-emerald-950`;
                                    btnClasses = `bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600`;
                                    break;
                                  case 'ADD_ROWS_TO_SHEET':
                                    title = `Añadir Partidas a Hoja`;
                                    desc = `ID de Hoja: "${act.payload.sheetId}". ${act.payload.rows?.length || 0} nuevas partidas extraídas.`;
                                    btnText = `Insertar Partidas`;
                                    themeClasses = `bg-teal-50 border-teal-200 text-teal-950`;
                                    btnClasses = `bg-teal-600 hover:bg-teal-500 text-white border-teal-600`;
                                    break;
                                  case 'UPDATE_MEASUREMENT_SUPPORT':
                                    title = `Actualizar Soporte de Medición`;
                                    desc = `Fórmula: "${act.payload.formula}". Para partida ID: "${act.payload.rowId}".`;
                                    btnText = `Aplicar Fórmula de Soporte`;
                                    themeClasses = `bg-fuchsia-50 border-fuchsia-200 text-fuchsia-950`;
                                    btnClasses = `bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-fuchsia-600`;
                                    break;
                                  case 'UPDATE_SHEET':
                                    title = `Actualizar Datos de Hoja`;
                                    desc = `ID Hoja: "${act.payload.id}". Cambios propuestos en la configuración básica.`;
                                    btnText = `Actualizar Hoja`;
                                    themeClasses = `bg-violet-50 border-violet-200 text-violet-900`;
                                    btnClasses = `bg-violet-600 hover:bg-violet-500 text-white border-violet-600`;
                                    break;
                                  case 'UPDATE_REPORT':
                                    title = `Aplicar Adelantos o Descuentos`;
                                    desc = `Hoja ID: "${act.payload.sheetId}". Anticipo RD$ ${act.payload.advancePayment || 0}. Descuentos extras RD$ ${(act.payload.discount1 || 0) + (act.payload.discount2 || 0)}.`;
                                    btnText = `Aplicar al Reporte`;
                                    themeClasses = `bg-amber-50 border-amber-200 text-amber-900`;
                                    btnClasses = `bg-amber-600 hover:bg-amber-500 text-white border-amber-600`;
                                    break;
                                  case 'DELETE_SHEET':
                                    title = `Eliminar Hoja de Reporte`;
                                    desc = `ID Hoja: "${act.payload.id}". Borrará la hoja y partidas correspondientes de la app.`;
                                    btnText = isPendingConfirm ? `⚠️ Confirmar Borrado` : `Confirmar Borrado`;
                                    themeClasses = `bg-rose-50 border-rose-200 text-rose-900`;
                                    btnClasses = isPendingConfirm 
                                      ? `bg-red-700 hover:bg-red-800 text-white border-red-700 animate-pulse`
                                      : `bg-rose-600 hover:bg-rose-500 text-white border-rose-600`;
                                    break;
                                  case 'UPDATE_PARAMS':
                                    title = `Actualizar Tasas y Parámetros del Proyecto`;
                                    desc = `Modificar: ` + 
                                           Object.entries(act.payload)
                                            .map(([k, v]) => `${k === 'percentIsr' ? 'ISR' : k === 'percentWarranty' ? 'Fondo Garantía' : k === 'percentTss' ? 'TSS' : k === 'companyName' ? 'Empresa' : k === 'projectName' ? 'Obra' : k}: ${v}`)
                                            .join(', ');
                                    btnText = `Actualizar Parámetros`;
                                    themeClasses = `bg-violet-50 border-violet-200 text-violet-900`;
                                    btnClasses = `bg-violet-600 hover:bg-violet-500 text-white border-violet-600`;
                                    break;
                                  default:
                                    title = act.type;
                                    desc = JSON.stringify(act.payload);
                                }

                                return (
                                  <div 
                                    key={actIndex}
                                    className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left ${themeClasses}`}
                                  >
                                    <div className="space-y-1 flex-1 pr-1">
                                      <p className="font-extrabold uppercase tracking-tight text-[10px] opacity-90">{title}</p>
                                      <p className="text-[11px] font-semibold leading-relaxed opacity-80">{desc}</p>
                                    </div>

                                    {isExecuted ? (
                                      <span className="bg-emerald-100 text-emerald-800 border border-emerald-250 font-black text-[9px] px-2.5 py-1 rounded-md shrink-0 flex items-center space-x-1 uppercase tracking-wider self-start sm:self-center leading-none">
                                        <span>✓ Listo / Aplicado</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleExecuteAction(msg.id, actIndex, act)}
                                        className={`font-bold text-[10px] p-1.5 px-3 rounded-lg border shadow-xs hover:scale-[1.02] cursor-pointer shrink-0 transition-transform ${btnClasses}`}
                                      >
                                        {btnText}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs italic font-semibold">
                <div className="flex space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>Gemini AI está digitalizando tu documento y extrayendo los importes...</span>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat bottom control panel input box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-slate-50 flex flex-col gap-2 shrink-0 rounded-b-xl">
             {/* Attachment file viewer */}
            {/* Uploaded Files Previews */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((fileInfo, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-xs flex-1 min-w-[200px] max-w-xs">
                    <div className="flex items-center space-x-2 truncate">
                      {fileInfo.type === 'image' ? (
                        <span className="text-xl shrink-0">🖼️</span>
                      ) : fileInfo.type === 'pdf' ? (
                        <span className="text-xl shrink-0">📄</span>
                      ) : (
                        <span className="text-xl shrink-0">📊</span>
                      )}
                      <div className="text-left truncate">
                        <p className="font-bold text-slate-850 truncate">{fileInfo.name}</p>
                        <p className="text-[10px] text-emerald-600 uppercase font-mono tracking-wider font-extrabold block leading-none">
                          Adjunto listo ({fileInfo.type === 'image' ? 'Imagen' : fileInfo.type === 'pdf' ? 'PDF' : 'Excel'})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                        if (selectedFiles.length === 1 && fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 cursor-pointer shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Voice Recognition Error Alert Info */}
            {speechError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-lg p-2 text-[10.5px] flex items-center space-x-2 animate-fade-in">
                <AlertCircle size={13} className="text-rose-500 shrink-0" />
                <p className="font-semibold text-left">{speechError}</p>
              </div>
            )}

            {/* Voice Recognition Active status banner */}
            {isListening && (
              <div className="bg-blue-50 border border-blue-100 text-blue-900 rounded-lg p-2 text-[11px] flex flex-col space-y-2">
                <div className="flex items-center space-x-2 animate-pulse">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <p className="font-bold text-left">
                    {speechLanguage === 'es-ES' 
                      ? 'Escuchando (click de nuevo para detener):'
                      : 'Listening (click again to stop):'}
                  </p>
                </div>
                {interimSpeech && (
                  <p className="text-slate-600 italic border-l-2 border-blue-300 pl-2 ml-4">
                    {interimSpeech}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all shadow-sm">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  // Permitir enviar presionando Enter sin Shift
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                onPaste={(e) => {
                  let hasFile = false;
                  // Handle items specifically for images like screenshots
                  if (e.clipboardData.items) {
                    const items = Array.from(e.clipboardData.items) as DataTransferItem[];
                    for (const item of items) {
                      if (item.type.indexOf('image/') !== -1) {
                        const file = item.getAsFile();
                        if (file) {
                          hasFile = true;
                          processIncomingFile(file);
                        }
                      }
                    }
                  }
                  
                  // Fallback for general file paste
                  if (!hasFile && e.clipboardData.files && e.clipboardData.files.length > 0) {
                    const files = Array.from(e.clipboardData.files) as File[];
                    if (selectedFiles.length + files.length > 5) {
                      showNotification('warn', "Puedes subir un máximo de 5 archivos simultáneamente.");
                      files.splice(5 - selectedFiles.length);
                    }
                    files.forEach(file => processIncomingFile(file));
                    hasFile = true;
                  }
                  
                  if (hasFile) {
                    e.preventDefault();
                  }
                }}
                placeholder="Escribe tus consultas con detalle, dicta con tu voz o arrastra documentos (Excel, PDF o imágenes) aquí..."
                rows={3}
                className="w-full bg-transparent text-[#1E293B] text-xs p-2.5 focus:outline-none resize-none min-h-[70px] placeholder-slate-400 leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  {/* Invisible native file input */}
                  <input
                    type="file"
                    id="ai-chat-file-uploader"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.xlsx,.xls,.csv,.pdf"
                    className="hidden"
                  />

                  {/* Add attachment triggers */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 p-2 rounded-lg cursor-pointer hover:text-slate-900 transition-all flex items-center justify-center w-8 h-8"
                    title="Subir archivo Excel, PDF o Imagen"
                  >
                    <Paperclip size={14} />
                  </button>

                  <div className="h-6 w-px bg-slate-200" />

                  {/* Speech Recognition Language Selector and Microphone Button */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setSpeechLanguage(prev => prev === 'es-ES' ? 'en-US' : 'es-ES')}
                      className="bg-slate-50 hover:bg-slate-105 border border-slate-200 text-slate-700 text-[9px] font-black w-8 h-8 rounded-lg cursor-pointer hover:text-slate-950 transition-all flex flex-col items-center justify-center leading-none"
                      title={`Cambiar idioma de voz (Actual: ${speechLanguage === 'es-ES' ? 'Español' : 'Inglés'})`}
                    >
                      <span className="text-[7px] text-slate-400 font-medium uppercase font-mono">LANG</span>
                      <span className="text-[9px] font-black text-blue-600 mt-0.5">{speechLanguage === 'es-ES' ? 'ES' : 'EN'}</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 border-rose-650 text-white animate-pulse shadow-xs hover:bg-rose-500'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-650 hover:text-slate-900'
                      }`}
                      title={isListening ? "Grabando... Haz clic para detener" : "Escribe con tu voz (Reconocimiento de voz)"}
                    >
                      {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                    </button>

                    <div className="h-6 w-px bg-slate-200 mx-1" />

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("¿Seguro que deseas borrar el historial del chat?")) {
                          setMessages([]);
                          setSelectedFiles([]);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                          localStorage.removeItem('nom_construction_ai_messages');
                        }
                      }}
                      className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-650 hover:text-rose-600 w-8 h-8 rounded-lg cursor-pointer transition-all flex items-center justify-center"
                      title="Borrar todo el historial del chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 select-none font-medium hidden sm:inline">
                    Presiona Enter para enviar
                  </span>
                  
                  <button
                    type="submit"
                    disabled={isSending || (!inputText.trim() && selectedFiles.length === 0)}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-100 border border-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Enviar</span>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT SIDEBAR: QUICK INSTRUCTIONS & DRAG ZONE */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* QUICK PROMPT EXAMPLES CARD */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-left space-y-3">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1">
              <MessageSquare size={12} className="text-slate-400" />
              Preguntas de Ejemplo (Clic para Probar)
            </h3>
            <div className="space-y-1.5">
              {[
                "¿Cuál contratista tiene el mayor saldo adeudado y de qué tipo?",
                "Regístrame al electricista Ramón Díaz con RNC 001929384, Banco Popular Cuenta 992019.",
                "Súmame un avance de 120 m2 de pañete exterior a $150 el metro para el pintor que corresponda."
              ].map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputText(ex)}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 hover:text-slate-900 duration-150 border border-slate-100 text-slate-600 text-[11px] leading-snug cursor-pointer font-medium"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>

          {/* QUICK AI SCANNING HANDBOOK */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4 text-left">
            <h3 className="text-xs font-black tracking-wider uppercase text-blue-405 flex items-center gap-1.5 text-blue-400">
              <Sparkles size={14} className="text-blue-400 animate-pulse" />
              ¿Cómo opera el Reconocedor IA?
            </h3>

            <div className="space-y-3 text-[11px] text-slate-400 leading-relaxed">
              <div className="flex items-start space-x-2">
                <span className="bg-slate-800 text-white font-mono rounded w-4 h-4 flex items-center justify-center text-[10px] shrink-0 font-bold select-none">1</span>
                <p>
                  <strong className="text-slate-200">Suba el archivo</strong>: ya sea una foto física de un recibo o una hoja Excel con múltiples filas de avance.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-slate-800 text-white font-mono rounded w-4 h-4 flex items-center justify-center text-[10px] shrink-0 font-bold select-none">2</span>
                <p>
                  <strong className="text-slate-200">Gemini procesa</strong> el contenido en tiempo real y extrae la información en una estructura de datos estricta.
                </p>
              </div>

              <div className="flex items-start space-x-2">
                <span className="bg-slate-800 text-white font-mono rounded w-4 h-4 flex items-center justify-center text-[10px] shrink-0 font-bold select-none">3</span>
                <p>
                  <strong className="text-slate-200">Importación veloz</strong>: Verá botones cargados sobre su pantalla de chat para registrar contratistas o inyectar cubicaciones a sus planillas al instante.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
