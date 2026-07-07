import { Exercise } from '@/lib/types';

/**
 * Catálogo de ejercicios físicos, enfocado en gym (máquinas y pesos libres)
 * y CrossFit. Cada ejercicio incluye consejos del entrenador y una guía de
 * cómo elegir el peso o ajustar la máquina.
 */
export const EXERCISES: Exercise[] = [
  // ─────────────────────────────── PESO LIBRE ───────────────────────────────
  {
    id: 'ex-bench-press',
    name: 'Press de banca',
    muscle: 'Pecho',
    category: 'Peso libre',
    equipment: 'Barra + banco',
    difficulty: 'Intermedio',
    description: 'Ejercicio fundamental para pectoral, hombros y tríceps.',
    instructions: [
      'Acuéstate en el banco con los pies firmes en el suelo.',
      'Agarra la barra un poco más ancha que los hombros.',
      'Baja controlando la barra hasta el pecho.',
      'Empuja hacia arriba hasta extender los brazos.',
    ],
    coachTips: [
      'Mantén los omóplatos retraídos y el pecho hacia arriba.',
      'Las muñecas rectas y los codos a unos 75°, no abiertos del todo.',
      'Usa un compañero o pins de seguridad para las series pesadas.',
    ],
    weightGuide:
      'Empieza solo con la barra (20 kg) para dominar la técnica. Sube 2,5–5 kg cuando completes todas las series con buena forma.',
  },
  {
    id: 'ex-squat',
    name: 'Sentadilla con barra',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Barra + rack',
    difficulty: 'Intermedio',
    description: 'El rey de las piernas: cuádriceps, glúteos y femoral.',
    instructions: [
      'Coloca la barra sobre los trapecios (no el cuello).',
      'Separa los pies a la anchura de los hombros.',
      'Baja flexionando rodillas y cadera hasta el paralelo.',
      'Sube empujando con los talones.',
    ],
    coachTips: [
      'Mantén el pecho arriba y la espalda neutra durante todo el recorrido.',
      'Las rodillas van en la dirección de las puntas de los pies.',
      'Ajusta la barra del rack a la altura de tus clavículas.',
    ],
    weightGuide:
      'Practica el patrón con la barra vacía. Añade discos pequeños (1,25–2,5 kg por lado) de forma progresiva cada semana.',
  },
  {
    id: 'ex-deadlift',
    name: 'Peso muerto',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Barra',
    difficulty: 'Avanzado',
    description: 'Ejercicio de cadena posterior: femoral, glúteo y espalda.',
    instructions: [
      'Coloca los pies bajo la barra, a la anchura de la cadera.',
      'Agarra la barra con la espalda recta y el pecho arriba.',
      'Levanta extendiendo cadera y rodillas a la vez.',
      'Baja controlando manteniendo la espalda neutra.',
    ],
    coachTips: [
      'La barra debe rozar las piernas durante todo el movimiento.',
      'Aprieta el core antes de tirar, como si te fueran a dar un puñetazo.',
      'Nunca redondees la zona lumbar.',
    ],
    weightGuide:
      'Empieza ligero para grabar el patrón. Es un ejercicio muy fuerte: progresa despacio y prioriza la técnica sobre el peso.',
  },
  {
    id: 'ex-shoulder-press',
    name: 'Press militar',
    muscle: 'Hombros',
    category: 'Peso libre',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Desarrollo de los deltoides con barra, de pie.',
    instructions: [
      'De pie, sostén la barra a la altura de los hombros.',
      'Aprieta glúteos y core para estabilizar.',
      'Empuja la barra hacia arriba sobre la cabeza.',
      'Baja controlando hasta los hombros.',
    ],
    coachTips: [
      'No arquees la espalda: aprieta los glúteos.',
      'La barra termina justo sobre la coronilla, no adelante.',
    ],
    weightGuide:
      'Es un empuje débil comparado con el banca. Empieza con la barra vacía y sube de 1,25 kg por lado.',
  },
  {
    id: 'ex-bent-row',
    name: 'Remo con barra',
    muscle: 'Espalda',
    category: 'Peso libre',
    equipment: 'Barra',
    difficulty: 'Intermedio',
    description: 'Trabajo de espalda media y dorsales.',
    instructions: [
      'Inclina el torso hacia adelante con la espalda recta.',
      'Agarra la barra a la anchura de los hombros.',
      'Tira de la barra hacia el abdomen bajo.',
      'Baja controlando el movimiento.',
    ],
    coachTips: [
      'Lleva los codos hacia atrás, no hacia los lados.',
      'Aprieta las escápulas al final del tirón.',
    ],
    weightGuide:
      'Elige un peso que te permita mantener el torso estable sin balancearte para subir la barra.',
  },
  {
    id: 'ex-biceps-curl',
    name: 'Curl de bíceps con mancuernas',
    muscle: 'Brazos',
    category: 'Peso libre',
    equipment: 'Mancuernas',
    difficulty: 'Principiante',
    description: 'Aislamiento del bíceps.',
    instructions: [
      'De pie con una mancuerna en cada mano.',
      'Flexiona los codos subiendo el peso.',
      'Contrae el bíceps arriba.',
      'Baja controlando por completo.',
    ],
    coachTips: [
      'Mantén los codos pegados al cuerpo, no los adelantes.',
      'Evita balancear el tronco para ayudarte.',
    ],
    weightGuide:
      'Elige mancuernas con las que las últimas 2 repeticiones cuesten pero mantengas la forma (unas 10–12 reps).',
  },
  {
    id: 'ex-incline-db-press',
    name: 'Press inclinado con mancuernas',
    muscle: 'Pecho',
    category: 'Peso libre',
    equipment: 'Mancuernas + banco inclinado',
    difficulty: 'Intermedio',
    description: 'Enfatiza la porción superior del pectoral.',
    instructions: [
      'Ajusta el banco a unos 30–45°.',
      'Sube las mancuernas a la altura de los hombros.',
      'Empuja hacia arriba juntándolas ligeramente.',
      'Baja controlando hasta sentir estiramiento en el pecho.',
    ],
    coachTips: [
      'No bajes tanto que sientas molestia en el hombro.',
      'Un banco muy inclinado convierte el ejercicio en trabajo de hombro.',
    ],
    weightGuide:
      'Usa algo menos de peso que en el press plano. Empieza conservador porque estabilizar dos mancuernas es más difícil.',
  },
  {
    id: 'ex-hip-thrust',
    name: 'Hip thrust con barra',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Barra + banco',
    difficulty: 'Intermedio',
    description: 'El mejor ejercicio de aislamiento para glúteos.',
    instructions: [
      'Apoya la parte alta de la espalda en un banco.',
      'Coloca la barra sobre la cadera (usa almohadilla).',
      'Empuja con los talones subiendo la cadera.',
      'Aprieta los glúteos arriba y baja controlando.',
    ],
    coachTips: [
      'Termina con el tronco paralelo al suelo, sin hiperextender la lumbar.',
      'Mantén la barbilla metida mirando al frente.',
    ],
    weightGuide:
      'Los glúteos son fuertes: podrás usar más peso que en sentadilla con el tiempo. Empieza con la barra y sube por tandas.',
  },
  {
    id: 'ex-lunge',
    name: 'Zancadas con mancuernas',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Mancuernas',
    difficulty: 'Principiante',
    description: 'Trabajo unilateral de piernas y glúteos.',
    instructions: [
      'De pie con una mancuerna en cada mano.',
      'Da un paso largo hacia adelante.',
      'Baja la rodilla trasera hacia el suelo.',
      'Empuja con la pierna delantera para volver y alterna.',
    ],
    coachTips: [
      'La rodilla delantera no debe pasar mucho la punta del pie.',
      'Mantén el torso erguido durante todo el movimiento.',
    ],
    weightGuide:
      'Empieza sin peso o muy ligero hasta dominar el equilibrio, luego añade mancuernas.',
  },
  {
    id: 'ex-lateral-raise',
    name: 'Elevaciones laterales',
    muscle: 'Hombros',
    category: 'Peso libre',
    equipment: 'Mancuernas',
    difficulty: 'Principiante',
    description: 'Aislamiento del deltoides lateral, para hombros anchos.',
    instructions: [
      'De pie con una mancuerna en cada mano.',
      'Eleva los brazos lateralmente hasta la altura de los hombros.',
      'Mantén un ligero codo flexionado.',
      'Baja de forma lenta y controlada.',
    ],
    coachTips: [
      'Sube guiando con los codos, no con las manos.',
      'Usa poco peso: es un músculo pequeño, prioriza la técnica.',
    ],
    weightGuide:
      'Empieza con mancuernas ligeras (2–5 kg). Si balanceas el cuerpo, pesa demasiado.',
  },

  // ──────────────────────────────── MÁQUINAS ────────────────────────────────
  {
    id: 'ex-leg-press',
    name: 'Prensa de piernas',
    muscle: 'Piernas',
    category: 'Máquina',
    equipment: 'Máquina de prensa',
    difficulty: 'Principiante',
    description: 'Alternativa segura a la sentadilla para cargar las piernas.',
    instructions: [
      'Siéntate con la espalda y cabeza apoyadas.',
      'Coloca los pies en la plataforma a la anchura de los hombros.',
      'Quita los seguros y baja flexionando las rodillas.',
      'Empuja hasta casi extender, sin bloquear las rodillas.',
    ],
    coachTips: [
      'No dejes que la zona lumbar se despegue del respaldo al bajar.',
      'Pies más altos trabaja glúteo/femoral; más bajos, cuádriceps.',
    ],
    weightGuide:
      'Empieza con uno o dos discos por lado. Es una máquina donde puedes cargar bastante con seguridad; progresa por discos.',
  },
  {
    id: 'ex-lat-pulldown',
    name: 'Jalón al pecho (polea alta)',
    muscle: 'Espalda',
    category: 'Máquina',
    equipment: 'Polea alta',
    difficulty: 'Principiante',
    description: 'Construye dorsales anchos; base para las dominadas.',
    instructions: [
      'Ajusta la almohadilla de muslos para no elevarte.',
      'Agarra la barra más ancho que los hombros.',
      'Tira de la barra hacia la parte alta del pecho.',
      'Sube controlando hasta extender los brazos.',
    ],
    coachTips: [
      'Lleva los codos hacia abajo y atrás, aprieta la espalda.',
      'No te eches muy atrás ni uses impulso.',
    ],
    weightGuide:
      'Selecciona el pin en la placa de pesos: elige un peso que te permita 10–12 reps controladas.',
  },
  {
    id: 'ex-chest-press-machine',
    name: 'Press de pecho en máquina',
    muscle: 'Pecho',
    category: 'Máquina',
    equipment: 'Máquina de press',
    difficulty: 'Principiante',
    description: 'Empuje de pecho guiado, ideal para principiantes.',
    instructions: [
      'Ajusta el asiento para que las asas queden a la altura del pecho.',
      'Agarra las asas y aprieta el pecho.',
      'Empuja hacia adelante hasta casi extender.',
      'Vuelve controlando sin soltar la tensión.',
    ],
    coachTips: [
      'Mantén la espalda pegada al respaldo.',
      'No bloquees los codos de golpe al final.',
    ],
    weightGuide:
      'Mueve el pin en la placa. Empieza ligero para ajustar la altura del asiento y luego sube.',
  },
  {
    id: 'ex-seated-row',
    name: 'Remo sentado en polea',
    muscle: 'Espalda',
    category: 'Máquina',
    equipment: 'Polea baja',
    difficulty: 'Principiante',
    description: 'Trabajo de espalda media con agarre neutro.',
    instructions: [
      'Siéntate con las rodillas ligeramente flexionadas.',
      'Agarra el maneral con la espalda recta.',
      'Tira hacia el abdomen apretando las escápulas.',
      'Vuelve controlando sin redondear la espalda.',
    ],
    coachTips: [
      'Mantén el torso quieto; no uses la espalda baja para tirar.',
      'Aprieta 1 segundo al final del tirón.',
    ],
    weightGuide:
      'Elige un peso que puedas tirar sin balancear el tronco hacia atrás.',
  },
  {
    id: 'ex-leg-extension',
    name: 'Extensión de cuádriceps',
    muscle: 'Piernas',
    category: 'Máquina',
    equipment: 'Máquina de extensión',
    difficulty: 'Principiante',
    description: 'Aislamiento del cuádriceps.',
    instructions: [
      'Ajusta el rodillo para que quede sobre los tobillos.',
      'Alinea las rodillas con el eje de giro de la máquina.',
      'Extiende las piernas hasta arriba.',
      'Baja controlando sin soltar el peso de golpe.',
    ],
    coachTips: [
      'Aprieta el cuádriceps 1 segundo arriba.',
      'Si notas molestia en la rodilla, reduce el rango o el peso.',
    ],
    weightGuide:
      'Es un aislamiento: usa peso moderado y prioriza la contracción, 12–15 reps.',
  },
  {
    id: 'ex-leg-curl',
    name: 'Curl femoral en máquina',
    muscle: 'Piernas',
    category: 'Máquina',
    equipment: 'Máquina de curl',
    difficulty: 'Principiante',
    description: 'Aislamiento del isquiotibial (parte trasera del muslo).',
    instructions: [
      'Coloca el rodillo justo encima de los talones.',
      'Sujeta las asas y mantén la cadera pegada.',
      'Flexiona las rodillas llevando los talones al glúteo.',
      'Baja controlando.',
    ],
    coachTips: [
      'Evita levantar la cadera del asiento para hacer trampa.',
      'Controla especialmente la fase de bajada.',
    ],
    weightGuide:
      'Peso moderado, 10–15 reps. Sube el pin cuando completes todas las series con control.',
  },
  {
    id: 'ex-triceps-pushdown',
    name: 'Extensión de tríceps en polea',
    muscle: 'Brazos',
    category: 'Máquina',
    equipment: 'Polea alta + cuerda',
    difficulty: 'Principiante',
    description: 'Aislamiento del tríceps con polea.',
    instructions: [
      'Agarra la cuerda o barra en la polea alta.',
      'Pega los codos al cuerpo.',
      'Extiende los brazos hacia abajo por completo.',
      'Sube controlando hasta 90°.',
    ],
    coachTips: [
      'Solo se mueve el antebrazo; los codos quedan fijos.',
      'Con cuerda, separa las manos al final para más contracción.',
    ],
    weightGuide:
      'Peso ligero-moderado. Si los codos se despegan, baja el peso.',
  },
  {
    id: 'ex-calf-raise',
    name: 'Elevación de gemelos',
    muscle: 'Piernas',
    category: 'Máquina',
    equipment: 'Máquina de gemelos',
    difficulty: 'Principiante',
    description: 'Desarrollo de los gemelos (pantorrillas).',
    instructions: [
      'Coloca las puntas de los pies en la plataforma.',
      'Deja caer los talones para estirar.',
      'Empuja hacia arriba sobre las puntas.',
      'Aprieta arriba y baja controlando.',
    ],
    coachTips: [
      'Haz el rango completo: estira abajo y contrae arriba.',
      'Los gemelos aguantan muchas reps: 15–20 funcionan bien.',
    ],
    weightGuide:
      'Los gemelos son fuertes; podrás usar bastante peso. Prioriza el rango completo sobre cargar de más.',
  },

  // ─────────────────────────────── PESO CORPORAL ────────────────────────────
  {
    id: 'ex-pushup',
    name: 'Flexiones',
    muscle: 'Pecho',
    category: 'Peso corporal',
    equipment: 'Ninguno',
    difficulty: 'Principiante',
    description: 'Empuje de peso corporal para pecho, hombros y core.',
    instructions: [
      'Manos a la anchura de los hombros.',
      'Cuerpo recto de la cabeza a los talones.',
      'Baja el pecho hacia el suelo doblando los codos.',
      'Empuja hasta extender los brazos.',
    ],
    coachTips: [
      'Aprieta el core y los glúteos, no dejes caer la cadera.',
      'Si cuesta, apoya las rodillas o eleva las manos en un banco.',
    ],
    weightGuide:
      'Regula la dificultad con la inclinación. Para más carga, coloca un disco sobre la espalda o eleva los pies.',
  },
  {
    id: 'ex-pullup',
    name: 'Dominadas',
    muscle: 'Espalda',
    category: 'Peso corporal',
    equipment: 'Barra fija',
    difficulty: 'Avanzado',
    description: 'Rey de la tracción para dorsales y bíceps.',
    instructions: [
      'Agarra la barra con las palmas hacia afuera.',
      'Cuelga con los brazos extendidos y el core firme.',
      'Tira hacia arriba hasta pasar la barbilla la barra.',
      'Baja de forma controlada.',
    ],
    coachTips: [
      'Aprieta las escápulas antes de tirar.',
      'Evita balancearte; sube con la espalda, no solo con los brazos.',
    ],
    weightGuide:
      'Si no llegas a una, usa banda elástica o la máquina asistida. Cuando hagas 10+, añade lastre con cinturón.',
  },
  {
    id: 'ex-triceps-dip',
    name: 'Fondos de tríceps',
    muscle: 'Brazos',
    category: 'Peso corporal',
    equipment: 'Banco o paralelas',
    difficulty: 'Intermedio',
    description: 'Empuje de peso corporal para tríceps y pecho.',
    instructions: [
      'Apóyate en unas paralelas o un banco.',
      'Baja el cuerpo doblando los codos.',
      'Empuja hacia arriba hasta extender los brazos.',
      'Mantén los codos cerca del cuerpo.',
    ],
    coachTips: [
      'No bajes más de 90° si sientes molestia en el hombro.',
      'Inclínate adelante para más pecho, vertical para más tríceps.',
    ],
    weightGuide:
      'Progresa de fondos en banco a paralelas. Añade lastre cuando domines el peso corporal.',
  },
  {
    id: 'ex-plank',
    name: 'Plancha',
    muscle: 'Core',
    category: 'Peso corporal',
    equipment: 'Ninguno',
    difficulty: 'Principiante',
    description: 'Ejercicio isométrico para todo el core.',
    instructions: [
      'Apoya antebrazos y puntas de los pies.',
      'Mantén el cuerpo recto y firme.',
      'Contrae abdomen y glúteos.',
      'Aguanta el tiempo indicado respirando.',
    ],
    coachTips: [
      'No subas ni hundas la cadera.',
      'Mejor 30 s perfectos que 2 min con la técnica rota.',
    ],
    weightGuide:
      'Progresa por tiempo. Para más reto, apoya un pie o coloca un disco sobre la espalda.',
  },
  {
    id: 'ex-crunch',
    name: 'Abdominales (crunch)',
    muscle: 'Core',
    category: 'Peso corporal',
    equipment: 'Ninguno',
    difficulty: 'Principiante',
    description: 'Trabajo del recto abdominal.',
    instructions: [
      'Boca arriba con las rodillas flexionadas.',
      'Manos en el pecho o al lado de la cabeza.',
      'Eleva los hombros contrayendo el abdomen.',
      'Baja de forma controlada.',
    ],
    coachTips: [
      'No tires del cuello con las manos.',
      'El movimiento es corto: enrolla la columna, no subas entero.',
    ],
    weightGuide:
      'Añade dificultad sujetando un disco en el pecho cuando 20 reps sean fáciles.',
  },

  // ──────────────────────────────── CROSSFIT ────────────────────────────────
  {
    id: 'ex-air-squat',
    name: 'Air squat (sentadilla libre)',
    muscle: 'Piernas',
    category: 'CrossFit',
    equipment: 'Peso corporal',
    difficulty: 'Principiante',
    description: 'Base de la sentadilla en CrossFit, sin peso.',
    instructions: [
      'Pies a la anchura de los hombros.',
      'Baja la cadera por debajo de las rodillas.',
      'Mantén el pecho arriba y los talones en el suelo.',
      'Sube extendiendo cadera y rodillas.',
    ],
    coachTips: [
      'Abre las rodillas hacia afuera al bajar.',
      'Debe ser fluida y rápida en los WODs.',
    ],
    weightGuide:
      'Sin material. Domina la profundidad completa antes de añadir carga (thruster, wall ball).',
  },
  {
    id: 'ex-thruster',
    name: 'Thruster',
    muscle: 'Cuerpo completo',
    category: 'CrossFit',
    equipment: 'Barra o mancuernas',
    difficulty: 'Intermedio',
    description: 'Sentadilla frontal + press: movimiento estrella de CrossFit.',
    instructions: [
      'Sostén la barra en los hombros (front rack).',
      'Haz una sentadilla frontal completa.',
      'Al subir, impulsa la barra sobre la cabeza.',
      'Baja la barra a los hombros y encadena la siguiente.',
    ],
    coachTips: [
      'Usa el impulso de las piernas para ayudar al press.',
      'Codos altos en la sentadilla, mantén el pecho arriba.',
    ],
    weightGuide:
      'Empieza con barra vacía (o 20/15 kg). En los WODs prima poder repetir sin fallar: elige un peso ligero-moderado.',
  },
  {
    id: 'ex-kb-swing',
    name: 'Kettlebell swing',
    muscle: 'Cuerpo completo',
    category: 'CrossFit',
    equipment: 'Kettlebell',
    difficulty: 'Principiante',
    description: 'Balanceo explosivo de cadera para potencia y cardio.',
    instructions: [
      'Pies algo más anchos que los hombros, kettlebell delante.',
      'Lleva la cadera atrás y agarra la pesa.',
      'Impulsa con la cadera para lanzar la pesa al frente.',
      'Deja caer y encadena en un ritmo continuo.',
    ],
    coachTips: [
      'La fuerza viene de la cadera, no de los brazos.',
      'Aprieta glúteos y core en el punto alto.',
    ],
    weightGuide:
      'Estándar CrossFit: 24 kg hombres / 16 kg mujeres. Empieza con 12–16 kg para aprender el patrón.',
  },
  {
    id: 'ex-wall-ball',
    name: 'Wall ball',
    muscle: 'Cuerpo completo',
    category: 'CrossFit',
    equipment: 'Balón medicinal',
    difficulty: 'Intermedio',
    description: 'Sentadilla + lanzamiento del balón a una diana en la pared.',
    instructions: [
      'Sujeta el balón a la altura del pecho.',
      'Haz una sentadilla completa.',
      'Al subir, lanza el balón a la diana (~3 m).',
      'Recíbelo y encadena la siguiente sentadilla.',
    ],
    coachTips: [
      'Usa el impulso de las piernas para lanzar, no los brazos.',
      'Respira arriba, entre lanzamiento y recepción.',
    ],
    weightGuide:
      'Estándar: 9 kg hombres / 6 kg mujeres a diana de 3 m / 2,7 m. Empieza con 4–6 kg.',
  },
  {
    id: 'ex-box-jump',
    name: 'Box jump (salto al cajón)',
    muscle: 'Piernas',
    category: 'CrossFit',
    equipment: 'Cajón pliométrico',
    difficulty: 'Intermedio',
    description: 'Salto explosivo a un cajón para potencia de piernas.',
    instructions: [
      'Colócate frente al cajón a un paso de distancia.',
      'Flexiona ligeramente y salta con ambos pies.',
      'Aterriza suave con las rodillas flexionadas.',
      'Extiende la cadera arriba y baja (o salta hacia atrás).',
    ],
    coachTips: [
      'Aterriza con toda la planta del pie, no de puntillas.',
      'Si dudas, usa un cajón más bajo: la caída es el mayor riesgo.',
    ],
    weightGuide:
      'Regula la intensidad con la altura del cajón: 50–60 cm para empezar, 60/75 cm es el estándar Rx.',
  },
  {
    id: 'ex-double-under',
    name: 'Double under (doble con cuerda)',
    muscle: 'Cardio',
    category: 'CrossFit',
    equipment: 'Comba',
    difficulty: 'Avanzado',
    description: 'La cuerda pasa dos veces por salto: cardio intenso.',
    instructions: [
      'Salta un poco más alto de lo normal, manteniéndote recto.',
      'Gira la cuerda solo con las muñecas, rápido.',
      'Haz que la cuerda pase dos veces en cada salto.',
      'Mantén un ritmo constante.',
    ],
    coachTips: [
      'Codos pegados al cuerpo; el giro es de muñeca, no de brazo.',
      'Empieza practicando 1 doble entre saltos simples.',
    ],
    weightGuide:
      'Sin peso. Ajusta la cuerda a tu altura: pisada en el centro, los mangos llegan a las axilas.',
  },
  {
    id: 'ex-clean',
    name: 'Cargada (power clean)',
    muscle: 'Cuerpo completo',
    category: 'CrossFit',
    equipment: 'Barra',
    difficulty: 'Avanzado',
    description: 'Levantamiento olímpico: del suelo a los hombros.',
    instructions: [
      'Barra sobre el medio del pie, agarre a la anchura de hombros.',
      'Tira del suelo extendiendo cadera y rodillas con fuerza.',
      'Encoge los hombros y baja bajo la barra.',
      'Recíbela en los hombros en semisentadilla y levántate.',
    ],
    coachTips: [
      'Es técnica antes que fuerza: aprende con barra o PVC.',
      'La barra sube pegada al cuerpo; extiende del todo la cadera.',
    ],
    weightGuide:
      'Domina la técnica con barra vacía. Es un levantamiento avanzado: idealmente aprende con un coach presencial.',
  },
  {
    id: 'ex-toes-to-bar',
    name: 'Toes to bar',
    muscle: 'Core',
    category: 'CrossFit',
    equipment: 'Barra fija',
    difficulty: 'Avanzado',
    description: 'Colgado de la barra, llevas los pies a tocarla.',
    instructions: [
      'Cuélgate de la barra con agarre firme.',
      'Genera un balanceo controlado (kipping).',
      'Lleva las puntas de los pies a tocar la barra.',
      'Baja con control y encadena.',
    ],
    coachTips: [
      'Aprieta el core; el movimiento nace de la cadera.',
      'Progresa desde elevaciones de rodillas si no llegas.',
    ],
    weightGuide:
      'Sin peso. Regresión: knees to elbows o elevaciones de rodillas colgado.',
  },
  {
    id: 'ex-burpee',
    name: 'Burpees',
    muscle: 'Cuerpo completo',
    category: 'CrossFit',
    equipment: 'Peso corporal',
    difficulty: 'Intermedio',
    description: 'Ejercicio de cuerpo completo de alta intensidad.',
    instructions: [
      'Desde de pie, baja a cuclillas y apoya las manos.',
      'Lleva los pies atrás a posición de plancha.',
      'Pecho al suelo, vuelve con los pies adelante.',
      'Salta arriba con las manos por encima de la cabeza.',
    ],
    coachTips: [
      'Busca un ritmo sostenible desde el principio; no salgas a tope.',
      'Respira de forma constante para no fundirte.',
    ],
    weightGuide:
      'Sin material. Regula la intensidad con el ritmo; en WODs largos, ve a paso constante.',
  },

  // ──────────────────────────────── CARDIO ─────────────────────────────────
  {
    id: 'ex-rowing',
    name: 'Remo en ergómetro',
    muscle: 'Cardio',
    category: 'Máquina',
    equipment: 'Remo (Concept2)',
    difficulty: 'Principiante',
    description: 'Cardio de cuerpo completo muy usado en CrossFit.',
    instructions: [
      'Sujeta el mango con los brazos estirados y rodillas flexionadas.',
      'Empuja fuerte con las piernas.',
      'Inclina ligeramente el torso y tira con los brazos.',
      'Vuelve en orden inverso: brazos, torso, piernas.',
    ],
    coachTips: [
      'El 60% del empuje viene de las piernas.',
      'Damper 4–6 es un buen ajuste para la mayoría.',
    ],
    weightGuide:
      'No hay peso: ajusta el "damper" (palanca lateral) para la resistencia del aire, entre 1 y 10.',
  },
  {
    id: 'ex-running',
    name: 'Carrera continua',
    muscle: 'Cardio',
    category: 'Peso corporal',
    equipment: 'Ninguno o cinta',
    difficulty: 'Principiante',
    description: 'Cardio de resistencia.',
    instructions: [
      'Calienta con trote suave 5 minutos.',
      'Mantén un ritmo constante y sostenible.',
      'Respira de forma rítmica.',
      'Enfría reduciendo el ritmo gradualmente.',
    ],
    coachTips: [
      'Aterriza con el pie bajo la cadera, no por delante.',
      'Mantén los hombros relajados.',
    ],
    weightGuide:
      'Sin peso. En cinta, regula velocidad e inclinación para ajustar la intensidad.',
  },
  {
    id: 'ex-stair-climber',
    name: 'Escaladora',
    muscle: 'Cardio',
    category: 'Máquina',
    equipment: 'Escaladora (stepper)',
    difficulty: 'Principiante',
    lowImpact: true,
    description: 'Cardio de bajo impacto que trabaja piernas y glúteos.',
    instructions: [
      'Sube a la máquina y agárrate ligeramente al pasamanos.',
      'Mantén el torso erguido, no te cuelgues de los brazos.',
      'Pisa con toda la planta a un ritmo constante.',
      'Respira de forma controlada.',
    ],
    coachTips: [
      'No te apoyes en las barras: resta trabajo a las piernas.',
      'Ideal para quemar sin castigar las articulaciones.',
    ],
    weightGuide: 'Sin peso: ajusta el nivel/velocidad de la máquina.',
  },
  {
    id: 'ex-jump-rope',
    name: 'Saltar la cuerda (comba)',
    muscle: 'Cardio',
    category: 'Peso corporal',
    equipment: 'Comba',
    difficulty: 'Principiante',
    description: 'Cardio ágil que mejora coordinación y resistencia.',
    instructions: [
      'Gira la cuerda con las muñecas, codos pegados.',
      'Salta bajo, apenas despegando del suelo.',
      'Cae sobre la punta de los pies.',
      'Mantén un ritmo constante.',
    ],
    coachTips: [
      'Empieza con intervalos de 30–60 s.',
      'Mira al frente, no a los pies.',
    ],
    weightGuide: 'Sin peso. Ajusta la cuerda: pisada al centro, mangos a las axilas.',
  },
  {
    id: 'ex-mountain-climber',
    name: 'Mountain climbers',
    muscle: 'Cardio',
    category: 'Peso corporal',
    equipment: 'Peso corporal',
    difficulty: 'Principiante',
    description: 'Cardio y core: rodillas al pecho en posición de plancha.',
    instructions: [
      'Colócate en posición de plancha alta.',
      'Lleva una rodilla hacia el pecho.',
      'Cambia de pierna rápidamente, como si corrieras.',
      'Mantén la cadera baja y el core firme.',
    ],
    coachTips: [
      'No subas la cadera al acelerar.',
      'Controla la respiración para aguantar más.',
    ],
    weightGuide: 'Sin peso: regula la intensidad con la velocidad.',
  },
  {
    id: 'ex-hammer-curl',
    name: 'Curl martillo',
    muscle: 'Brazos',
    category: 'Peso libre',
    equipment: 'Mancuernas',
    difficulty: 'Principiante',
    subgroup: 'Bíceps',
    description: 'Variante de curl con agarre neutro; bíceps y antebrazo.',
    instructions: [
      'De pie con una mancuerna en cada mano, palmas enfrentadas.',
      'Flexiona los codos manteniendo el agarre neutro.',
      'Contrae arriba.',
      'Baja controlando.',
    ],
    coachTips: [
      'Codos quietos pegados al cuerpo.',
      'Evita balancear el tronco.',
    ],
    weightGuide: 'Peso con el que hagas 10–12 reps limpias.',
  },
  {
    id: 'ex-overhead-triceps',
    name: 'Extensión de tríceps sobre la cabeza',
    muscle: 'Brazos',
    category: 'Peso libre',
    equipment: 'Mancuerna',
    difficulty: 'Principiante',
    subgroup: 'Tríceps',
    description: 'Aislamiento del tríceps con estiramiento completo.',
    instructions: [
      'Sujeta una mancuerna con ambas manos por encima de la cabeza.',
      'Baja el peso por detrás de la nuca flexionando los codos.',
      'Extiende los brazos hacia arriba.',
      'Mantén los codos apuntando al frente.',
    ],
    coachTips: [
      'Solo se mueven los antebrazos.',
      'No abras los codos hacia los lados.',
    ],
    weightGuide: 'Empieza ligero: el hombro en flexión es una posición sensible.',
  },
  {
    id: 'ex-rdl',
    name: 'Peso muerto rumano',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Barra o mancuernas',
    difficulty: 'Intermedio',
    subgroup: 'Posterior',
    description: 'Enfoca femoral y glúteo con bisagra de cadera.',
    instructions: [
      'De pie con la barra a la altura de los muslos.',
      'Lleva la cadera atrás bajando la barra pegada a las piernas.',
      'Baja hasta sentir estiramiento en el femoral.',
      'Vuelve extendiendo la cadera.',
    ],
    coachTips: [
      'Rodillas casi fijas: el movimiento es de cadera.',
      'Espalda recta en todo el recorrido.',
    ],
    weightGuide: 'Prioriza sentir el femoral sobre cargar mucho peso.',
  },
  {
    id: 'ex-bulgarian-split',
    name: 'Sentadilla búlgara',
    muscle: 'Piernas',
    category: 'Peso libre',
    equipment: 'Mancuernas + banco',
    difficulty: 'Intermedio',
    subgroup: 'Cuádriceps',
    description: 'Trabajo unilateral intenso de cuádriceps y glúteo.',
    instructions: [
      'Apoya el empeine de un pie en un banco detrás de ti.',
      'Baja flexionando la pierna delantera.',
      'La rodilla trasera va hacia el suelo.',
      'Sube empujando con el talón delantero.',
    ],
    coachTips: [
      'Mantén el torso ligeramente inclinado adelante.',
      'Empieza sin peso para dominar el equilibrio.',
    ],
    weightGuide: 'Empieza con peso corporal, luego añade mancuernas ligeras.',
  },
  {
    id: 'ex-hanging-leg-raise',
    name: 'Elevación de piernas colgado',
    muscle: 'Core',
    category: 'Peso corporal',
    equipment: 'Barra fija',
    difficulty: 'Intermedio',
    description: 'Trabajo intenso del abdomen inferior.',
    instructions: [
      'Cuélgate de una barra con los brazos extendidos.',
      'Eleva las piernas rectas o las rodillas al pecho.',
      'Contrae el abdomen arriba.',
      'Baja controlando sin balancearte.',
    ],
    coachTips: [
      'Evita el balanceo; el movimiento nace del abdomen.',
      'Si cuesta, empieza con rodillas flexionadas.',
    ],
    weightGuide: 'Peso corporal. Progresa de rodillas a piernas rectas.',
  },
  {
    id: 'ex-russian-twist',
    name: 'Giro ruso (russian twist)',
    muscle: 'Core',
    category: 'Peso corporal',
    equipment: 'Disco o balón (opcional)',
    difficulty: 'Principiante',
    description: 'Trabajo de los oblicuos con rotación del tronco.',
    instructions: [
      'Siéntate con las rodillas flexionadas y el torso inclinado atrás.',
      'Junta las manos o sujeta un disco.',
      'Gira el tronco tocando a un lado y al otro.',
      'Mantén el abdomen contraído.',
    ],
    coachTips: [
      'Gira desde el tronco, no solo con los brazos.',
      'Para más reto, eleva los pies del suelo.',
    ],
    weightGuide: 'Empieza sin peso; añade un disco ligero cuando domines el giro.',
  },
];

// Subgrupos y cardio de bajo impacto (asignados de forma centralizada).
const SUBGROUPS: Record<string, Exercise['subgroup']> = {
  'ex-biceps-curl': 'Bíceps',
  'ex-triceps-dip': 'Tríceps',
  'ex-triceps-pushdown': 'Tríceps',
  'ex-squat': 'Cuádriceps',
  'ex-leg-press': 'Cuádriceps',
  'ex-leg-extension': 'Cuádriceps',
  'ex-lunge': 'Cuádriceps',
  'ex-deadlift': 'Posterior',
  'ex-hip-thrust': 'Posterior',
  'ex-leg-curl': 'Posterior',
  'ex-calf-raise': 'Gemelo',
};
const LOW_IMPACT = new Set(['ex-rowing']);
for (const e of EXERCISES) {
  if (SUBGROUPS[e.id]) e.subgroup = SUBGROUPS[e.id];
  if (LOW_IMPACT.has(e.id)) e.lowImpact = true;
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}
