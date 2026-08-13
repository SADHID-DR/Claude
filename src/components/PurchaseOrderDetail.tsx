/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PurchaseOrder, Contractor } from '../types';
import {
  X,
  Edit,
  Copy,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRight,
  DollarSign,
} from 'lucide-react';
import {
  approvePurchaseOrder,
  confirmPurchaseOrder,
  markPOAsReceived,
  calculateLineItemTotal,
} from '../purchaseOrderService';

interface PurchaseOrderDetailProps {
  po: PurchaseOrder;
  contractors: Contractor[];
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onExport: (format: 'csv' | 'iif') => void;
  onClose: () => void;
  onUpdate: (po: PurchaseOrder) => void;
}

export default function PurchaseOrderDetail({
  po,
  contractors,
  onEdit,
  onClone,
  onDelete,
  onExport,
  onClose,
  onUpdate,
}: PurchaseOrderDetailProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const supplier = contractors.find((c) => c.id === po.supplierId);

  const handleStatusChange = (newStatus: string) => {
    let updatedPO: PurchaseOrder;

    switch (newStatus) {
      case 'ENVIADA':
        updatedPO = approvePurchaseOrder(po, 'Usuario actual');
        break;
      case 'CONFIRMADA':
        updatedPO = confirmPurchaseOrder(po);
        break;
      case 'RECIBIDA':
        updatedPO = markPOAsReceived(po, 'Usuario actual');
        break;
      default:
        return;
    }

    onUpdate(updatedPO);
    setShowStatusMenu(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BORRADOR':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ENVIADA':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'CONFIRMADA':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'RECIBIDA':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'CANCELADA':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getNextStatus = (status: string): string[] => {
    const transitions: Record<string, string[]> = {
      BORRADOR: ['ENVIADA', 'CANCELADA'],
      ENVIADA: ['CONFIRMADA', 'CANCELADA'],
      CONFIRMADA: ['RECIBIDA', 'CANCELADA'],
      RECIBIDA: [],
      CANCELADA: [],
    };
    return transitions[status] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">{po.poNumber}</h2>
          <p className="text-slate-600 mt-1">{supplier?.name}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-lg font-semibold border-2 ${getStatusColor(po.status)}`}>
              {po.status}
            </div>
            <div className="text-sm text-slate-600">
              {po.status === 'BORRADOR' && '📝 Pendiente de aprobación'}
              {po.status === 'ENVIADA' && '📤 Orden enviada al proveedor'}
              {po.status === 'CONFIRMADA' && '✅ Proveedor confirmó'}
              {po.status === 'RECIBIDA' && '📦 Mercancía recibida'}
              {po.status === 'CANCELADA' && '❌ Orden cancelada'}
            </div>
          </div>

          {getNextStatus(po.status).length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Cambiar Estado
              </button>

              {showStatusMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white border-2 border-slate-300 rounded-lg shadow-xl z-10">
                  {getNextStatus(po.status).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="block w-full text-left px-4 py-2 hover:bg-slate-100 border-b last:border-b-0 text-slate-700 hover:text-slate-900"
                    >
                      → {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Detalles Generales */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Detalles Generales</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">Fecha de Creación</p>
                <p className="font-semibold text-slate-900">
                  {new Date(po.date).toLocaleDateString('es-DO')}
                </p>
              </div>
              <div>
                <p className="text-slate-600">Fecha de Vencimiento</p>
                <p className="font-semibold text-slate-900">
                  {new Date(po.dueDate).toLocaleDateString('es-DO')}
                </p>
              </div>
              {po.approvedAt && (
                <div>
                  <p className="text-slate-600">Aprobado por</p>
                  <p className="font-semibold text-slate-900">{po.approvedBy}</p>
                </div>
              )}
              {po.receivedAt && (
                <div>
                  <p className="text-slate-600">Recibido por</p>
                  <p className="font-semibold text-slate-900">{po.receivedBy}</p>
                </div>
              )}
            </div>
          </div>

          {/* Información del Proveedor */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Proveedor</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-600">Nombre:</span>
                <span className="ml-2 font-semibold text-slate-900">{po.supplierName}</span>
              </p>
              <p>
                <span className="text-slate-600">Dirección:</span>
                <span className="ml-2 font-semibold text-slate-900">{po.supplierAddress}</span>
              </p>
              <p>
                <span className="text-slate-600">Teléfono:</span>
                <span className="ml-2 font-semibold text-slate-900">{po.supplierPhone}</span>
              </p>
              <p>
                <span className="text-slate-600">Email:</span>
                <span className="ml-2 font-semibold text-slate-900">{po.supplierEmail}</span>
              </p>
              <p>
                <span className="text-slate-600">RNC/Cédula:</span>
                <span className="ml-2 font-semibold text-slate-900">{po.supplierDocument}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Totales */}
        <div className="space-y-6">
          {/* Resumen Financiero */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border-2 border-amber-400 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              Resumen Financiero
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">Subtotal:</span>
                <span className="font-semibold text-slate-900">
                  {po.subtotal.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                </span>
              </div>
              {po.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">Descuento ({po.discountType === 'PERCENTAGE' ? `${po.discount}%` : ''}):</span>
                  <span className="font-semibold text-red-600">
                    -{po.discount.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-700">ITBIS (18%):</span>
                <span className="font-semibold text-slate-900">
                  {po.itbis.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                </span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-slate-300 text-lg">
                <span className="font-bold text-slate-900">Total:</span>
                <span className="font-bold text-amber-600 text-2xl">
                  {po.total.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones */}
          <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              {po.status === 'BORRADOR' && (
                <button
                  onClick={onEdit}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              )}
              <button
                onClick={onClone}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicar
              </button>
              <button
                onClick={() => onExport('csv')}
                className="w-full px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all font-semibold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              {po.status === 'ENVIADA' && (
                <button
                  onClick={() => onExport('iif')}
                  className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all font-semibold"
                >
                  📊 Exportar QuickBooks
                </button>
              )}
              {po.status === 'BORRADOR' && (
                <button
                  onClick={onDelete}
                  className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Artículos */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Artículos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300">
                <th className="text-left py-3 px-4 text-slate-700 font-semibold">Descripción</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">Cantidad</th>
                <th className="text-center py-3 px-4 text-slate-700 font-semibold">Unidad</th>
                <th className="text-right py-3 px-4 text-slate-700 font-semibold">Precio U.</th>
                <th className="text-right py-3 px-4 text-slate-700 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.lineItems.map((item) => (
                <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-900">{item.description}</td>
                  <td className="py-3 px-4 text-center text-slate-900">{item.quantity}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{item.unit}</td>
                  <td className="py-3 px-4 text-right text-slate-900 font-semibold">
                    {item.unitPrice.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-semibold">
                    {calculateLineItemTotal(item).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notas */}
      {po.notes && (
        <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Notas</h3>
          <p className="text-slate-700 whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}
    </div>
  );
}
