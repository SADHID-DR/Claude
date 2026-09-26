# Auditoría de prompts — MARESNOMINAS

## Supuestos declarados (paso 0)

**Proveedor.** El repositorio no llama a Claude. Llama a Google Gemini vía `@google/genai` (`server.ts:6,45,402`), y `check_ollama.py` sondea un Ollama local. La auditoría corre igual: busca instrucciones fechadas, hechos que el código ya contradice, reglas que se pisan entre sí. No propone migrar nada al SDK de Anthropic.

**Alcance.** Todo el directorio de trabajo. Superficie de prompt encontrada en 3 archivos:

| Sitio | Qué es | Líneas |
|---|---|---|
| `server.ts:210-393` | `systemInstruction` único, aplica a las 3 rutas | 1.845 palabras |
| `server.ts:83-105,207,396-433` | ensamblado de `parts`, contexto de estado, config de request, lazo de reintentos | — |
| `src/components/ProductionSheetsTab.tsx:656-693` | prompt de auditoría de costos por hoja | — |
| `src/components/ProductionSheetsTab.tsx:817-837` | prompt de sugerencia de precio por renglón | — |
| `src/components/AiChatTab.tsx:400-404` | prompt de detección de anomalías | — |
| `AiChatTab.tsx:616-637`, `ProductionSheetsTab.tsx:786-799,928-931` | parseo de la respuesta | — |

Sin `CLAUDE.md`, sin `AGENTS.md`, sin `.claude/`, sin skills, sin declaraciones de herramientas. No se leyeron archivos de credenciales ni de settings.

**Modelo objetivo.** `gemini-2.5-flash`, con `gemini-2.5-pro` como respaldo ante 503 (`server.ts:397,425`). Ningún documento de migración en el repo apunta a otro.

**Procedencia.** Inútil. El historial está aplastado: los 3 sitios de prompt entraron completos en `b4eb22a` (2026-06-21), `git blame` no distingue líneas. Consecuencia directa: varios hallazgos de idiomática quedan en confianza media o baja, no alta.

---

## Resumen

Lo de mayor impacto no es un patrón viejo de prompting. Es que la aplicación pide JSON en prosa y lo recorta con `indexOf` y `substring` sobre offsets literales (`+22`, `+29`) más un `match(/\{[\s\S]*?\}/)` no voraz, existiendo `responseMimeType` y `responseSchema` en el SDK que ya está instalado. Cuando el modelo mueve una llave, la extracción devuelve `null` en silencio y el usuario ve el texto sin que se aplique ninguna acción.

Segundo: el lazo de reintentos de `server.ts:400` reintenta cualquier error. Un 400 de validación consume 5 intentos con espera 2s/4s/8s/16s antes de rendirse, ~30s colgado del handler HTTP para devolver el mismo error de la primera vez.

Tercero: la interfaz anuncia "Gemini 3.5 Flash Activo" mientras el servidor manda `gemini-2.5-flash`. El repositorio se contradice a sí mismo en la única línea que el operador lee.

**Conteo.** Grupo 1 (texto fechado): 5. Grupo 2 (hechos rancios y contradicciones): 2. Grupo 3 (descripciones de herramientas): no aplica, no hay `functionDeclarations` ni `tools` en ninguna llamada. Grupo 4 (config de request y arquitectura): 5.

---

## Hallazgos — confianza alta

### A1 · Etiqueta de modelo que el código desmiente

- **Ubicación:** `src/components/AiChatTab.tsx:1438`
- **Evidencia:** `<span>Gemini 3.5 Flash Activo</span>`
- **Patrón:** grupo 2, especificidades volátiles sin fecha de verificación
- **Por qué:** `server.ts:397` envía `gemini-2.5-flash`. La etiqueta es el único lugar donde el operador ve qué modelo corre y afirma otro. [Certain] el repositorio se contradice.
- **Confianza:** alta (contradicción interna verificable)
- **Acción:** `rewrite` → `Gemini 2.5 Flash Activo`. Arreglo duradero, fuera de este parche: que `/api/gemini/analyze` devuelva `model: currentModel` en el JSON y que el cliente pinte ese valor. Mientras la cadena esté escrita a mano, vuelve a rancharse en el próximo cambio de modelo.

### A2 · El lazo de reintentos reintenta lo no reintentable

- **Ubicación:** `server.ts:396-433`
- **Evidencia:** `let retries = 5;` … `catch (error: any) { retries--; … if (retries === 0) throw error; … delay *= 2; }` sin discriminar `status`
- **Patrón:** grupo 4, rutas de reintento muertas
- **Por qué:** [Certain] un `INVALID_ARGUMENT`, una clave inválida o un mime no soportado devuelven idéntico resultado en el intento 5 que en el 1. El código los reintenta igual, con espera acumulada de ~30s dentro del handler. El usuario recibe el error medio minuto tarde.
- **Confianza:** alta (mecánica del código, no inferencia de comportamiento)
- **Acción:** `rewrite`. Hunk en el parche: predicado `isRetryable` (429, 500, 503, 504, `UNAVAILABLE`, `RESOURCE_EXHAUSTED`, `INTERNAL`), `MAX_ATTEMPTS = 4`, lanza inmediato lo demás. Corrige de paso dos defectos del original: la condición `retries <= 3` nunca disparaba el respaldo en el primer 503, y `delay = 1000` reiniciaba el backoff al cambiar de modelo.

### A3 · JSON pedido en prosa y recortado con offsets

- **Ubicación:** `server.ts:239-377` (catálogo de acciones), `ProductionSheetsTab.tsx:682-693`, `AiChatTab.tsx:616-637`, `ProductionSheetsTab.tsx:786-799`, `ProductionSheetsTab.tsx:928-931`
- **Evidencia:** `` ```json:extracted_data `` pedido en el prompt; `answer.indexOf('```json:extracted_data')` con `offset = 22`; `txt.indexOf("```json:price_recommendations")` con `blockStart + 29`; `txt.match(/\{[\s\S]*?\}/)`
- **Patrón:** grupo 1b, andamio de "devuelve sólo JSON" sustituido por salida estructurada
- **Por qué:** `grep responseMimeType|responseSchema` sobre todo el repo: cero resultados. El contrato de datos vive en comentarios de un template string de 155 líneas y se recupera con aritmética de posiciones. [Certain] el `match` no voraz corta en la primera `}`, así que cualquier objeto anidado en la sugerencia de precio se trunca y `JSON.parse` revienta dentro de un `try` que sólo hace `console.error`. La acción del usuario se pierde sin aviso.
- **Confianza:** alta (patrón documentado, y el fallo silencioso es verificable leyendo el `catch`)
- **Acción:** `replace-with-API-feature`. **Fuera del parche mecánico, a propósito.** Toca 4 archivos y no hay `node_modules` en este contenedor, así que no puedo pasarle `tsc --noEmit` ni una prueba de comportamiento. Entregar un refactor transversal sin compilar es peor que especificarlo. Cambio concreto:
  1. `/api/gemini/analyze` acepta `responseSchema` opcional en el body y lo pasa a `config` junto a `responseMimeType: "application/json"`.
  2. Los 3 sitios de llamada mandan su esquema: el catálogo de acciones (`contractors`, `productionRows`, `actions`), `price_recommendations` (arreglo de `{rowId, suggestedPrice, suggestedUnit, reason}`), y el objeto plano `{suggestedPrice, suggestedUnit, reason}`.
  3. Los 3 parseos se vuelven `JSON.parse(resData.text)` directo. Se borran los offsets `22` y `29`, el regex, y los `catch` que tragan el error.
  4. El texto conversacional deja de compartir turno con el JSON: pide dos campos en el esquema (`respuesta`, `acciones`) o dos llamadas.
  5. Al entrar esto, el catálogo de 155 líneas sale del `systemInstruction`. Es el mismo contrato duplicado en prosa. Eso solo recorta ~1.100 palabras de cada request.
  6. Regla de cierre del paso 6 de la guía: después del cambio, ninguna rama del código puede seguir emitiendo la forma vieja. Hay que revisar el fallback `answer.indexOf('```json')` de `AiChatTab.tsx:628`, que existe sólo para servir al mecanismo viejo.

---

## Hallazgos — confianza media

### M1 · Encabezados escritos como diff contra una versión anterior

- **Ubicación:** `server.ts:215`, `server.ts:219`
- **Evidencia:** `NUEVA DIRECTRIZ CRÍTICA:` · `NUEVOS CONCEPTOS APLICABLES EN LA APP:`
- **Patrón:** grupo 1d, fraseo relativo a una migración
- **Por qué:** "nueva" y "nuevos" son un diff contra un prompt que el modelo nunca vio. Implican una directriz anterior fantasma y jerarquizan por antigüedad, no por importancia. Lo nuevo hoy es lo viejo en tres meses y nadie renombra el encabezado.
- **Confianza:** media (fila documentada, sin procedencia que la refuerce)
- **Acción:** `rewrite` → `ALCANCE Y REGISTRO:` y `CONCEPTOS DEL DOMINIO:`

### M2 · Sólo viñetas, dicho dos veces, subiendo el volumen

- **Ubicación:** `server.ts:217` y `server.ts:380`
- **Evidencia:** `Tus respuestas en el chat DEBEN SER EXTREMADAMENTE BREVES, usando ÚNICAMENTE viñetas … NADA de rodeos` · `TUS RESPUESTAS DEBEN SER MUY BREVES Y ORGANIZADAS EN BULLET POINTS (viñetas) para máxima claridad y concisión. Evita completamente párrafos largos`
- **Patrón:** grupo 1c relleno por repetición, grupo 1f coreografía de salida
- **Por qué:** la misma regla en dos redacciones distintas obliga al modelo a reconciliarlas. El mandato de viñeta exclusiva es el daño real: una discrepancia de precio necesita el razonamiento que la viñeta amputa, y el auditor de costos de `AiChatTab.tsx:400` ya pide tabla, formato que la regla prohíbe.
- **Confianza:** media
- **Acción:** `rewrite`. Una sola formulación, con el motivo pegado ("el operador consulta desde obra"), viñeta para pasos y confirmaciones, prosa breve para cálculos y discrepancias.

### M3 · Prioridad de precios contradicha dentro del mismo request

- **Ubicación:** `server.ts:231-232`, contra `ProductionSheetsTab.tsx:833-835`
- **Evidencia:** regla 3 `Cuando la partida no figure en los "Acuerdos de Precios Específicos" … extrae y sugiere la tarifa … de la Guía Base` · regla 4 `Prioriza siempre la Guía de Precios Base si la partida evaluada se sale de lo acordado` · prompt del cliente `1. De existir un Acuerdo de Precios Específico … utilízalo. 2. Si NO tiene acuerdos … DEBES basarte en la Guía Base`
- **Patrón:** grupo 2, archivos de instrucción que se contradicen en el mismo punto
- **Por qué:** el `systemInstruction` viaja en las tres rutas, así que la regla 4 y el paso 1 del cliente llegan juntas al modelo. "Prioriza siempre la Guía" leído literal invierte el orden que las otras dos formulaciones establecen. En una obra dominicana eso significa cubicar al precio corporativo a un contratista que tiene tarifa firmada distinta. [Likely] el autor quiso decir lo mismo que la regla 3 y la redundancia se desvió.
- **Confianza:** media
- **Acción:** `rewrite`. Regla única de prioridad de fuentes, con la obligación de declarar cuál se aplicó.

### M4 · La regla de cantidades, tres veces, tres redacciones

- **Ubicación:** `server.ts:233-237`, `server.ts:246-247`, `server.ts:382`
- **Evidencia:** `5. PARSEO CRÍTICO DE CANTIDADES ESTIMADAS VS AVANCE DE OBRA (%)` · `"quantityEstim": 40, // EXTREMADAMENTE IMPORTANTE: …` y `"quantityActual": 8, // EXTREMADAMENTE IMPORTANTE: …` · `Asigna las cantidades correctas: toda columna que diga 'Presupuestado' … NUNCA asumas 0 para el actual`
- **Patrón:** grupo 1c cerca-duplicados entre secciones, grupo 2 la información vive en un solo lugar
- **Por qué:** cada copia trae un fragmento distinto (el porcentaje, la semántica de campo, las heurísticas de rótulo de columna) y ninguna trae todo. Nada indica cuál gobierna. El énfasis en mayúsculas sobre dos campos deja de señalar cuando compite con 22 marcas más en el mismo prompt.
- **Confianza:** media
- **Acción:** `rewrite`. Consolidar en la regla 4 con el motivo explícito (la app calcula retención sobre lo ejecutado), los rótulos de columna, el caso porcentual, y la prohibición de asumir 0. Los comentarios del esquema quedan como descripción de campo. **Conservado:** `NUNCA asumas 0 para el actual si hay datos sugerentes` codifica una restricción real del negocio, sobrevive reformulada.

### M5 · Una instrucción con una palabra sin significado

- **Ubicación:** `server.ts:388`
- **Evidencia:** `… es un 'soporte de medición' (o similar) para una partida NAVEGA, NO vayas a listar las mediciones/tramos como múltiples 'productionRows'`
- **Patrón:** grupo 1d, reglas cuyo motivo nadie recuerda
- **Por qué:** `grep -i navega` sobre `src/` y `server.ts` no devuelve ningún concepto de la aplicación con ese nombre, sólo "navegador" en mensajes de UI. [Likely] corrupción de "NUEVA": la línea 387 cubre el caso de partida existente vía `UPDATE_MEASUREMENT_SUPPORT`, esta cubre el de partida nueva, y esa lectura cierra el par. El modelo tiene que adivinar qué es una partida NAVEGA.
- **Confianza:** media
- **Acción:** `rewrite` → `para una partida NUEVA, no listes …`. Si el autor quiso decir otra cosa, este hallazgo es el que hay que rechazar primero.

---

## Hallazgos — confianza baja, sólo señalados

### B1 · `temperature: 0.2` sin justificación registrada, y ninguna config de pensamiento ni de tokens de salida

`server.ts:407`. `grep thinkingConfig|thinkingBudget|maxOutputTokens` en todo el repo: cero. Una temperatura baja en extracción es una decisión de ingeniería defendible, no un fósil, y no la toco: no puedo atarla a un comportamiento documentado del modelo objetivo. Queda como `flag` con una condición: re-medirla cuando entre A3, porque con `responseSchema` la temperatura deja de cargar la validez del formato. El tope de tokens de salida hay que fijarlo contra la documentación de la serie 2.5, no contra mi memoria.

### B2 · Un modelo haciendo un plan determinista

`ProductionSheetsTab.tsx:817-837`. Tres sitios de llamada al modelo en la app. Este es una búsqueda en tabla: descripción del renglón contra acuerdos del contratista, con la Guía Base como respaldo. La parte genuinamente adaptativa es una sola, reconocer sinónimos técnicos ("empañete" contra "repello"). Lo demás sale en código: match exacto primero, modelo sólo para el resto sin coincidencia. Recorta latencia, costo, y una alerta `alert()` de error por renglón. No propongo el diff: define un comportamiento nuevo y hay que medirlo antes.

### B3 · Bytes por request encima de todo lo estable

`server.ts:83-105`. Los `inlineData` de archivos se empujan a `parts[0]`, antes del contexto. El `systemInstruction` va aparte y es estable, eso está bien. Reordenar para que lo volátil quede al final es la condición previa a cualquier caché de contexto. Sin medición no hay número que ofrecer.

### B4 · Sin contabilidad de tokens

Ningún sitio registra `usageMetadata`. Cada estimación de arriba es cualitativa por eso. Registrar tokens de entrada y salida por ruta es lo primero, antes de tocar B1, B2 o B3: sin eso no se puede demostrar que ninguna limpieza sirvió.

### B5 · `MENSAGE DEL USUARIO`

`server.ts:207`. Error de tipeo en el rótulo que separa el estado del mensaje del usuario. No es un patrón fechado. Va en el parche porque es mecánico y cuesta cero.

---

## Lo que no se toca

El listado de conservación de la guía aplica y la mayor parte del prompt cae ahí.

1. **El bloque de dominio** (`server.ts:219-226`): Reportes Extraordinarios, ITBIS Inclusivo, Liberación de Retención de Garantía con su unicidad de hoja, control de fechas, mecánica de precio contra cantidad. Es lo único que el modelo no puede saber. Retenciones ISR 2% o 10%, Garantía 5%, TSS 2.87%. Contexto puro, nada de esto se borra.
2. **La regla de nombre de hoja** `Miguel (Pintura)` (`server.ts:304`): fija un formato genuinamente sensible al formato, con ejemplo. Conserva su mayúscula.
3. **`ESTRICTAMENTE OBLIGATORIO` en `formula`** (`server.ts:353`): explica una mecánica real, el sistema lee el valor antes de que el usuario abra la tabla. Contrato, no volumen.
4. **El constructor de payload duplicado 57 líneas** (`ProductionSheetsTab.tsx:696-752` contra `840-896`, idénticos salvo un comentario): redundancia que funciona. Es preferencia de refactor, no patrón fechado. Una auditoría que lo borra no mejora nada.
5. **La línea de rol** (`server.ts:211`): una frase, seguida de contexto real. Se queda.

Los marcadores de énfasis bajan de 24 a 5 en el `systemInstruction`. Las palabras bajan de 1.845 a 1.742, un 5,6%. Eso es deliberado: el objetivo era el énfasis que dejó de señalar, no la longitud. Los 5 marcadores que sobreviven están sobre fijación de formato y mecánica de contrato.

---

## Diff propuesto

`prompt-audit.patch`, 8 hunks, un hallazgo por hunk. Verificado con `git apply --check` contra el árbol limpio.

```
git apply prompt-audit.patch     # revisar primero
git apply -R prompt-audit.patch  # revertir
```

Cobertura: A1, A2, M1, M2, M3, M4, M5, B5. Fuera del parche por diseño: A3 (transversal, sin compilador en este contenedor), B1 a B4 (requieren medición antes de código).

Paso 7 de la guía, sin excepción para este repo: cada corte es una hipótesis. `npm install && npm run lint` antes de nada, y un ejercicio manual de las tres rutas con un documento real (foto de talonario, excel de cubicación, pdf de acuerdo) comparando la extracción antes y contra después. M2 y M4 cambian la forma de la respuesta que el operador lee a diario. Si M2 regresa verbosidad, la reformulación mínima es una línea, no el original de dos.
