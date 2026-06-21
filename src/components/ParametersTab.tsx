/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ProjectParams, AuditLogEntry } from '../types';
import { ToggleLeft, ToggleRight, Lock, Unlock, RefreshCw, CheckCircle2, History, Filter } from 'lucide-react';

interface ParametersTabProps {
  params: ProjectParams;
  onUpdateParams: (newParams: ProjectParams) => void;
  includeItbisInNet: boolean;
  onToggleItbisInNet: () => void;
  onResetParams: () => void;
  hasAnyClosedReport?: boolean;
  auditLogs: AuditLogEntry[];
}

export default function ParametersTab({
  params,
  onUpdateParams,
  includeItbisInNet,
  onToggleItbisInNet,
  onResetParams,
  hasAnyClosedReport = false,
  auditLogs
}: ParametersTabProps) {
  // Lock state simulation
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  // States for audit logs filters
  const [userFilter, setUserFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const uniqueUsers = useMemo(() => Array.from(new Set(auditLogs.map(l => l.user))).sort(), [auditLogs]);
  const uniqueActions = useMemo(() => Array.from(new Set(auditLogs.map(l => l.action))).sort(), [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (userFilter && log.user !== userFilter) return false;
      if (actionFilter && log.action !== actionFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100); // Mostrar max. 100 para simplificar
  }, [auditLogs, userFilter, actionFilter]);

  // Temporary local state for editing
  const [tempParams, setTempParams] = useState<ProjectParams>({
    ...params,
    companyAddress: params.companyAddress || "Carretera Mella Km. 8.5, Zona Oriental, Santo Domingo, R.D.",
    companyRfc: params.companyRfc || "1-31-04281-2",
    companyPhone: params.companyPhone || "(809) 555-0199",
    companyEmail: params.companyEmail || "info@albasanchez.com",
    companyLogo: params.companyLogo || ""
  });

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    let isValidAdmin = false;
    try {
      const savedUsersStr = localStorage.getItem('nom_construction_users_db');
      if (savedUsersStr) {
        const users = JSON.parse(savedUsersStr);
        isValidAdmin = users.some((u: any) => u.role === 'admin' && (u.password || '123') === password);
      } else {
        isValidAdmin = password === '123';
      }
    } catch(err) {
      isValidAdmin = password === '123';
    }

    if (isValidAdmin) {
      setIsLocked(false);
      setPasswordError("");
      setPassword("");
    } else {
      setPasswordError("Clave incorrecta. Ingrese la clave de un Administrador.");
    }
  };

  const handleLock = () => {
    setIsLocked(true);
    setSuccessMsg("");
    setTempParams({
      ...params,
      companyAddress: params.companyAddress || "Carretera Mella Km. 8.5, Zona Oriental, Santo Domingo, R.D.",
      companyRfc: params.companyRfc || "1-31-04281-2",
      companyPhone: params.companyPhone || "(809) 555-0199",
      companyEmail: params.companyEmail || "info@albasanchez.com",
      companyLogo: params.companyLogo || ""
    });
  };

  React.useEffect(() => {
    if (isLocked) {
      setTempParams(prev => ({
        ...params,
        companyAddress: params.companyAddress || "Carretera Mella Km. 8.5, Zona Oriental, Santo Domingo, R.D.",
        companyRfc: params.companyRfc || "1-31-04281-2",
        companyPhone: params.companyPhone || "(809) 555-0199",
        companyEmail: params.companyEmail || "info@albasanchez.com",
        companyLogo: params.companyLogo || prev.companyLogo || ""
      }));
    }
  }, [params, isLocked]);

  const handleChange = (key: keyof ProjectParams, value: any) => {
    setTempParams(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    // Validate bounds
    if (tempParams.percentIsr < 0 || tempParams.percentIsr > 100) {
      setErrorMsg("ISR debe estar entre 0% y 100%");
      return;
    }
    if (tempParams.percentTss < 0 || tempParams.percentTss > 100) {
      setErrorMsg("TSS debe estar entre 0% y 100%");
      return;
    }
    if (tempParams.percentPension < 0 || tempParams.percentPension > 100) {
      setErrorMsg("Pensión debe estar entre 0% y 100%");
      return;
    }
    if (tempParams.percentWarranty < 0 || tempParams.percentWarranty > 100) {
      setErrorMsg("Garantía debe estar entre 0% y 100%");
      return;
    }
    if (tempParams.percentItbis < 0 || tempParams.percentItbis > 100) {
      setErrorMsg("ITBIS debe estar entre 0% y 100%");
      return;
    }
    
    if (!tempParams.companyName.trim()) {
      setErrorMsg("El nombre de la empresa es obligatorio");
      return;
    }
    if (!tempParams.projectName.trim()) {
      setErrorMsg("El nombre del proyecto es obligatorio");
      return;
    }

    setErrorMsg("");
    onUpdateParams(tempParams);
    setSuccessMsg("¡Parámetros actualizados con éxito!");
    setTimeout(() => setSuccessMsg(""), 3000);
    setIsLocked(true);
  };

  const executeReset = () => {
    onResetParams();
    setTempParams({
      ...params,
      percentIsr: 2,
      percentTss: 2.87,
      percentPension: 1,
      percentWarranty: 5,
      percentItbis: 18,
      isItbisInclusive: false,
    });
    setErrorMsg("");
    setSuccessMsg("¡Porcentajes restaurados a valores de fábrica!");
    setTimeout(() => setSuccessMsg(""), 3000);
    setShowConfirmReset(false);
  };

  return (
    <div id="parameters-tab" className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Tabla de Parámetros de Ley</span>
            <span className="text-xs bg-slate-100 font-mono text-slate-500 font-semibold px-2 py-0.5 rounded-sm">
              tblParametros
            </span>
          </h2>
          <p className="text-xs text-slate-500">Configura las tasas impositivas y retenciones de seguridad social del proyecto.</p>
        </div>

        <div className="mt-2 md:mt-0">
          {isLocked ? (
            <div className="bg-amber-50 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 flex items-center space-x-1.5">
              <Lock size={14} />
              <span>BLOQUEADO PARA EDICIÓN</span>
            </div>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-md border border-emerald-200 flex items-center space-x-1.5">
              <Unlock size={14} />
              <span>EDITABLE (DESBLOQUEADO)</span>
            </div>
          )}
        </div>
      </div>

      {/* Informative alert explaining frozen/paste values for closed reports */}
      {hasAnyClosedReport && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3 text-slate-700">
          <div className="text-blue-500 font-bold text-base select-none shrink-0">💡</div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-blue-900">Historial Protegido (Cierre Consolidado)</h4>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Existen reportes de pago ya cerrados (liquidados) en el sistema. Los cambios que realice en estos parámetros <strong>solo afectarán a reportes abiertos o que cree en el futuro</strong>. Las retenciones y datos de los reportes ya cerrados se han <strong>congelado permanentemente con sus tasas originales particulares</strong> (como un pegado de valores en Excel) para garantizar la consistencia legal e histórica del proyecto.
            </p>
          </div>
        </div>
      )}

      {/* Security lock password screen */}
      {isLocked && (
        <form onSubmit={handleUnlock} className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xs font-bold text-slate-800 flex items-center justify-center md:justify-start gap-1">
              <Lock size={12} className="text-amber-500" />
              <span>Protección de Celdas y Fórmulas Activa</span>
            </h3>
            <p className="text-[11px] text-slate-500">Por seguridad administrativa, desbloquee el sistema antes de alterar las fórmulas.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <input 
              type="password" 
              placeholder="Clave de Administrador" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-hidden focus:border-blue-500 bg-white font-mono"
            />
            <button 
              type="submit"
              className="bg-blue-600 border border-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap"
            >
              Desbloquear Tablas
            </button>
          </div>
        </form>
      )}

      {passwordError && (
        <span className="text-xs text-red-500 block text-right font-medium">{passwordError}</span>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 flex items-center space-x-2 text-xs">
          <span className="font-bold">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-lg p-3 text-emerald-800 flex items-center space-x-2 text-xs">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Parameter Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Retentions / Percentages Column */}
        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trazabilidad de Retenciones de Pago</h3>

          <div className="space-y-3">
            {/* % ISR */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                % Impuesto Sobre la Renta (ISR): (Persona Física/Jurídica)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={isLocked ? params.percentIsr : tempParams.percentIsr}
                  onChange={(e) => handleChange('percentIsr', parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* % TSS */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                % Retención Seguridad Social (TSS):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={isLocked ? params.percentTss : tempParams.percentTss}
                  onChange={(e) => handleChange('percentTss', parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* % Pension Fund */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                % Fondo de Pensiones Ley 6-86:
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={isLocked ? params.percentPension : tempParams.percentPension}
                  onChange={(e) => handleChange('percentPension', parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* % Retention Warranty */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                % Retención Garantía de Obras (Fondo de Amortización):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={isLocked ? params.percentWarranty : tempParams.percentWarranty}
                  onChange={(e) => handleChange('percentWarranty', parseFloat(e.target.value) || 0)}
                  disabled={isLocked}
                  className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-medium"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
              </div>
            </div>

            {/* % ITBIS & Calculation Mode */}
            <div className="bg-blue-50/10 p-3.5 border border-blue-100/40 rounded-lg space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  % Transferencia Bienes Industriales e ITBIS (Tasa Base):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={isLocked ? params.percentItbis : tempParams.percentItbis}
                    onChange={(e) => handleChange('percentItbis', parseFloat(e.target.value) || 0)}
                    disabled={isLocked}
                    className="w-full pl-3 pr-8 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-505 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-bold text-slate-800"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* Presets via Cotejo (Checkboxes) */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Selección de Tasa ITBIS (Cotejo):</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={(isLocked ? params.percentItbis : tempParams.percentItbis) === 1.8}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange('percentItbis', 1.8);
                        } else {
                          handleChange('percentItbis', 0);
                        }
                      }}
                      disabled={isLocked}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span>1.8% (Norma 07-2007)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-xs font-bold text-slate-700 hover:text-slate-900 transition-all select-none">
                    <input
                      type="checkbox"
                      checked={(isLocked ? params.percentItbis : tempParams.percentItbis) === 18}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleChange('percentItbis', 18);
                        } else {
                          handleChange('percentItbis', 0);
                        }
                      }}
                      disabled={isLocked}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span>18% (Tasa Estándar)</span>
                  </label>
                </div>
              </div>

              {/* Inclusive/Exclusive Selector */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block">Criterio de Inclusión de ITBIS:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChange('isItbisInclusive', false)}
                    disabled={isLocked}
                    className={`px-2.5 py-1.5 text-[11px] font-extrabold rounded-md border transition-all cursor-pointer text-center ${
                      !(isLocked ? params.isItbisInclusive : tempParams.isItbisInclusive)
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Exclusive (+ Adicionado)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('isItbisInclusive', true)}
                    disabled={isLocked}
                    className={`px-2.5 py-1.5 text-[11px] font-extrabold rounded-md border transition-all cursor-pointer text-center ${
                      (isLocked ? params.isItbisInclusive : tempParams.isItbisInclusive)
                        ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Inclusive (✓ Incluido)
                  </button>
                </div>
                <p className="text-[10px] leading-tight text-slate-500 pt-1">
                  {(isLocked ? params.isItbisInclusive : tempParams.isItbisInclusive)
                    ? "✓ ITBIS se presume dentro del precio contractual; restamos la tasa proporcional de la base para computar retenciones."
                    : "+ ITBIS se agregará en el pie sobre el total bruto de partidas cubicadas."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Context & Formulations */}
        <div className="bg-slate-50/50 p-4 border border-slate-200 rounded-xl space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contexto del Proyecto Constructor</h3>

          <div className="space-y-3">
            {/* Company Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Comercial de la Empresa (Constructora):</label>
              <input
                type="text"
                value={isLocked ? params.companyName : tempParams.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Company RNC/RFC */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">RNC / RFC de la Empresa (Nuestra):</label>
              <input
                type="text"
                value={isLocked ? (params.companyRfc || "") : (tempParams.companyRfc || "")}
                onChange={(e) => handleChange('companyRfc', e.target.value)}
                disabled={isLocked}
                placeholder="Ej. 1-31-04281-2"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Company Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Dirección de la Empresa (Nuestra):</label>
              <input
                type="text"
                value={isLocked ? (params.companyAddress || "") : (tempParams.companyAddress || "")}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                disabled={isLocked}
                placeholder="Ej. Carretera Mella Km. 8.5, Zona Oriental, Santo Domingo, R.D."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Company Phone */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono de la Empresa (Nuestra):</label>
              <input
                type="text"
                value={isLocked ? (params.companyPhone || "") : (tempParams.companyPhone || "")}
                onChange={(e) => handleChange('companyPhone', e.target.value)}
                disabled={isLocked}
                placeholder="Ej. (809) 555-0199"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Company Email */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Correo de la Empresa (Nuestra):</label>
              <input
                type="email"
                value={isLocked ? (params.companyEmail || "") : (tempParams.companyEmail || "")}
                onChange={(e) => handleChange('companyEmail', e.target.value)}
                disabled={isLocked}
                placeholder="Ej. info@albasanchez.com"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Project Name */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre Oficial del Proyecto Principal:</label>
              <input
                type="text"
                value={isLocked ? params.projectName : tempParams.projectName}
                onChange={(e) => handleChange('projectName', e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Dirección Física del Proyecto:</label>
              <input
                type="text"
                value={isLocked ? params.address : tempParams.address}
                onChange={(e) => handleChange('address', e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Supervisor / Director */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Ing. Supervisor / Responsable General:</label>
              <input
                type="text"
                value={isLocked ? params.responsible : tempParams.responsible}
                onChange={(e) => handleChange('responsible', e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-indigo-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Símbolo Monetario (Moneda):</label>
              <select
                value={isLocked ? params.currency : tempParams.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-xs focus:outline-hidden focus:border-blue-500 disabled:opacity-60 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="DOP">DOP ($) - Peso Dominicano</option>
                <option value="USD">USD ($) - Dólar Estadounidense</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>

            {/* Logo de la Empresa */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Logo de la Empresa (Imagen para Reportes):</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white p-3 rounded-md border border-slate-200">
                {tempParams.companyLogo ? (
                  <div className="relative border border-slate-200 rounded p-2 bg-slate-50 flex items-center justify-center max-w-[140px] shrink-0">
                    <img 
                      src={tempParams.companyLogo} 
                      alt="Logo Empresa" 
                      className="h-10 w-auto object-contain max-w-[120px]"
                      referrerPolicy="no-referrer"
                    />
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleChange('companyLogo', '')}
                        className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-700 text-white font-bold p-0.5 rounded-full text-[10px] w-4 h-4 flex items-center justify-center transition-colors shadow-xs"
                        title="Eliminar Logo"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic bg-slate-50 py-3.5 px-4 border border-dashed text-center rounded border-slate-250 w-full sm:max-w-[140px] shrink-0 h-14 flex items-center justify-center">
                    Sin logo cargado
                  </div>
                )}
                
                <div className="flex-1">
                  {!isLocked ? (
                    <>
                      <input
                        type="file"
                        accept="image/*"
                        id="company-logo-upload"
                        className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate max size (2MB)
                          if (file.size > 2 * 1024 * 1024) {
                            setErrorMsg("La imagen excede el límite máximo de 2 MB.");
                            e.target.value = '';
                            return;
                          }
                          setErrorMsg("");

                          const reader = new FileReader();
                          reader.onload = (uploadEvent) => {
                            if (uploadEvent.target?.result) {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 250;
                                const MAX_HEIGHT = 250;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }
                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                
                                if (ctx) {
                                  // If the image is not PNG, fill with white to avoid black backgrounds on transparent SVGs drawn as JPEG
                                  if (file.type !== 'image/png' && file.type !== 'image/webp') {
                                    ctx.fillStyle = '#FFFFFF';
                                    ctx.fillRect(0, 0, width, height);
                                  }
                                  ctx.drawImage(img, 0, 0, width, height);
                                }
                                
                                // Keep transparency for PNG/WebP, compress others as JPEG
                                const format = (file.type === 'image/png' || file.type === 'image/webp') ? file.type : 'image/jpeg';
                                const dataUrl = canvas.toDataURL(format, 0.85);
                                handleChange('companyLogo', dataUrl);
                              };
                              img.src = uploadEvent.target.result as string;
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      />
                      <label
                        htmlFor="company-logo-upload"
                        className="inline-block px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-md text-[11px] font-bold text-slate-700 cursor-pointer hover:bg-slate-200 transition-all text-center select-none"
                      >
                        Seleccionar Imagen o Logo
                      </label>
                      <p className="text-[9px] text-slate-400 mt-1">Formatos sugeridos: PNG, JPG, SVG. Dimensiones recomendadas: horizontales (ej. 300x80px).</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-500">Desbloquee la Tabla de Parámetros de Ley para modificar o cargar el logo corporativo de la empresa.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Calculation Options */}
      <div className="p-4 border border-blue-100 rounded-xl space-y-4 bg-blue-50/20">
        <h3 className="text-xs font-bold text-slate-800">Criterio Técnico del Neto a Recibir</h3>
        <p className="text-xs text-slate-500">¿El impuesto ITBIS {params.percentItbis === 1.8 ? "1.8% (Norma 07-2007)" : `${params.percentItbis}%`} representa parte de la remuneración agregada o es meramente descriptivo?</p>
        
        <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-lg">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-slate-800">Fórmula de Neto Incluye ITBIS</span>
            <p className="text-[10px] text-slate-500">
              {includeItbisInNet 
                ? "Fórmula activa: Neto = (Bruto + ITBIS) - Retenciones de Ley" 
                : "Fórmula activa: Neto = Bruto - Retenciones de Ley (ITBIS se reporta por separado)"}
            </p>
          </div>

          <button 
            type="button" 
            onClick={() => {
              if (isLocked) {
                setErrorMsg("Por seguridad, desbloquee la Tabla de Parámetros antes de cambiar este criterio.");
                setTimeout(() => setErrorMsg(""), 5000);
                return;
              }
              onToggleItbisInNet();
            }}
            className={`cursor-pointer focus:outline-hidden ${isLocked ? "opacity-60 cursor-not-allowed" : "text-slate-700"}`}
          >
            {includeItbisInNet ? (
              <ToggleRight size={38} className={isLocked ? "text-slate-400" : "text-emerald-500"} />
            ) : (
              <ToggleLeft size={38} className="text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Save / Reset Panel buttons */}
      {!isLocked && (
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {showConfirmReset ? (
            <div className="flex items-center space-x-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
              <span className="text-xs text-amber-800 font-medium">¿Seguro de restaurar tasas por defecto?</span>
              <button
                type="button"
                onClick={executeReset}
                className="px-2.5 py-1 bg-amber-600 text-white text-xs font-bold rounded hover:bg-amber-700 cursor-pointer transition-colors"
              >
                Sí, restaurar
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmReset(false)}
                className="px-2.5 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300 cursor-pointer transition-colors"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmReset(true)}
              className="text-slate-600 hover:text-slate-900 text-xs font-semibold px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Restablecer Tasas por Defecto</span>
            </button>
          )}

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleLock}
              className="w-full sm:w-auto text-slate-700 bg-slate-100 hover:bg-slate-200 text-xs font-semibold px-4 py-2 rounded-md transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 text-xs font-semibold px-5 py-2 rounded-md transition-all shadow-sm cursor-pointer"
            >
              Guardar Cambios y Bloquear
            </button>
          </div>
        </div>
      )}

      {/* Historial de Cambios Simplificado */}
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 mb-4">
          <History size={18} className="text-blue-500" />
          <span>Últimos Cambios en la Obra</span>
        </h3>
        
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Usuario
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full text-xs box-border border-slate-300 rounded px-3 py-1.5 focus:outline-hidden focus:border-blue-500 bg-white"
            >
              <option value="">Todos los usuarios</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Tipo de Acción
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs box-border border-slate-300 rounded px-3 py-1.5 focus:outline-hidden focus:border-blue-500 bg-white"
            >
              <option value="">Todas las acciones</option>
              {uniqueActions.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border text-sm border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Fecha y Hora</th>
                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Usuario</th>
                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Acción</th>
                <th className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase">Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 text-xs italic">
                    No se encontraron registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2 whitespace-nowrap text-xs text-slate-600 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-700">
                      {log.user}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] uppercase font-bold tracking-wider">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {log.details.length > 80 ? log.details.substring(0, 80) + '...' : log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
