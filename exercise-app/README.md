# Ejercicios — App móvil (React Native + Expo)

App móvil de **ejercicios físicos**, enfocada en Android, construida con
**React Native + Expo** y **TypeScript**. Todos los datos se guardan
localmente en el dispositivo (AsyncStorage); no requiere servidor.

## Funciones

- 💪 **Catálogo de ejercicios** — 15 ejercicios con grupo muscular, equipo,
  descripción e instrucciones paso a paso. Con búsqueda y filtro por músculo.
- 📋 **Rutinas personalizadas** — crea rutinas combinando ejercicios y define
  series, repeticiones y descanso para cada uno.
- 📈 **Registro de entrenamientos** — al entrenar una rutina registras el peso
  y las repeticiones de cada serie; se guarda el historial con duración y
  volumen total.
- ⏱️ **Temporizador** — temporizador de descanso con presets (30–180 s) y
  vibración al terminar, más un cronómetro para ejercicios por tiempo.

## Cómo probarla en tu Android

1. Instala las dependencias (una sola vez):
   ```bash
   npm install
   ```
2. Instala la app **Expo Go** desde Google Play en tu teléfono Android.
3. Arranca el servidor de desarrollo:
   ```bash
   npm start
   ```
4. Escanea el **código QR** que aparece en la terminal con la app Expo Go.
   La app se abrirá en tu teléfono y se recargará al guardar cambios.

> El teléfono y el ordenador deben estar en la misma red Wi-Fi.

## Generar el APK (instalable) — opcional

Para un APK instalable sin Expo Go se usa EAS Build:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Esto compila el APK en la nube de Expo y te da un enlace de descarga.

## Estructura del proyecto

```
exercise-app/
├── app/                     # Rutas (expo-router, navegación por archivos)
│   ├── _layout.tsx          # Layout raíz + proveedores
│   ├── (tabs)/              # Las 4 pestañas
│   │   ├── _layout.tsx      # Configuración de la barra de pestañas
│   │   ├── index.tsx        # Catálogo de ejercicios
│   │   ├── routines.tsx     # Lista de rutinas
│   │   ├── history.tsx      # Registro de entrenamientos
│   │   └── timer.tsx        # Temporizador / cronómetro
│   ├── exercise/[id].tsx    # Detalle de un ejercicio
│   ├── routine/new.tsx      # Crear rutina
│   └── session/[id].tsx     # Entrenar y registrar una sesión
├── src/
│   ├── components/ui.tsx    # Componentes de UI reutilizables
│   ├── data/exercises.ts    # Catálogo base de ejercicios
│   └── lib/
│       ├── types.ts         # Tipos TypeScript
│       ├── theme.ts         # Colores y espaciado
│       ├── storage.ts       # Helpers de AsyncStorage
│       └── store.tsx        # Estado global (Context) con persistencia
├── app.json                 # Configuración de Expo
├── package.json
└── tsconfig.json
```

## Tecnología

- Expo SDK 51 · React Native 0.74 · React 18
- expo-router (navegación basada en archivos)
- AsyncStorage (persistencia local)
- TypeScript en modo estricto

## Próximas ideas

- [ ] Gráficas de progreso por ejercicio
- [ ] Editar rutinas existentes
- [ ] Recordatorios / notificaciones de entrenamiento
- [ ] Imágenes o vídeos demostrativos de cada ejercicio
