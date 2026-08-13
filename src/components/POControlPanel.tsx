/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Contractor } from '../types';
import { ArrowLeft, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { generateMonthlyPOControl } from '../purchaseOrderService';

interface POControlPanelProps {
  purchaseOrders: PurchaseOrder[];
  contractors: Contractor[];
  onClose: () => void;
}

export default function POControlPanel({
  purchaseOrders,
  contractors,
  onClose,
}: POControlPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const control = useMemo(
    () => generateMonthlyPOControl(purchaseOrders, selectedMonth),
    [purchaseOrders, selectedMonth]
  );

  // Get all available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    purchaseOrders.forEach((po) => {
      months.add(po.date.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [purchaseOrders]);

  const topSuppliers = useMemo(() => {
    return Object.entries(control.bySupplier)
      .map(([supplierId, amount]) => {
        const supplier = contractors.find((c) => c.id === supplierId);
        return {
          id: supplierId,
          name: supplier?.name || 'Desconocido',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [control.bySupplier, contractors]);

  const stats = [
    {
      label: 'Órdenes Borrador',
      value: control.byStatus.BORRADOR,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700',
    },
    {
      label: 'Órdenes Enviadas',
      value: control.byStatus.ENVIADA,
      icon: AlertCircle,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Órdenes Confirmadas',
      value: control.byStatus.CONFIRMADA,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700',
    },
    {
      label: 'Órdenes Recibidas',
      value: control.byStatus.RECIBIDA,
      icon: CheckCircle,
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Panel de Control de OC</h2>
          <p className="text-slate-600 mt-1">Monitoreo de órdenes de compra</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 transition-all font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Volver
        </button>
      </div>

      {/* Mes Selector */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <label className="block text-sm font-semibold text-slate-700 mb-3">
          Selecciona mes:
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-slate-700 font-semibold"
        >
          <option value="">Todos los meses</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>
              {new Date(`${month}-01`).toLocaleDateString('es-DO', {
                year: 'numeric',
                month: 'long',
              })}
            </option>
          ))}
        </select>
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-300 p-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <p className="text-amber-700 text-sm font-semibold mb-2">Total de Órdenes</p>
            <p className="text-4xl font-bold text-amber-900">{control.totalOrders}</p>
          </div>
          <div>
            <p className="text-amber-700 text-sm font-semibold mb-2">Monto Total</p>
            <p className="text-3xl font-bold text-amber-900">
              {control.totalAmount.toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 })}
            </p>
          </div>
          <div>
            <p className="text-amber-700 text-sm font-semibold mb-2">Promedio por OC</p>
            <p className="text-2xl font-bold text-amber-900">
              {control.totalOrders > 0
                ? (control.totalAmount / control.totalOrders).toLocaleString('es-DO', {
                    style: 'currency',
                    currency: 'DOP',
                    maximumFractionDigits: 0,
                  })
                : 'RD$0'}
            </p>
          </div>
        </div>
      </div>

      {/* Status Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-lg border-2 p-6 text-center ${stat.color}`}
            >
              <Icon className="w-8 h-8 mx-auto mb-2 opacity-70" />
              <p className="text-sm font-semibold mb-1 opacity-75">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Top Suppliers */}
      <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Proveedores Principales
        </h3>
        {topSuppliers.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No hay datos disponibles</p>
        ) : (
          <div className="space-y-3">
            {topSuppliers.map((supplier, index) => (
              <div key={supplier.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{supplier.name}</p>
                    <p className="text-sm text-slate-600">
                      {supplier.amount.toLocaleString('es-DO', {
                        style: 'currency',
                        currency: 'DOP',
                        maximumFractionDigits: 0,
                      })}
                    </p>
                  </div>
                </div>
                <div className="w-32 bg-slate-300 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-full"
                    style={{
                      width: `${(supplier.amount / (topSuppliers[0]?.amount || 1)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pie Chart style status breakdown */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Distribución por Estado</h3>
          <div className="space-y-3">
            {[
              { status: 'BORRADOR', value: control.byStatus.BORRADOR, color: 'bg-yellow-500' },
              { status: 'ENVIADA', value: control.byStatus.ENVIADA, color: 'bg-blue-500' },
              { status: 'CONFIRMADA', value: control.byStatus.CONFIRMADA, color: 'bg-green-500' },
              { status: 'RECIBIDA', value: control.byStatus.RECIBIDA, color: 'bg-purple-500' },
              { status: 'CANCELADA', value: control.byStatus.CANCELADA, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.status}>
                <div className="flex justify-between mb-1">
                  <p className="text-sm font-semibold text-slate-700">{item.status}</p>
                  <p className="text-sm font-bold text-slate-900">{item.value}</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${item.color} h-full`}
                    style={{
                      width: `${control.totalOrders > 0 ? (item.value / control.totalOrders) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Últimos 6 Meses</h3>
          <div className="space-y-2">
            {availableMonths.slice(0, 6).map((month) => {
              const monthControl = generateMonthlyPOControl(purchaseOrders, month);
              const maxAmount = Math.max(
                ...availableMonths.slice(0, 6).map((m) => generateMonthlyPOControl(purchaseOrders, m).totalAmount)
              );
              return (
                <div key={month} className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-slate-600 w-20">
                    {new Date(`${month}-01`).toLocaleDateString('es-DO', { month: 'short' })}
                  </p>
                  <div className="flex-1 bg-slate-200 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-end pr-2"
                      style={{
                        width: `${maxAmount > 0 ? (monthControl.totalAmount / maxAmount) * 100 : 0}%`,
                      }}
                    >
                      {monthControl.totalAmount > 0 && (
                        <p className="text-white text-xs font-bold">
                          {(monthControl.totalAmount / 1000000).toFixed(1)}M
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
