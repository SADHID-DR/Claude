/**
 * Indicator visual del estado de sincronización
 * Muestra: online/offline, syncing, conflictos, etc.
 */

import React, { useState } from 'react';
import { Cloud, Wifi, WifiOff, CloudLightning, AlertTriangle, Check, X } from 'lucide-react';
import { SyncConflict } from '../realtimeSyncService';

interface SyncStatusIndicatorProps {
  status: 'syncing' | 'synced' | 'offline' | 'error';
  conflicts?: SyncConflict[];
  onResolveConflict?: (conflict: SyncConflict, resolution: 'local' | 'remote') => void;
  onDismiss?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  status,
  conflicts = [],
  onResolveConflict,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    syncing: {
      icon: <CloudLightning className="w-4 h-4 animate-spin" />,
      label: 'Sincronizando...',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
    },
    synced: {
      icon: <Check className="w-4 h-4" />,
      label: 'Sincronizado',
      color: 'bg-green-100 text-green-700 border-green-300',
    },
    offline: {
      icon: <WifiOff className="w-4 h-4" />,
      label: 'Sin conexión',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    },
    error: {
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Error de sincronización',
      color: 'bg-red-100 text-red-700 border-red-300',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Main Status Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color} cursor-pointer`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {config.icon}
        <span className="text-sm font-medium">{config.label}</span>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 max-w-sm">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 text-sm">
                ⚠️ Detectados {conflicts.length} conflicto{conflicts.length > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-red-700 mt-1">
                Otra persona modificó esto mientras trabajabas offline. Elige cómo resolver:
              </p>

              <div className="space-y-2 mt-3">
                {conflicts.map((conflict) => (
                  <div
                    key={`${conflict.type}-${conflict.id}`}
                    className="bg-white rounded p-2 text-xs border border-red-200"
                  >
                    <p className="font-medium text-gray-700">
                      {conflict.type === 'project' && '📋 Proyecto'}
                      {conflict.type === 'contractor' && '👤 Contratista'}
                      {conflict.type === 'priceGuide' && '💰 Guía de Precios'}
                      {conflict.remoteName && `: ${conflict.remoteName}`}
                    </p>

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          onResolveConflict?.(conflict, 'remote');
                          setIsExpanded(false);
                        }}
                        className="flex-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 flex items-center justify-center gap-1"
                      >
                        <CloudLightning className="w-3 h-3" />
                        Usar remoto
                      </button>

                      <button
                        onClick={() => {
                          onResolveConflict?.(conflict, 'local');
                          setIsExpanded(false);
                        }}
                        className="flex-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Mantener local
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={onDismiss}
                className="mt-3 w-full px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && status !== 'synced' && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-xs text-gray-700 max-w-sm">
          {status === 'offline' && (
            <>
              <p className="font-semibold">ℹ️ Modo offline</p>
              <p className="mt-1">
                Estás trabajando sin conexión. Los cambios se guardarán localmente y se sincronizarán
                cuando vuelvas a estar online automáticamente.
              </p>
            </>
          )}

          {status === 'syncing' && (
            <>
              <p className="font-semibold">⏳ Sincronizando cambios...</p>
              <p className="mt-1">Los cambios se están guardando en Firestore.</p>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="font-semibold">❌ Error</p>
              <p className="mt-1">
                Hubo un problema guardando los cambios. Verifica tu conexión e intenta nuevamente.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
