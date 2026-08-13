# Sistema de Órdenes de Compra - QuickBooks 15 Integration

## 📋 Descripción General

Este sistema permite gestionar órdenes de compra a proveedores con control total y exportación directa a QuickBooks 15. Es una solución completa para:

- ✅ Crear y editar órdenes de compra
- ✅ Mantener control de estados (Borrador → Enviada → Confirmada → Recibida)
- ✅ Exportar a formatos QuickBooks (IIF) y Excel (CSV)
- ✅ Monitoreo de órdenes por mes y proveedor
- ✅ Auditoría completa de cambios

---

## 🎯 Cómo Acceder

1. En la aplicación, ve a la pestaña **"Órdenes de Compra"** en la navegación superior
2. Verás un dashboard con:
   - **Lista de OC**: Todas tus órdenes de compra
   - **Botón Nueva OC**: Para crear una nueva orden
   - **Botón Control**: Para ver estadísticas y reportes

---

## 📝 Crear una Nueva Orden de Compra

### Paso 1: Ir a Nueva OC
Haz clic en el botón **"+ Nueva OC"**

### Paso 2: Seleccionar Proveedor
- Elige un proveedor de tu **Base de Contratistas**
- Se cargarán automáticamente: dirección, teléfono, email, RNC/Cédula

### Paso 3: Agregar Artículos
Para cada artículo que quieras ordenar:
1. **Descripción**: Nombre del artículo (ej: "Cemento Portland 50kg")
2. **Cantidad**: Cuántos (ej: 100)
3. **Unidad**: Unidad de medida (ej: bolsas, m2, m3, gl, kg, ud)
4. **Precio**: Precio unitario (ej: 350.00)
5. Haz clic en **"Agregar"**

Los totales se calculan automáticamente:
- **Subtotal** = Suma de todos los artículos
- **Descuento** = Opcional (RD$ o %)
- **ITBIS (18%)** = Se calcula sobre el subtotal menos descuentos
- **Total** = Subtotal - Descuento + ITBIS

### Paso 4: Configurar Detalles
- **Fecha de Vencimiento**: Cuándo esperas recibir la mercancía (default: 30 días)
- **Notas**: Términos especiales, condiciones de pago, etc.

### Paso 5: Guardar
Haz clic en **"Crear OC"** para guardar

---

## 📊 Estados de una Orden de Compra

| Estado | Símbolo | Significado | Acciones |
|--------|---------|------------|----------|
| **BORRADOR** | 📝 | Orden no enviada aún | Editar, Eliminar, Cambiar estado |
| **ENVIADA** | 📤 | Orden enviada al proveedor | Cambiar estado, Exportar a QB, Cambiar a Cancelada |
| **CONFIRMADA** | ✅ | Proveedor confirmó la orden | Cambiar a Recibida, Cancelar |
| **RECIBIDA** | 📦 | Mercancía ha llegado | Vincular factura (opcional) |
| **CANCELADA** | ❌ | Orden cancelada | No se puede modificar |

### Cómo Cambiar Estado
1. Haz clic en el botón **"Ver"** en la orden
2. Verás el estado actual arriba
3. Si hay un botón **"→ Cambiar Estado"**, haz clic
4. Selecciona el nuevo estado

---

## 📤 Exportar a QuickBooks 15

### Formato IIF (Recomendado para QB 15)

1. Abre la orden que quieres exportar
2. Haz clic en el botón **"📊 Exportar QuickBooks"** (disponible cuando está en estado ENVIADA)
3. Se descargará un archivo `.iif`
4. En QuickBooks 15:
   - Ve a **File → Utilities → Import → IIF Files**
   - Selecciona el archivo descargado
   - QuickBooks importará automáticamente la orden de compra

**Nota**: El archivo IIF contiene:
- Información del proveedor
- Todos los artículos y cantidades
- Precios unitarios y totales
- Descuentos e ITBIS

### Formato CSV (Para Excel)

1. En la orden, haz clic en **"↓ Exportar CSV"**
2. Se descargará un archivo `.csv`
3. Puedes abrirlo en:
   - Microsoft Excel
   - Google Sheets
   - OpenOffice

---

## 📈 Panel de Control

El **Panel de Control** te muestra:

### Resumen General
- **Total de Órdenes**: Cantidad de OC en el período
- **Monto Total**: Suma de todas las órdenes
- **Promedio por OC**: Monto promedio por orden

### Estado de Órdenes
- 📝 Órdenes en Borrador
- 📤 Órdenes Enviadas
- ✅ Órdenes Confirmadas
- 📦 Órdenes Recibidas
- ❌ Órdenes Canceladas

### Proveedores Principales
- Top 5 proveedores por monto total
- Gráfico comparativo de montos

### Tendencia Mensual
- Últimos 6 meses de órdenes
- Gráfico de evolución de gastos

---

## 🔄 Duplicar una Orden

Si necesitas crear una orden similar a una anterior:

1. Abre la orden que quieres duplicar
2. Haz clic en **"Duplicar"**
3. Se creará una copia en estado **BORRADOR**
4. Puedes editar los detalles (cantidad, precios, etc.)
5. Guarda la nueva orden

---

## 🛠️ Funciones Avanzadas

### Descuentos
- **Monto fijo**: Resta un cantidad de RD$
- **Porcentaje**: Resta un % del subtotal

Ejemplo:
- Subtotal: RD$10,000
- Descuento 5%: RD$500
- Base ITBIS: RD$9,500
- ITBIS (18%): RD$1,710
- Total: RD$11,210

### Filtros en Listado
- **Por Estado**: Ver solo órdenes en cierto estado
- **Por Proveedor**: Ver solo órdenes de un proveedor específico

### Auditoría
Cada acción en órdenes se registra en el **Registro de Auditoría**:
- Quién creó/editó la orden
- Cuándo se realizó el cambio
- Detalles del cambio

---

## 🔗 Integración con Proveedores

### Desde la Base de Contratistas
Las órdenes se crean vinculadas a proveedores en tu **Base de Contratistas**. 

Para agregar un nuevo proveedor:
1. Ve a **Base Contratistas**
2. Haz clic en **"+ Agregar Contratista"**
3. Llena los datos:
   - Nombre del proveedor
   - Dirección
   - Teléfono
   - Email
   - RNC/Cédula
   - Banco (opcional)
   - Cuenta (opcional)

---

## 💾 Almacenamiento y Sincronización

### Local (Offline)
- Las órdenes se guardan en IndexedDB de tu navegador
- Puedes crear/editar órdenes sin internet
- Se sincronizan automáticamente cuando vuelves online

### Cloud (Firebase)
- Si estás logueado, las órdenes se sincronizan a Firestore
- Acceso desde múltiples dispositivos
- Respaldo automático

---

## 📋 Formato de Datos

### Estructura de una Orden de Compra

```typescript
{
  id: "po_1725004234",           // ID único
  poNumber: "PO-20260813-1234",   // Número para QB
  date: "2026-08-13T...",         // Fecha de creación
  dueDate: "2026-09-12T...",      // Fecha de vencimiento
  
  supplierName: "Importadora XYZ",
  supplierEmail: "ventas@xyz.com",
  supplierPhone: "809-123-4567",
  supplierDocument: "1-01234567-8",
  
  lineItems: [
    {
      description: "Cemento Portland",
      quantity: 100,
      unit: "bolsas",
      unitPrice: 350.00
    }
  ],
  
  subtotal: 35000.00,
  discount: 0,
  discountType: "AMOUNT",
  itbis: 6300.00,
  total: 41300.00,
  
  status: "ENVIADA",
  notes: "Entrega antes del 15"
}
```

---

## ❓ Preguntas Frecuentes

### ¿Cómo exporto varias órdenes a la vez?
Actualmente exportas una por una. En futuras versiones habrá exportación masiva.

### ¿Puedo editar una orden después de enviarla?
No, las órdenes en estado ENVIADA o superior no se pueden editar. Duplica la orden y crea una nueva.

### ¿Desaparecen las órdenes cuando logout?
No, se guardan en la Base de Datos. Al login aparecerán de nuevo.

### ¿Cómo vinculo la orden con la factura del proveedor?
En la orden recibida, hay un campo "Número de Factura" donde puedes anotar el número de la factura del proveedor.

### ¿Qué pasa si eliminó una orden?
Si estaba en BORRADOR se elimina completamente. Si estaba en otro estado, el sistema no permite eliminación (se cancela en su lugar).

---

## 🚀 Próximas Características (Roadmap)

- [ ] Exportación masiva (múltiples órdenes a Excel)
- [ ] Integración directa con API de QuickBooks Cloud
- [ ] Recepción parcial de órdenes
- [ ] Órdenes recurrentes/templates
- [ ] Notificaciones por email
- [ ] Aprobación por múltiples usuarios
- [ ] Seguimiento de presupuesto

---

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa el **Panel de Control** para ver estadísticas
2. Verifica el **Registro de Auditoría** en Dashboard
3. Contacta al administrador del sistema

---

**Sistema de Órdenes de Compra v1.0 - 2026**
