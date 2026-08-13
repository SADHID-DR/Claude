/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PurchaseOrder, PurchaseOrderLineItem, Contractor } from '../types';
import { Plus, Trash2, X, DollarSign } from 'lucide-react';
import {
  createPurchaseOrder,
  updatePOLineItems,
  updatePODiscount,
  calculateLineItemTotal,
  calculatePOTotal,
} from '../purchaseOrderService';

interface PurchaseOrderFormProps {
  contractors: Contractor[];
  initialPO?: PurchaseOrder | null;
  onSubmit: (po: PurchaseOrder) => void;
  onCancel: () => void;
}

export default function PurchaseOrderForm({
  contractors,
  initialPO,
  onSubmit,
  onCancel,
}: PurchaseOrderFormProps) {
  const [supplier, setSupplier] = useState<Contractor | null>(
    initialPO ? contractors.find((c) => c.id === initialPO.supplierId) || null : null
  );
  const [lineItems, setLineItems] = useState<PurchaseOrderLineItem[]>(
    initialPO?.lineItems || []
  );
  const [discount, setDiscount] = useState(initialPO?.discount || 0);
  const [discountType, setDiscountType] = useState<'AMOUNT' | 'PERCENTAGE'>(
    initialPO?.discountType || 'AMOUNT'
  );
  const [notes, setNotes] = useState(initialPO?.notes || '');
  const [dueDate, setDueDate] = useState(
    initialPO?.dueDate.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('ud');
  const [newItemPrice, setNewItemPrice] = useState(0);

  const subtotal = lineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
  const discountAmount = discountType === 'AMOUNT' ? discount : subtotal * (discount / 100);
  const afterDiscount = subtotal - discountAmount;
  const itbis = afterDiscount * 0.18;
  const total = calculatePOTotal(subtotal, discount, discountType, 18);

  const handleAddLineItem = () => {
    if (!newItemDescription || newItemQuantity <= 0 || newItemPrice < 0) {
      alert('Por favor completa los datos del artículo');
      return;
    }

    const newItem: PurchaseOrderLineItem = {
      id: `item_${Date.now()}`,
      itemName: newItemDescription.split('\n')[0],
      description: newItemDescription,
      quantity: newItemQuantity,
      unit: newItemUnit,
      unitPrice: newItemPrice,
      taxable: true,
      taxRate: 18,
    };

    setLineItems([...lineItems, newItem]);
    setNewItemDescription('');
    setNewItemQuantity(1);
    setNewItemPrice(0);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, updates: Partial<PurchaseOrderLineItem>) => {
    setLineItems(
      lineItems.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier) {
      alert('Por favor selecciona un proveedor');
      return;
    }

    if (lineItems.length === 0) {
      alert('Por favor agrega al menos un artículo');
      return;
    }

    let po: PurchaseOrder;

    if (initialPO) {
      po = {
        ...initialPO,
        lineItems,
        discount,
        discountType,
        notes,
        dueDate: `${dueDate}T00:00:00Z`,
        itbis,
        total,
        updatedAt: new Date().toISOString(),
      };
    } else {
      po = createPurchaseOrder(
        supplier.id,
        supplier.name,
        supplier.email,
        supplier.phone,
        supplier.address,
        supplier.document,
        lineItems
      );
      po.discount = discount;
      po.discountType = discountType;
      po.notes = notes;
      po.dueDate = `${dueDate}T00:00:00Z`;
      po.itbis = itbis;
      po.total = total;
    }

    onSubmit(po);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Proveedor */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Proveedor</h3>
        <select
          value={supplier?.id || ''}
          onChange={(e) => {
            const s = contractors.find((c) => c.id === e.target.value);
            setSupplier(s || null);
          }}
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
          required
        >
          <option value="">Selecciona un proveedor</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {supplier && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
            <p>
              <span className="font-semibold text-slate-700">Dirección:</span> {supplier.address}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Teléfono:</span> {supplier.phone}
            </p>
            <p>
              <span className="font-semibold text-slate-700">Email:</span> {supplier.email}
            </p>
            <p>
              <span className="font-semibold text-slate-700">RNC/Cédula:</span> {supplier.document}
            </p>
          </div>
        )}
      </div>

      {/* Datos de la OC */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Información de la Orden</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fecha de Vencimiento
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Artículos */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Artículos</h3>

        {lineItems.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300">
                  <th className="text-left py-2 px-2 text-slate-700">Descripción</th>
                  <th className="text-center py-2 px-2 text-slate-700 w-20">Cantidad</th>
                  <th className="text-center py-2 px-2 text-slate-700 w-16">Unidad</th>
                  <th className="text-right py-2 px-2 text-slate-700 w-24">Precio U.</th>
                  <th className="text-right py-2 px-2 text-slate-700 w-24">Total</th>
                  <th className="text-center py-2 px-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateLineItem(item.id, { description: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateLineItem(item.id, {
                            quantity: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          handleUpdateLineItem(item.id, { unit: e.target.value })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-center"
                      />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleUpdateLineItem(item.id, {
                            unitPrice: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border border-slate-300 rounded text-sm text-right"
                      />
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-slate-900">
                      {calculateLineItemTotal(item).toLocaleString('es-DO', {
                        style: 'currency',
                        currency: 'DOP',
                      })}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="text-red-600 hover:bg-red-100 p-1 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Agregar artículo */}
        <div className="border-t-2 border-slate-300 pt-4 mt-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Agregar Artículo</h4>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              placeholder="Descripción del artículo"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              className="col-span-4 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(parseFloat(e.target.value))}
              className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:border-blue-500 focus:outline-none"
              step="0.01"
            />
            <input
              type="text"
              placeholder="Unidad"
              value={newItemUnit}
              onChange={(e) => setNewItemUnit(e.target.value)}
              className="col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:border-blue-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Precio"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(parseFloat(e.target.value))}
              className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:border-blue-500 focus:outline-none"
              step="0.01"
            />
            <button
              type="button"
              onClick={handleAddLineItem}
              className="col-span-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center justify-center gap-1 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Descuentos y Totales */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Subtotales</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">Subtotal:</span>
            <span className="font-semibold text-slate-900">
              {subtotal.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <label className="text-slate-700 font-semibold">Descuento:</label>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value))}
                className="w-24 px-3 py-1 border border-slate-300 rounded text-sm text-right focus:border-blue-500 focus:outline-none"
                step="0.01"
              />
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'AMOUNT' | 'PERCENTAGE')}
                className="px-3 py-1 border border-slate-300 rounded text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="AMOUNT">RD$</option>
                <option value="PERCENTAGE">%</option>
              </select>
            </div>
            <span className="font-semibold text-slate-900">
              -{discountAmount.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-700">ITBIS (18%):</span>
            <span className="font-semibold text-slate-900">
              {itbis.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
            </span>
          </div>

          <div className="flex justify-between py-3 border-t-2 border-b-2 border-slate-300 text-lg">
            <span className="font-bold text-slate-900">Total:</span>
            <span className="font-bold text-amber-600 text-2xl">
              {total.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' })}
            </span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-2">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
          rows={3}
          placeholder="Términos, condiciones especiales, etc."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition-all font-semibold"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
        >
          {initialPO ? 'Actualizar OC' : 'Crear OC'}
        </button>
      </div>
    </form>
  );
}
