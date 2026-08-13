/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseOrder, PurchaseOrderTemplate, PurchaseOrderControl, PurchaseOrderLineItem } from './types';

// Generate unique PO number: PO-YYYY-MMDD-XXXX
export function generatePONumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}${month}${day}-${random}`;
}

// Generate unique PO ID
export function generatePOId(): string {
  return `po_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate line item total
export function calculateLineItemTotal(item: PurchaseOrderLineItem): number {
  return item.quantity * item.unitPrice;
}

// Calculate PO subtotal
export function calculatePOSubtotal(lineItems: PurchaseOrderLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
}

// Calculate discount amount
export function calculateDiscount(subtotal: number, discount: number, type: 'AMOUNT' | 'PERCENTAGE' = 'AMOUNT'): number {
  if (type === 'PERCENTAGE') {
    return subtotal * (discount / 100);
  }
  return Math.min(discount, subtotal); // Discount can't exceed subtotal
}

// Calculate ITBIS (19% in Dominican Republic, can be customized)
export function calculateItbis(amount: number, rate: number = 18): number {
  return amount * (rate / 100);
}

// Calculate PO total
export function calculatePOTotal(subtotal: number, discount: number, discountType: 'AMOUNT' | 'PERCENTAGE' = 'AMOUNT', itbisRate: number = 18): number {
  const discountAmount = calculateDiscount(subtotal, discount, discountType);
  const afterDiscount = subtotal - discountAmount;
  const itbis = calculateItbis(afterDiscount, itbisRate);
  return afterDiscount + itbis;
}

// Create new PO
export function createPurchaseOrder(
  supplierId: string,
  supplierName: string,
  supplierEmail: string,
  supplierPhone: string,
  supplierAddress: string,
  supplierDocument: string,
  lineItems: PurchaseOrderLineItem[],
  projectId?: string,
  projectName?: string,
  createdBy?: string
): PurchaseOrder {
  const now = new Date().toISOString();
  const subtotal = calculatePOSubtotal(lineItems);
  const discount = 0;
  const itbis = calculateItbis(subtotal);
  const total = calculatePOTotal(subtotal, discount, 'AMOUNT', 18);

  // Set due date to 30 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    id: generatePOId(),
    poNumber: generatePONumber(),
    date: now,
    dueDate: dueDate.toISOString(),
    supplierId,
    supplierName,
    supplierEmail,
    supplierPhone,
    supplierAddress,
    supplierDocument,
    projectId,
    projectName,
    lineItems,
    subtotal,
    discount,
    discountType: 'AMOUNT',
    itbis,
    total,
    status: 'BORRADOR',
    createdBy,
    createdAt: now,
    updatedAt: now,
  };
}

// Clone PO (for creating new one from existing)
export function clonePurchaseOrder(po: PurchaseOrder, createdBy?: string): PurchaseOrder {
  const now = new Date().toISOString();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  return {
    ...po,
    id: generatePOId(),
    poNumber: generatePONumber(),
    date: now,
    dueDate: dueDate.toISOString(),
    status: 'BORRADOR',
    approvedBy: undefined,
    approvedAt: undefined,
    receivedBy: undefined,
    receivedAt: undefined,
    invoiceNumber: undefined,
    createdBy: createdBy || po.createdBy,
    createdAt: now,
    updatedAt: now,
    changes: [],
  };
}

// Update line items in PO
export function updatePOLineItems(po: PurchaseOrder, lineItems: PurchaseOrderLineItem[]): PurchaseOrder {
  const subtotal = calculatePOSubtotal(lineItems);
  const itbis = calculateItbis(subtotal - calculateDiscount(subtotal, po.discount, po.discountType));
  const total = calculatePOTotal(subtotal, po.discount, po.discountType, 18);

  return {
    ...po,
    lineItems,
    subtotal,
    itbis,
    total,
    updatedAt: new Date().toISOString(),
  };
}

// Update discount in PO
export function updatePODiscount(po: PurchaseOrder, discount: number, discountType: 'AMOUNT' | 'PERCENTAGE'): PurchaseOrder {
  const itbis = calculateItbis(po.subtotal - calculateDiscount(po.subtotal, discount, discountType));
  const total = calculatePOTotal(po.subtotal, discount, discountType, 18);

  return {
    ...po,
    discount,
    discountType,
    itbis,
    total,
    updatedAt: new Date().toISOString(),
  };
}

// Approve PO
export function approvePurchaseOrder(po: PurchaseOrder, approvedBy: string): PurchaseOrder {
  if (po.status !== 'BORRADOR') {
    throw new Error('Solo se pueden aprobar órdenes en estado BORRADOR');
  }

  return {
    ...po,
    status: 'ENVIADA',
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Confirm PO (received/accepted by supplier)
export function confirmPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    status: 'CONFIRMADA',
    updatedAt: new Date().toISOString(),
  };
}

// Mark as received
export function markPOAsReceived(po: PurchaseOrder, receivedBy: string, invoiceNumber?: string): PurchaseOrder {
  return {
    ...po,
    status: 'RECIBIDA',
    receivedBy,
    receivedAt: new Date().toISOString(),
    invoiceNumber,
    updatedAt: new Date().toISOString(),
  };
}

// Cancel PO
export function cancelPurchaseOrder(po: PurchaseOrder): PurchaseOrder {
  return {
    ...po,
    status: 'CANCELADA',
    updatedAt: new Date().toISOString(),
  };
}

// Export to QuickBooks QBXML format (for Web Connect integration with QB 15 Desktop)
export function exportPOToQuickBooksQBXML(po: PurchaseOrder): string {
  const lines: string[] = [];

  // XML Header
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<?qbxml version="13.0"?>');
  lines.push('<QBXMLMsgsRs onError="stopOnError">');
  lines.push('  <PurchaseOrderAddRs>');

  // Purchase Order Add Request
  lines.push('    <PurchaseOrderAdd>');
  lines.push(`      <VendorRef>${escapeXML(po.supplierName)}</VendorRef>`);
  lines.push(`      <PoNumber>${escapeXML(po.poNumber)}</PoNumber>`);
  lines.push(`      <TxnDate>${formatDateForQB(po.date)}</TxnDate>`);
  lines.push(`      <DueDate>${formatDateForQB(po.dueDate)}</DueDate>`);
  lines.push(`      <Memo>${escapeXML(po.notes || `Orden de Compra ${po.poNumber}`)}</Memo>`);

  // Line items
  po.lineItems.forEach((item) => {
    lines.push('      <PurchaseOrderLineAdd>');
    lines.push(`        <ItemRef>${escapeXML(item.itemName)}</ItemRef>`);
    lines.push(`        <Desc>${escapeXML(item.description)}</Desc>`);
    lines.push(`        <Quantity>${item.quantity}</Quantity>`);
    lines.push(`        <UnitOfMeasure>${escapeXML(item.unit)}</UnitOfMeasure>`);
    lines.push(`        <Rate>${item.unitPrice.toFixed(2)}</Rate>`);
    lines.push('      </PurchaseOrderLineAdd>');
  });

  // Apply discount if exists
  if (po.discount > 0) {
    const discountAmount = po.discountType === 'AMOUNT'
      ? po.discount
      : po.subtotal * (po.discount / 100);

    lines.push('      <PurchaseOrderLineAdd>');
    lines.push('        <ItemRef>Discount Item</ItemRef>');
    lines.push(`        <Desc>Descuento${po.discountType === 'PERCENTAGE' ? ` ${po.discount}%` : ''}</Desc>`);
    lines.push('        <Quantity>1</Quantity>');
    lines.push(`        <Rate>-${discountAmount.toFixed(2)}</Rate>`);
    lines.push('      </PurchaseOrderLineAdd>');
  }

  lines.push('    </PurchaseOrderAdd>');
  lines.push('  </PurchaseOrderAddRs>');
  lines.push('</QBXMLMsgsRs>');

  return lines.join('\n');
}

// Export to QuickBooks IIF format (for import into QB 15)
export function exportPOToQuickBooksIIF(po: PurchaseOrder): string {
  const lines: string[] = [];

  // Header
  lines.push('!PO\tNAME\tBDADDR1\tBDADDR2\tBDADDR3\tBDADDR4\tBDADDR5\tPHONE\tEMAIL\tDATE\tDUEDATE\tMEMO\tMEMO\tCLASS');
  lines.push(`PO\t${po.supplierName}\t${po.supplierAddress}\t\t\t\t\t${po.supplierPhone}\t${po.supplierEmail}\t${formatDateForQB(po.date)}\t${formatDateForQB(po.dueDate)}\t${po.poNumber}\t${po.notes || ''}\t${po.qbClassRef || ''}`);

  // Line items
  lines.push('!POITEM\tMEMO\tQNTY\tUNIT\tRATE\tAMOUNT');
  po.lineItems.forEach((item) => {
    const amount = calculateLineItemTotal(item);
    lines.push(`POITEM\t${item.description}\t${item.quantity}\t${item.unit}\t${item.unitPrice.toFixed(2)}\t${amount.toFixed(2)}`);
  });

  // Totals
  lines.push('!POTOTAL\tSUBTOTAL\tDISCOUNT\tITBIS\tTOTAL');
  lines.push(`POTOTAL\t${po.subtotal.toFixed(2)}\t${po.discount.toFixed(2)}\t${po.itbis.toFixed(2)}\t${po.total.toFixed(2)}`);

  lines.push('ENDPO');

  return lines.join('\n');
}

// Generate Web Connect file (.qbwc) for QB Desktop integration
export function generateWebConnectFile(qbxmlContent: string, fileName: string = 'purchase_order.qbwc'): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0"?>');
  lines.push('<WebConnectResult>');
  lines.push(`  <ServerVersion>13.0</ServerVersion>`);
  lines.push(`  <SessionTicket>QB15-DESKTOP-SESSION</SessionTicket>`);
  lines.push(`  <AppURL>qbpos://localhost:8080/import</AppURL>`);
  lines.push(`  <CompanyFile>${fileName}</CompanyFile>`);
  lines.push(`  <QBXMLCountInEnvelope>${qbxmlContent.split('<PurchaseOrderAdd>').length - 1}</QBXMLCountInEnvelope>`);
  lines.push('  <QBXMLEnvelope onError="stopOnError">');
  lines.push(qbxmlContent);
  lines.push('  </QBXMLEnvelope>');
  lines.push('</WebConnectResult>');

  return lines.join('\n');
}

// Helper function to escape XML special characters
function escapeXML(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Export to CSV format
export function exportPOToCSV(po: PurchaseOrder): string {
  const lines: string[] = [];

  // Header info
  lines.push(`Orden de Compra,${po.poNumber}`);
  lines.push(`Fecha,${po.date}`);
  lines.push(`Vencimiento,${po.dueDate}`);
  lines.push(`Proveedor,${po.supplierName}`);
  lines.push(`Dirección,${po.supplierAddress}`);
  lines.push(`Teléfono,${po.supplierPhone}`);
  lines.push(`Email,${po.supplierEmail}`);
  lines.push(`RNC/Cédula,${po.supplierDocument}`);
  lines.push('');

  // Line items header
  lines.push('Descripción,Cantidad,Unidad,Precio Unitario,Total');

  // Line items
  po.lineItems.forEach((item) => {
    const total = calculateLineItemTotal(item);
    lines.push(`"${item.description}",${item.quantity},${item.unit},${item.unitPrice.toFixed(2)},${total.toFixed(2)}`);
  });

  lines.push('');
  lines.push(`Subtotal,,,,${po.subtotal.toFixed(2)}`);
  lines.push(`Descuento,,,,${po.discount.toFixed(2)}`);
  lines.push(`ITBIS,,,,${po.itbis.toFixed(2)}`);
  lines.push(`Total,,,,${po.total.toFixed(2)}`);

  return lines.join('\n');
}

// Format date for QuickBooks (MM/DD/YYYY)
function formatDateForQB(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

// Generate monthly control report
export function generateMonthlyPOControl(pos: PurchaseOrder[], month: string): PurchaseOrderControl {
  const filtered = pos.filter((po) => po.date.startsWith(month));

  const byStatus = {
    BORRADOR: 0,
    ENVIADA: 0,
    CONFIRMADA: 0,
    RECIBIDA: 0,
    CANCELADA: 0,
  };

  const bySupplier: Record<string, number> = {};

  filtered.forEach((po) => {
    byStatus[po.status]++;
    bySupplier[po.supplierId] = (bySupplier[po.supplierId] || 0) + po.total;
  });

  return {
    id: `poc_${month}`,
    month,
    totalOrders: filtered.length,
    totalAmount: filtered.reduce((sum, po) => sum + po.total, 0),
    orders: filtered,
    byStatus,
    bySupplier,
    generatedAt: new Date().toISOString(),
  };
}
