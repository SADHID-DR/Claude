/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PurchaseOrder, Contractor } from '../types';
import {
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Filter,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import {
  generatePONumber,
  createPurchaseOrder,
  clonePurchaseOrder,
  exportPOToCSV,
  exportPOToQuickBooksIIF,
  exportPOToQuickBooksQBXML,
  generateWebConnectFile,
} from '../purchaseOrderService';
import PurchaseOrderForm from './PurchaseOrderForm';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import POControlPanel from './POControlPanel';

interface PurchaseOrdersTabProps {
  contractors: Contractor[];
  purchaseOrders: PurchaseOrder[];
  onAdd: (po: PurchaseOrder) => void;
  onUpdate: (po: PurchaseOrder) => void;
  onDelete: (poId: string) => void;
}

type ViewMode = 'list' | 'form' | 'detail' | 'control';

export default function PurchaseOrdersTab({
  contractors,
  purchaseOrders,
  onAdd,
  onUpdate,
  onDelete,
}: PurchaseOrdersTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');

  const filteredPOs = purchaseOrders.filter((po) => {
    if (statusFilter && po.status !== statusFilter) return false;
    if (supplierFilter && po.supplierId !== supplierFilter) return false;
    return true;
  });

  const suppliers = Array.from(new Set(contractors.map((c) => c.id))).map(
    (id) => contractors.find((c) => c.id === id)
  ).filter(Boolean) as Contractor[];

  const handleNewPO = () => {
    setSelectedPO(null);
    setIsFormOpen(true);
    setViewMode('form');
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsFormOpen(true);
    setViewMode('form');
  };

  const handleViewPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setViewMode('detail');
  };

  const handleFormSubmit = (po: PurchaseOrder) => {
    if (selectedPO?.id) {
      onUpdate(po);
    } else {
      onAdd(po);
    }
    setIsFormOpen(false);
    setViewMode('list');
  };

  const handleClonePO = (po: PurchaseOrder) => {
    const cloned = clonePurchaseOrder(po);
    onAdd(cloned);
  };

  const handleDeletePO = (poId: string) => {
    if (confirm('¿Estás seguro que quieres eliminar esta orden de compra?')) {
      onDelete(poId);
    }
  };

  const handleExportPO = (po: PurchaseOrder, format: 'csv' | 'iif' | 'qbwc') => {
    let content = '';
    let filename = '';
    let mimeType = 'text/plain';

    if (format === 'csv') {
      content = exportPOToCSV(po);
      filename = `${po.poNumber}.csv`;
    } else if (format === 'iif') {
      content = exportPOToQuickBooksIIF(po);
      filename = `${po.poNumber}.iif`;
    } else if (format === 'qbwc') {
      const qbxml = exportPOToQuickBooksQBXML(po);
      content = generateWebConnectFile(qbxml, po.poNumber);
      filename = `${po.poNumber}.qbwc`;
      mimeType = 'application/x-qbwc';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return 'bg-yellow-100 text-yellow-800';
      case 'ENVIADA':
        return 'bg-blue-100 text-blue-800';
      case 'CONFIRMADA':
        return 'bg-green-100 text-green-800';
      case 'RECIBIDA':
        return 'bg-purple-100 text-purple-800';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return <Clock className="w-4 h-4" />;
      case 'ENVIADA':
        return <AlertCircle className="w-4 h-4" />;
      case 'CONFIRMADA':
        return <CheckCircle className="w-4 h-4" />;
      case 'RECIBIDA':
        return <CheckCircle className="w-4 h-4" />;
      case 'CANCELADA':
        return <X className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Órdenes de Compra</h2>
          <p className="text-slate-600">Gestiona órdenes a proveedores con control total</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setViewMode('control')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all shadow-lg hover:shadow-xl"
          >
            <TrendingUp className="w-5 h-5" />
            Control
          </button>
          <button
            onClick={handleNewPO}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Nueva OC
          </button>
        </div>
      </div>

      {/* View Mode Switcher */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="mb-6 flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-slate-700"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ENVIADA">Enviada</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="RECIBIDA">Recibida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>

            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none bg-white text-slate-700"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setStatusFilter('');
                setSupplierFilter('');
              }}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
            >
              Limpiar filtros
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {filteredPOs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-slate-300">
                  <p className="text-slate-500 text-lg">No hay órdenes de compra</p>
                  <button
                    onClick={handleNewPO}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Crear la primera OC
                  </button>
                </div>
              ) : (
                filteredPOs.map((po) => (
                  <div
                    key={po.id}
                    className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-blue-400 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-900">{po.poNumber}</h3>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(po.status)}`}>
                            {getStatusIcon(po.status)}
                            {po.status}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{po.supplierName}</p>
                        <p className="text-slate-500 text-sm">
                          {new Date(po.date).toLocaleDateString('es-DO')} • Total: {po.total.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewPO(po)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {po.status === 'BORRADOR' && (
                          <button
                            onClick={() => handleEditPO(po)}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleExportPO(po, 'csv')}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                          title="Exportar CSV"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {po.status === 'ENVIADA' && (
                          <>
                            <button
                              onClick={() => handleExportPO(po, 'qbwc')}
                              className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all font-bold"
                              title="Enviar a QuickBooks Desktop"
                            >
                              📊
                            </button>
                            <button
                              onClick={() => handleExportPO(po, 'iif')}
                              className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-all text-xs"
                              title="Exportar IIF"
                            >
                              📋
                            </button>
                          </>
                        )}
                        {po.status === 'BORRADOR' && (
                          <button
                            onClick={() => handleDeletePO(po.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {viewMode === 'form' && (
        <PurchaseOrderForm
          contractors={contractors}
          initialPO={selectedPO}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setIsFormOpen(false);
            setViewMode('list');
          }}
        />
      )}

      {viewMode === 'detail' && selectedPO && (
        <PurchaseOrderDetail
          po={selectedPO}
          onEdit={() => handleEditPO(selectedPO)}
          onClone={() => handleClonePO(selectedPO)}
          onDelete={() => handleDeletePO(selectedPO.id)}
          onExport={(format) => handleExportPO(selectedPO, format)}
          onClose={() => setViewMode('list')}
          contractors={contractors}
          onUpdate={onUpdate}
        />
      )}

      {viewMode === 'control' && (
        <POControlPanel
          purchaseOrders={purchaseOrders}
          contractors={contractors}
          onClose={() => setViewMode('list')}
        />
      )}
    </div>
  );
}
