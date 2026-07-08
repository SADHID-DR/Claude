# Ejercicios — App móvil (React Native + Expo)

App móvil de **ejercicios físicos**, enfocada en Android, construida con
**React Native + Expo** y **TypeScript**. Todos los datos se guardan
localmente en el dispositivo (AsyncStorage); no requiere servidor.

## Funciones

- 🏠 **Pantalla "Hoy" (coach)** — dashboard con saludo, **anillo de progreso
  semanal** (estilo Apple Fitness), **racha** de días 🔥, KPIs (entrenos,
  volumen), entrenamiento del día, WOD del día, accesos rápidos y logros.
- 💪 **Catálogo de ejercicios** — 73 ejercicios de gym y CrossFit, con muchas
  variantes de **barra, mancuernas y kettlebell**, **filtro por tipo de
  equipo** y por músculo, y **búsqueda** (por nombre o equipo). Cada ejercicio
  incluye **guía de peso/máquina** y **consejos del entrenador**.
- 🧠 **Coach premium: plan semanal / bisemanal / mensual** — genera un plan
  completo según tus **días de entrenamiento**, tu **edad** y tu **objetivo**.
  Arma el split (empuje / tirón / pierna / abdominales), mete **2 días de
  pierna** y **día de abs** cuando corresponde, y añade **cardio** (remo,
  escaladora, comba, box jumps, burpees) — de bajo impacto para edades
  mayores. Puedes indicar el **equipo disponible** (barra / mancuernas /
  kettlebell / máquina / peso corporal) y el coach solo usa esos ejercicios.
  Aplica **progresión entre semanas** (y semana de **descarga** en el
  ciclo mensual) y da una **recomendación** de días y calentamiento por edad.
- 🗓️ **Plan activo + "Hoy"** — marca un plan como activo y la pantalla Hoy te
  dice **qué toca hoy** (semana y día del ciclo), avanzando de **semana
  automáticamente** a medida que completas entrenos. **Calendario visual** del
  plan (vista mensual con los días marcados). **Recordatorios** semanales a la
  **hora que elijas**, con **aviso de prueba** que llega a un Samsung Galaxy
  Watch emparejado (reflejo de notificaciones).
- 📋 **Rutinas y planes** — crea, **genera**, **edita** (cambia los días de
  entrenamiento y el nombre sin regenerar), **duplica** o elimina; los planes
  se guardan agrupados por semana y día.
- 📝 **Notas por entreno** — al terminar registras **cómo te sentiste**
  (😫😕😐🙂💪) y una nota; se muestran en el historial, con una **gráfica de
  ánimo** a lo largo del tiempo.
- 🎨 **Ilustraciones** — cada ejercicio muestra un icono según el equipo
  (barra, mancuerna, kettlebell, máquina, peso corporal, cardio) con el color
  de su músculo.
- 📤 **Compartir progreso** — comparte un resumen (racha, entrenos, volumen,
  logros) por el menú de compartir del móvil.
- 🔥 **WODs de CrossFit** — benchmarks (Fran, Cindy, Murph, Helen, Annie,
  Grace) y WODs para empezar, con formato (AMRAP/For Time/EMOM) y escalado.
- 📈 **Progreso** — historial de entrenamientos con volumen total, más
  estadísticas y **sistema de logros/medallas** desbloqueables.
- ⏱️ **Temporizador** — descanso con presets (30–180 s), **sonido de aviso en
  los últimos 5 s** (“¡Prepárate!”) y beep final, más cronómetro.
- 📊 **Gráficas de progreso** por ejercicio (peso máximo por sesión).

### Toques de "entrenador personal" e interactividad

- 🎯 **Coach de progresión**: al entrenar pre-rellena el peso de tu última
  sesión y sugiere cuánto subir.
- ✅ **Marca cada serie** como completada durante el entrenamiento, con barra
  de progreso de la sesión.
- 📳 **Háptica** al completar series, pulsar botones y al terminar el descanso.
- ✨ **Animaciones**: anillo de progreso animado y micro-interacción de escala
  al pulsar tarjetas y botones.

Inspirado en patrones de las apps de referencia (Fitbod, Hevy, Strong, Nike
Training Club): dashboard de coach, gamificación con racha/logros, anillos de
progreso y micro-interacciones.

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
│   ├── timer.tsx            # Temporizador / cronómetro (pantalla de stack)
│   ├── (tabs)/              # Las 5 pestañas
│   │   ├── _layout.tsx      # Configuración de la barra de pestañas
│   │   ├── index.tsx        # "Hoy": dashboard de coach
│   │   ├── exercises.tsx    # Catálogo de ejercicios
│   │   ├── routines.tsx     # Lista de rutinas
│   │   ├── wods.tsx         # WODs de CrossFit
│   │   └── history.tsx      # Progreso (stats, logros e historial)
│   ├── exercise/[id].tsx    # Detalle de un ejercicio
│   ├── wod/[id].tsx         # Detalle de un WOD
│   ├── routine/new.tsx      # Crear rutina
│   └── session/[id].tsx     # Entrenar y registrar una sesión
├── src/
│   ├── components/
│   │   ├── ui.tsx           # Componentes base (Card, Button, StatTile…)
│   │   ├── ProgressRing.tsx # Anillo de progreso animado (SVG)
│   │   └── PressableScale.tsx # Pulsación con escala + háptica
│   ├── data/
│   │   ├── exercises.ts     # Catálogo de ejercicios (gym + CrossFit)
│   │   └── wods.ts          # WODs de CrossFit
│   └── lib/
│       ├── types.ts         # Tipos TypeScript
│       ├── theme.ts         # Colores, sombras y gradientes
│       ├── storage.ts       # Helpers de AsyncStorage
│       ├── store.tsx        # Estado global (Context) con persistencia
│       ├── coach.ts         # Sugerencia de peso y progresión
│       ├── stats.ts         # Racha, progreso semanal y logros
│       └── haptics.ts       # Envoltorios de háptica
├── app.json                 # Configuración de Expo
├── package.json
└── tsconfig.json
```

## Tecnología

- Expo SDK 51 · React Native 0.74 · React 18
- expo-router (navegación basada en archivos)
- react-native-svg (anillos de progreso) · expo-haptics (feedback táctil)
- AsyncStorage (persistencia local)
- TypeScript en modo estricto

## Próximas ideas

- [ ] Descanso automático al marcar una serie como completada
- [ ] Recordatorios / notificaciones de entrenamiento (y aviso al reloj)
- [ ] App para Samsung Galaxy Watch (Wear OS, proyecto nativo aparte)
- [ ] Imágenes o vídeos demostrativos de cada ejercicio
