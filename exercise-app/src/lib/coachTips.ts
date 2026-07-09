/**
 * Consejos técnicos del entrenador: uno distinto cada día en la pantalla
 * de inicio. Cortos, accionables y de nivel profesional.
 */
export const COACH_TIPS: { title: string; body: string }[] = [
  { title: 'Bracing', body: 'Antes de cada serie pesada: inhala al abdomen, tensa el core como si fueran a golpearte y mantén durante la repetición.' },
  { title: 'Doble progresión', body: 'Sube repeticiones dentro del rango antes de subir peso. Cuando toques el techo del rango en todas las series, añade 2,5 kg.' },
  { title: 'Tempo excéntrico', body: 'Baja el peso en 2–3 segundos controlados. La fase excéntrica es donde más se estimula el músculo.' },
  { title: 'RIR 1–2', body: 'Termina la mayoría de series dejando 1–2 repeticiones en la reserva. Fallar cada serie frena tu recuperación.' },
  { title: 'Primero lo grande', body: 'Los ejercicios multiarticulares (sentadilla, press, remo) van al principio, cuando estás fresco. Los aislamientos, al final.' },
  { title: 'Agarre firme', body: 'Aprieta la barra con fuerza: la tensión irradia por el brazo y estabiliza el hombro. Un agarre flojo pierde fuerza.' },
  { title: 'Pausa abajo', body: 'En el press de banca, una pausa de 1 s en el pecho elimina el rebote y te hace más fuerte donde más cuesta.' },
  { title: 'Rango completo', body: 'Media repetición, medio resultado. Trabaja el rango completo que tu movilidad permita con buena técnica.' },
  { title: 'Descanso real', body: 'Fuerza: 2–3 min entre series. Hipertrofia: 60–90 s. Cortar el descanso te roba repeticiones de calidad.' },
  { title: 'Escápulas', body: 'En remos y jalones, inicia el tirón retrayendo las escápulas. Piensa en llevar los codos al bolsillo, no las manos.' },
  { title: 'Pisada de tripode', body: 'En sentadilla reparte el peso entre talón, base del dedo gordo y meñique. Los dedos agarran el suelo.' },
  { title: 'Progresa el volumen', body: 'Si el peso no sube esta semana, añade una serie. Volumen total (series × reps × kg) es la vara de medir real.' },
  { title: 'Calienta específico', body: 'El cardio no calienta un press pesado: haz series de aproximación al 40 %, 60 % y 80 % del peso de trabajo.' },
  { title: 'Duerme tu PR', body: 'Con menos de 7 h de sueño tu fuerza cae hasta un 10 %. El descanso es parte del programa, no un extra.' },
  { title: 'Proteína diaria', body: 'Apunta a 1,6–2,2 g de proteína por kg de peso corporal repartida en 3–4 comidas para maximizar la síntesis muscular.' },
  { title: 'Vídeo de control', body: 'Grábate una serie pesada de perfil una vez por semana: la cámara ve los fallos técnicos que tú no sientes.' },
  { title: 'Semana de descarga', body: 'Cada 6–8 semanas, reduce el peso un 40 % durante una semana. Vuelves más fuerte y sin molestias acumuladas.' },
  { title: 'Codos en el press', body: 'En press militar y banca, los codos a ~45° del torso protegen el hombro. Abrirlos a 90° es buscar lesión.' },
  { title: 'Cardio que suma', body: 'Zona 2 (puedes hablar mientras) 2–3 veces por semana mejora tu recuperación entre series sin comerte las piernas.' },
  { title: 'La libreta manda', body: 'Registra todas las series. Lo que no se mide no progresa: tu histórico es tu mejor entrenador.' },
];

/** Consejo del día (rotación determinista por fecha). */
export function tipOfDay(date = new Date()): { title: string; body: string } {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return COACH_TIPS[dayOfYear % COACH_TIPS.length];
}
