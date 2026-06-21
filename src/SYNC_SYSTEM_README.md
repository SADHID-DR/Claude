# Sistema de Sincronización en Tiempo Real - MaResNóminas

## 📋 Resumen

Tu aplicación ahora tiene un sistema **robusto de sincronización en tiempo real** con Firestore que garantiza:

- ✅ **Actualización instantánea** cuando cargas la página
- ✅ **Sincronización automática** de cambios a Firestore
- ✅ **Funcionamiento offline** con sincronización automática cuando vuelvas online
- ✅ **Detección de conflictos** cuando otra persona modifica lo mismo
- ✅ **Alertas inteligentes** si hay diferencias importantes

---

## 🎯 Cómo Funciona

### 1. **Carga Inicial (Al abrir la página)**
```
User abre la app
↓
Firebase carga datos locales (IndexedDB)
↓
Listeners en tiempo real (onSnapshot) se activan
↓
App siempre muestra la versión más reciente
```

### 2. **Modificaciones en Tiempo Real**
```
User edita un contratista / proyecto / parámetro
↓
El cambio se guarda en local inmediatamente
↓
Después de 2 segundos sin cambios → Auto-guardar en Firestore
↓
App sincroniza al instante con otros dispositivos/pestañas
```

### 3. **Modo Offline**
```
User pierde conexión
↓
Sigue trabajando normalmente (datos en IndexedDB)
↓
Cambios se guardan localmente
↓
Indicador muestra "🔴 Sin conexión"
↓
Vuelve a conectarse
↓
Auto-sincroniza todos los cambios pendientes
```

### 4. **Detección de Conflictos**
```
Dos usuarios editan el MISMO contratista/proyecto simultáneamente
↓
El sistema detecta timestamps diferentes
↓
Alerta: "⚠️ Otra persona modificó esto mientras trabajabas offline"
↓
User elige: Usar versión remota O mantener cambios locales
```

---

## 🔧 Componentes Técnicos

### Archivos Nuevos

#### 1. **`src/realtimeSyncService.ts`**
- Escucha cambios en tiempo real desde Firestore
- Detecta conflictos comparando timestamps
- Mantiene cache de datos remotos
- Inicia/detiene listeners

**Métodos principales:**
```typescript
startRealtimeSync()        // Inicia listeners
detectConflicts()          // Detecta conflictos
getRemoteData()           // Obtiene datos remotos
stopRealtimeSync()        // Detiene listeners
```

#### 2. **`src/useSyncManager.ts`**
Hook React que maneja toda la sincronización:
- Auto-guarda con debounce (2 segundos)
- Sincronización offline → online
- Resolución de conflictos
- Cambios de estado

**Uso en tu app:**
```typescript
const { resolveConflict } = useSyncManager({
  projects,
  contractors,
  priceGuide: generalPriceGuide,
  includeItbisInNet,
  onConflictDetected,
  onSyncStatusChange,
});
```

#### 3. **`src/components/SyncStatusIndicator.tsx`**
Componente visual que muestra:
- ✅ Sincronizado
- 🔄 Sincronizando
- 🔴 Sin conexión
- ⚠️ Conflictos detectados

---

## 📍 Estados de Sincronización

| Estado | Símbolo | Significado | Acción |
|--------|---------|------------|--------|
| `synced` | ✅ | Datos sincronizados | Nada, todo bien |
| `syncing` | 🔄 | Guardando a Firestore | Esperar 2 segundos |
| `offline` | 🔴 | Sin conexión | Trabajar en local |
| `error` | ❌ | Error al guardar | Verificar conexión |

---

## 🎯 Flujos Comunes

### Flujo 1: Editar un Contratista
```
1. User edita nombre de contratista
2. El cambio aparece inmediatamente en pantalla
3. Se guarda localmente (IndexedDB)
4. Después de 2 segundos sin cambios → Auto-guardar en Firestore
5. Indicador muestra "✅ Sincronizado"
6. Todos los otros usuarios/dispositivos ven el cambio al instante (via onSnapshot)
```

### Flujo 2: Trabajar Offline
```
1. Internet se corta
2. Indicador muestra "🔴 Sin conexión"
3. User sigue editando normalmente
4. Los cambios se guardan en IndexedDB
5. Cuando vuelve la conexión...
6. Auto-sincroniza todos los cambios a Firestore
7. Indicador cambia a "✅ Sincronizado"
```

### Flujo 3: Conflicto Detectado
```
1. User A y User B editan el mismo proyecto offline
2. User A se conecta primero → sus cambios se guardan
3. User B se conecta → el sistema detecta que los datos remotos son más nuevos
4. Alerta: "⚠️ Conflicto detectado"
5. User B elige:
   - "Usar remoto" → carga cambios de User A
   - "Mantener local" → sobrescribe con sus cambios
```

---

## 🚀 Cómo Integrar en Google Cloud Run

El sistema ya está integrado. Para asegurar que funciona:

### 1. **Verificar Firebase Config**
```bash
# Asegúrate que firebaseConfig esté correcto en:
cat src/firebase-applet-config.json
```

### 2. **Habilitar Firestore Offline Persistence**
```typescript
// Ya está habilitado en src/firebase.ts
enableIndexedDbPersistence(db);
```

### 3. **Reglas de Firestore Security**
Verifica que tengas reglas que permitan lectura/escritura:
```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/** {
      allow read, write: if request.auth.uid == uid;
    }
  }
}
```

### 4. **Variables de Entorno**
```bash
# .env debe tener:
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
etc.
```

---

## ⚠️ Detalles Técnicos Importantes

### Auto-Save Debounce
- Espera **2 segundos** después del último cambio antes de guardar
- Esto evita guardar 100 veces por segundo
- Los datos siempre están en IndexedDB (seguro)

### Timestamps para Conflictos
```typescript
// El sistema usa:
1. serverTimestamp() → Hora del servidor (confiable)
2. Comparación local → Para detectar cambios concurrentes
3. Hash de datos → Para verificar integridad

// Si timestamp remoto > timestamp local
// → Hay un conflicto
```

### Sincronización Offline
```typescript
// Window events monitoreados:
window.addEventListener('online', () => {
  // Automáticamente re-sincroniza cambios pendientes
});

window.addEventListener('offline', () => {
  // Los datos se quedan en IndexedDB
  // Siguiendo funcionando normalmente
});
```

---

## 🧪 Probar el Sistema

### Test 1: Sincronización Inmediata
```
1. Abre maresgestion.com/nominas en dos pestañas
2. Edita un contratista en la pestaña 1
3. Verifica que la pestaña 2 se actualiza automáticamente
✅ PASS: Ambas pestañas muestran el cambio
```

### Test 2: Modo Offline
```
1. Abre DevTools (F12)
2. Network tab → Desconecta internet (Offline)
3. Edita un proyecto
4. El indicador debe mostrar "🔴 Sin conexión"
5. Verifica que los cambios se guardan localmente
6. Reconecta (Back online)
7. El indicador debe sincronizar automáticamente
✅ PASS: Los cambios se sincronizan sin perder nada
```

### Test 3: Conflictos
```
1. Abre dos sesiones con usuarios diferentes
2. Ambos editan el mismo contratista
3. Uno se desconecta (Network → Offline)
4. El otro guarda los cambios
5. El primero se reconecta
6. Debe aparecer alerta de conflicto
✅ PASS: Se ofrece opción de resolver
```

---

## 📊 Monitoreo en Firestore Console

Puedes ver la sincronización en tiempo real:

```
Google Cloud Console
↓
Firestore Database
↓
users/{uid}/projects/
users/{uid}/contractors/
users/{uid}/settings/generalPriceGuide
↓
Verifica que updatedAt sea reciente
```

---

## 🔒 Seguridad

El sistema mantiene:
- ✅ Autenticación via Google (initAuth)
- ✅ Datos encriptados en tránsito (HTTPS/SSL)
- ✅ Firestore rules verifican permisos
- ✅ No se envían datos sensibles en caché local
- ✅ Checksums verifican integridad

---

## 📱 Soporte Multi-Dispositivo

```
Device A (Desktop)
  ↓ Edita contratista
  ↓ Guarda en Firestore
        ↓
        Firestore
        ↓
Device B (Mobile) ← Recibe cambio automáticamente via onSnapshot
Device C (Tablet) ← Recibe cambio automáticamente via onSnapshot
```

Todos los dispositivos ven cambios en **tiempo real**.

---

## ⚡ Mejoras Futuras (Opcional)

Si quieres agregar:
- ⏱️ Historial de cambios / Auditoría
- 🔄 Sincronización selectiva por proyecto
- 📊 Métricas de sincronización
- 🔔 Notificaciones en tiempo real
- 👥 Colaboración en vivo con cursores

Puedo ayudarte a implementarlas.

---

## 🆘 Troubleshooting

### "Los cambios no se sincronizan"
```
1. Verifica que estés logueado (isAuthenticated = true)
2. Abre DevTools → Console → Busca mensajes de error
3. Verifica que Firestore rules permitan acceso
4. Recarga la página y prueba de nuevo
```

### "Veo conflictos constantemente"
```
1. Verifica timestamps en Firestore
2. Asegúrate que la hora del servidor sea correcta
3. Cierra otras pestañas/dispositivos
4. Resuelve manualmente: Usa remoto o mantén local
```

### "Offline no funciona"
```
1. Verifica que IndexedDB esté habilitado
2. Chrome: Settings → Privacy → Cookies → Allow all
3. Verifica espacio disponible (IndexedDB tiene límite)
4. Recarga la página
```

---

## 📞 Soporte

Si tienes problemas, revisa:
1. Console.log en DevTools
2. Firestore Security Rules
3. Network tab (¿hay errores 403?)
4. Última sincronización (updatedAt en Firestore)

---

**Sistema de Sincronización: ✅ Listo para producción**
