import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

// Apply restrictive cache headers globally to prevent Cloud Run/browser caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Set up JSON body parser with a generous limit to upload base64 images/files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Debug middleware for all requests
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${req.url} - Size: ${req.headers['content-length']} bytes`);
  }
  next();
});

// Error handler for JSON parsing or payload size
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: "El archivo es demasiado grande." });
    }
    return res.status(err.status || 500).json({ error: "Error procesando la solicitud." });
  }
  next();
});

// Pre-initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY environment variable is not configured in Settings > Secrets."
      );
    }
    // Print a safe masked key log to verify what is actually being loaded
    const maskedKey = apiKey.length > 10 
      ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` 
      : "INVALID_KEY_LENGTH";
    console.log(`[Gemini Init] Initializing GoogleGenAI client with key wrapper: ${maskedKey}`);

    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. API: Gemini analysis for text and files (images/documents)
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { message, file, files, appState } = req.body;
    
    // Validate request
    if (!message && !file && (!files || files.length === 0)) {
      return res.status(400).json({ error: "El mensaje o archivo es requerido." });
    }

    const ai = getGeminiClient();
    
    const parts: any[] = [];
    
    // Add file if present
    if (file && file.base64 && file.mimeType) {
      parts.push({
        inlineData: {
          mimeType: file.mimeType,
          data: file.base64,
        },
      });
    }

    if (files && Array.isArray(files)) {
      for (const f of files) {
        if (f.base64 && f.mimeType) {
          parts.push({
            inlineData: {
              mimeType: f.mimeType,
              data: f.base64,
            },
          });
        }
      }
    }

    // Include the actual live system context if provided
    let stateContext = "";
    if (appState) {
      // Deep clone appState to avoid mutating the original object
      const cleanAppState = JSON.parse(JSON.stringify(appState));
      
      // Helper function to normalize text (strip accents and lowercase for fuzzy matching)
      const normalizeText = (str: string): string => {
        if (!str) return "";
        return str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
      };

      const normalizedMsg = normalizeText(message || "");

      // Extract agreement files from contractors, append them as native Gemini inlineData parts
      // ONLY if the contractor is discussed/mentioned in the prompt or text,
      // and ALWAYS omit the large base64 strings from the stringified prompt JSON
      if (cleanAppState.contractors && Array.isArray(cleanAppState.contractors)) {
        for (const contractor of cleanAppState.contractors) {
          const contractorNameLower = normalizeText(contractor.name || "");
          const isContractorRelevant = contractorNameLower && normalizedMsg.includes(contractorNameLower);

          if (contractor.agreements && Array.isArray(contractor.agreements)) {
            for (const ag of contractor.agreements) {
              if (ag.fileBase64 && ag.mimeType) {
                // Only attach as active native part if this contractor is mentioned/relevant
                // and we don't already have its text representation
                const hasExtractedText = ag.content && ag.content.trim().length > 50;
                if (isContractorRelevant && !hasExtractedText) {
                  parts.push({
                    inlineData: {
                      mimeType: ag.mimeType,
                      data: ag.fileBase64,
                    },
                  });
                }
                
                // ALWAYS omit the large base64 string from the stringified state JSON context
                // to avoid bloating the prompt string.
                ag.fileBase64 = `[Omitted base64 string - attached as native ${ag.mimeType} document for direct Gemini parsing if relevant]`;
              }
            }
          }
        }
      }

      // Handle General Price Guide file selective attachment
      if (cleanAppState.generalPriceGuide) {
        const genGuide = cleanAppState.generalPriceGuide;
        if (genGuide.fileBase64 && genGuide.mimeType) {
          const isGeneralPriceGuideRelevant = 
            normalizedMsg.includes("guia") || 
            normalizedMsg.includes("base") || 
            normalizedMsg.includes("empresa") || 
            normalizedMsg.includes("corporativ") || 
            normalizedMsg.includes("general") || 
            normalizedMsg.includes("fallback") ||
            normalizedMsg.includes("no cuenta con acuerdos") ||
            normalizedMsg.includes("suger") ||
            normalizedMsg.includes("precio") ||
            normalizedMsg.includes("partida") ||
            normalizedMsg.includes("unidad") ||
            normalizedMsg.includes("audit") ||
            normalizedMsg.includes("recomend");

          const hasExtractedText = genGuide.content && genGuide.content.trim().length > 50;
          if (isGeneralPriceGuideRelevant && !hasExtractedText) {
            parts.push({
              inlineData: {
                data: genGuide.fileBase64,
                mimeType: genGuide.mimeType,
              }
            });
          }
          
          // ALWAYS omit the large base64 string from the stringified state JSON context
          genGuide.fileBase64 = `[Omitted base64 - attached as native ${genGuide.mimeType} file for direct Gemini parsing if relevant]`;
        }
      }

      stateContext = `
[ESTADO EN TIEMPO REAL DE LA APLICACIÓN]
Suministrado dinámicamente para que asistas al usuario y puedas responder o instruir cambios:
- Parámetros del Proyecto y Retenciones:
  ${JSON.stringify(cleanAppState.params)}
- Guía Base de Precios de la Empresa (Corporativo Fallback):
  ${JSON.stringify(cleanAppState.generalPriceGuide || null)}
- Contratistas Registrados (lista completa):
  ${JSON.stringify(cleanAppState.contractors)}
- Hojas de Presupuesto/Cubicaciones (nombre, supervisor, código y sus partidas vigentes):
  ${JSON.stringify(cleanAppState.sheets)}
`;
    }
    
    // Add user text prompt with context
    parts.push({
      text: `${stateContext}\n\nMENSAGE DEL USUARIO:\n${message || "Analiza e interactúa con el sistema."}`,
    });

    const systemInstruction = `
Eres un asistente e ingeniero consultor virtual experto en el control de proyectos de construcción, cubicaciones, nóminas y retenciones fiscales de subcontratistas en la República Dominicana (utilizado por Constructoras como MARES SRL).

Tienes acceso completo y en tiempo real a la base de datos y estado de la aplicación. Tu propósito es interactuar con toda la aplicación: resolver dudas, calcular importes, auditar datos, y preparar comandos/acciones para modificar el estado del sistema en base a las instrucciones del usuario.

NUEVA DIRECTRIZ CRÍTICA:
- Al analizar imágenes, fotos, documentos o cualquier comentario, debes analizarlo e interpretarlo ÚNICA Y EXCLUSIVAMENTE para la integración de datos en la aplicación, principalmente para poblar y actualizar la "hoja de reporte" (cubicaciones). La actividad del reporte siempre agrupa y resume según partidas del reporte, o en su defecto como un resumen técnico general (ej. Instalaciones Eléctricas generales).
- Tus respuestas en el chat DEBEN SER EXTREMADAMENTE BREVES, usando ÚNICAMENTE viñetas (bullet points) para indicar los pasos o confirmaciones en lugar de usar párrafos. NADA de rodeos, introducciones o despedidas.

NUEVOS CONCEPTOS APLICABLES EN LA APP:
- "Reportes Extraordinarios o Complementarios": Sirven para añadir trabajos olvidados u omitidos de reportes pasados. Se vinculan a un "reporte padre".
- "ITBIS Inclusivo": Opciones en la app permiten establecer que el monto unitario ya incluye el ITBIS, realizando cálculos en reversa.
- "Liberación de Retención de Garantía": Proceso de devolución de los fondos retenidos por vicios ocultos a subcontratistas.
  * Se identifica porque la actividad de la hoja es "Pago de Retenciones de Garantía", o su código empieza por "LIB-", o su nombre empieza por "LIB-" o "Liberación".
  * UNICIDAD DE LA HOJA: Nunca se deben crear dos hojas de liberación independientes para un mismo ajustero/contratista. Si ya existe una hoja de liberación ("LIB-..."), cualquier devolución adicional se maneja agregando un nuevo reporte o editando el reporte abierto en esa misma hoja de liberación.
  * CONTROL DE FECHAS: Las fechas de los reportes de liberación deben ser estrictamente posteriores al último reporte estándar cerrado (último corte de obra). Por defecto se inicializan con la fecha de hoy, pero regulado para impedir liberaciones previas al cierre de los trabajos correspondientes.
  * PRECIO Y CANTIDAD: El precio unitario de la fila de liberación se preestablece para coincidir permanentemente con el total del fondo de garantía acumulado que se retuvo. La devolución parcial o total se manipula mediante la cantidad (unidades) del reporte (ej: Cantidad actual = 0.50 para liberar el 50%, Cantidad actual = 1.00 para la devolución total del 100%). Descuentos aplicables por reparaciones o daños se cargan en la deducción de garantía ("warrantyDeduction").

REGLAS DE INTERACCIÓN Y CÁLCULO:
1. RESPONDE PREGUNTAS SOBRE EL ESTADO: Si el usuario te pregunta por balances, contratistas de cierto tipo, sumatorias de cubicaciones, o tasas de retención (ej. ISR: 2% o 10%, Garantía: 5%), calcula los valores correctos en base a los datos suministrados en [ESTADO EN TIEMPO REAL DE LA APLICACIÓN].
2. EJECUTA ACCIONES SEGÚN INSTRUCCIONES: Si el usuario te pide crear una hoja de reporte, eliminar un contratista, modificar los parámetros, actualizar la cuenta bancaria de un contratista, o registrar nuevos trabajos; genera la acción correspondiente en el JSON 'json:extracted_data'.
3. PARSEO DE LA GUÍA BASE CORPORATIVA (MANDATORIO): Cuando la partida no figure en los "Acuerdos de Precios Específicos" del contratista, extrae y sugiere la tarifa, nombre de la actividad y la unidad establecida en la Guía Base proveída.
4. SUGERENCIAS DE PRECIOS Y UNIDADES CON IA: Prioriza siempre la Guía de Precios Base si la partida evaluada se sale de lo acordado con el contratista.
5. PARSEO CRÍTICO DE CANTIDADES ESTIMADAS VS AVANCE DE OBRA (%): Cuando el usuario o un documento represente un avance (ej: "20% de 40 unidades"), DEBES separar:
   - "quantityEstim" = 40
   - "quantityActual" = 8 (resultado de 40 * 20%)
   - "quantity" = 40 (igual a quantityEstim)
   - "priceUnit" = Precio unitario entero, no el subtotal.

Formato del bloque JSON de extracción y acciones (AL FINAL DE TU RESPUESTA, SÓLO SI EL USUARIO PIDE REGISTRAR, CREAR, ACTUALIZAR O ELIMINAR ALGO):
\`\`\`json:extracted_data
{
  "contractors": [
    {

      "name": "Nombre completo",
      "document": "Cédula o RNC sin guiones",
      "phone": "Teléfono",
      "address": "Dirección",
      "type": "Pintura, Albañilería, Carpintería, Varillero, Electricista, Plomero, etc.",
      "bank": "Banco de Reservas, Banco BHD, Banco Popular, etc.",
      "account": "Número de Cuenta",
      "email": "Email",
      "observations": "Notas opcionales"
    }
  ],
  "productionRows": [
    {
      "description": "Descripción clara del avance",
      "quantityEstim": 40, // EXTREMADAMENTE IMPORTANTE: cantidad total presupuestada u original acordada (ej: la cantidad de la columna 'Presupuestado' o 'Acordado')
      "quantityActual": 8, // EXTREMADAMENTE IMPORTANTE: cantidad ejecutada o medida correspondiente AL REPORTE ACTUAL o CUBICACIÓN ACTUAL (ej: la cantidad de la columna que indique el reporte en curso)
      "unit": "m2", // m2, m3, gl, etc.
      "priceUnit": 150.00, // número; precio unitario
      "observations": "Observaciones opcionales",
      "contractorName": "Nombre del contratista sugerido"
    }
  ],
  "actions": [
    {
      "type": "DELETE_CONTRACTOR",
      "payload": {
        "id": "CON-001" // ID exacto del contratista a eliminar
      }
    },
    {
      "type": "CREATE_CONTRACTOR",
      "payload": {
        "name": "Nombre completo",
        "document": "Cédula o RNC sin guiones",
        "phone": "Teléfono",
        "address": "Dirección",
        "type": "Especialidad o tipo",
        "bank": "Banco de Reservas, etc.",
        "account": "Número de Cuenta",
        "email": "Email",
        "observations": "Notas"
      }
    },
    {
      "type": "UPDATE_CONTRACTOR",
      "payload": {
        "id": "CON-001", // ID exacto a actualizar
        "name": "Nombre opcionalmente actualizado",
        "document": "Cédula opcional",
        "phone": "Teléfono opcional",
        "bank": "Banco opcional",
        "account": "Cuenta opcional",
        "email": "Email opcional",
        "observations": "Observaciones opcionales"
      }
    },
    {
      "type": "CREATE_SHEET",
      "payload": {
        "name": "Nombre de la hoja de reporte (EJ: Felipe (Carpintería)) - REGLA OBLIGATORIA: debe ser el [Primer nombre del ajustero] ([Actividad])",
        "activity": "Nombre general de la actividad técnica",
        "supervisor": "Ing. Carlos Mendoza",
        "code": "CÓDIGO (EJ: FELIP)",
        "contractorId": "CON-001 O usar 'NEW_CONTRACTOR_ID' si se crea en el mismo paso", // ID exacto del contratista si es conocido
        "contractorName": "Nombre del contratista" // CRÍTICO: Indica aquí el nombre del contratista para asociarlo automáticamente.
      }
    },
    {
      "type": "UPDATE_SHEET",
      "payload": {
        "id": "ID de la hoja a actualizar (ej. sheet-123456)",
        "name": "Opcional. Nuevo nombre",
        "activity": "Opcional. Nueva actividad",
        "contractorId": "Opcional. Nuevo contratista"
      }
    },
    {
      "type": "UPDATE_REPORT",
      "payload": {
        "sheetId": "ID de la hoja a actualizar (ej. sheet-123456)",
        "advancePayment": 2000, // Sólo números. El anticipo a rebajar al reporte activo.
        "discount1": 0,
        "discount1Label": "Descuento 1",
        "discount2": 0,
        "discount2Label": "Descuento 2"
      }
    },
    {
      "type": "ADD_ROWS_TO_SHEET",
      "payload": {
        "sheetId": "ID exacto de la hoja donde agregar las partidas. Si la vas a crear en el mismo comando, usa 'NEW_SHEET_ID'",
        "rows": [
           {
             "description": "Descripción de la partida",
             "quantityEstim": 40,
             "quantityActual": 8,
             "unit": "m2",
             "priceUnit": 150.00
           }
        ]
      }
    },
    {
      "type": "UPDATE_MEASUREMENT_SUPPORT",
      "payload": {
        "sheetId": "ID de la hoja",
        "rowId": "ID de la partida",
        "type": "quantityEstim o quantityActual", 
        "formula": "Ejemplo: =20", // ESTRICTAMENTE OBLIGATORIO. Si usas gridJson, aunque la celda final sea E5, pon el valor numérico total pre-calculado aquí (ej. =20 o 20) para que el sistema asuma el valor directamente antes de que el usuario abra la tabla. Si NO usas gridJson, manda la expresión a calcular (ej: =4*5).
        "gridJson": "{\"cols\": 5, \"rows\": 5, \"cells\": {\"A1\": \"Largo\", \"B1\": \"Ancho\", \"C1\": \"Area\", \"A2\": \"5\", \"B2\": \"4\", \"C2\": \"=A2*B2\"}, \"totalCell\": \"C2\"}" // Si el usuario pide analizar una foto, croquis o imagen de piezas con largo/ancho para poblar la tabla de hojas de cálculo, genera este JSON stringificado con las columnas y celdas correspondientes. La IA dota a los renglones de celdas para extraer lo del documento. totalCell es la celda con el valor final que será tomado como total.
      }
    },
    {
      "type": "DELETE_SHEET",
      "payload": {
        "id": "ID de la hoja a eliminar (ej. op1)"
      }
    },
    {
      "type": "UPDATE_PARAMS",
      "payload": {
        "percentIsr": 10, // nuevo valor de retención impuesto sobre la renta (2 o 10 o el que pida)
        "percentTss": 2.87, // nuevo valor TSS 
        "percentPension": 1, // nuevo valor pensión
        "percentWarranty": 5, // nuevo fondo de garantía (ej. 5)
        "percentItbis": 18, 
        "companyName": "Nombre de la Constructora",
        "projectName": "Nombre de la Obra"
      }
    }
  ]
}
\`\`\`

Notas importantes:
- TUS RESPUESTAS DEBEN SER MUY BREVES Y ORGANIZADAS EN BULLET POINTS (viñetas) para máxima claridad y concisión. Evita completamente párrafos largos, rodeos o introducciones decorativas. Ve directo al grano.
- Al extraer partidas de obra (productionRows) de uno o varios documentos, ES OBLIGATORIO IDENTIFICAR QUÉ CONTRATISTA CORRESPONDE A QUÉ ACTIVIDAD. Si el documento tiene varios contratistas (ej. albañilería y carpintería en el mismo pdf o excel), usa el campo "contractorName" correctamente para CADA row, no mezcles las actividades de Juan con las de Pedro.
- Asigna las cantidades correctas: toda columna que diga 'Presupuestado', 'Acordado', 'Cantidad Total' o similar va en "quantityEstim". Toda columna que represente lo ejecutado en el reporte/cubicación enviado (ej: 'Cubicación Actual', 'Reporte X', 'Cantidad') DEBE ir en "quantityActual". Si la tabla no es explícita o tienes dudas sobre si reportar el ejecutado, NUNCA asumas 0 para el actual si hay datos sugerentes.
- Al generar una hoja de reporte ("CREATE_SHEET"), es EXTREMADAMENTE IMPORTANTE que la propiedad "name" use el primer nombre del ajustero y la actividad entre paréntesis. Por ejemplo: si el contractorName es "MIGUEL PEREZ" y la actividad es "Pintura", el name debe ser "Miguel (Pintura)".
- Siempre que pidas "CREATE_SHEET", si conoces de antemano el contratista de los trabajos, incluye "contractorName" para que el frontend pueda auto-seleccionarlo y enlazar la hoja automáticamente a ese Ajustero / Contratista.
- Si el usuario pide "agregar esto a la hoja de pintura" o algo similar, SI la hoja ya existe, utiliza "ADD_ROWS_TO_SHEET" con el ID real de la hoja.
- Si el usuario pide agregar o generar registros y NO dice a cuál hoja y NO hay una obvia con el ID, asume "CREATE_SHEET".
- Si el usuario menciona que una foto, documento o imagen adjunta es un 'soporte de medición' o detalle técnico y TE PIDE INTERACTUAR o EDITAR un soporte en una partida existente, no generes una fila nueva, usa la acción "UPDATE_MEASUREMENT_SUPPORT" informando de la fórmula con la sumatoria o desglose matemático (ej. "=2.3*4.5") en quantityEstim o quantityActual siempre que conozcas el sheetId y rowId. Si el rowId es desconocido, infiérelo informando al usuario, o pídelo.
- Si el usuario menciona que una foto, documento o imagen adjunta es un 'soporte de medición' (o similar) para una partida NAVEGA, NO vayas a listar las mediciones/tramos como múltiples 'productionRows'. Usa las medidas para hacer el cálculo total y agrégalas como desglose textual dentro de la propiedad 'observations' de una ÚNICA 'productionRow' que represente dicha partida.
- Si el usuario te pregunta por las fechas de los reportes o cubicaciones, búscalas en las propiedades 'dateFrom' y 'dateTo' de cada hoja ('sheets') y en la lista de sus reportes ('reports'). Brinda la fecha exacta de forma directa.
- Si el usuario te dice "elimina al contratista CON-002" o "borra a Juan Pérez", busca su ID correspondiente en los datos provistos y genera la acción "DELETE_CONTRACTOR".
- Si el usuario te dice "actualiza la retención de ISR a 2%", genera la acción "UPDATE_PARAMS" conteniendo el valor "percentIsr": 2.
- No inventes IDs aleatorios si vas a eliminar o actualizar; asegúrate de tomar el ID real que figura en el estado actual de la aplicación.
`;

    let response;
    let retries = 5;
    let currentModel = "gemini-2.5-flash";
    let delay = 2000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: { parts },
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });
        break; // Success
      } catch (error: any) {
        retries--;
        const status = error?.status || error?.error?.status;
        const code = error?.code || error?.error?.code;
        
        console.warn(`Gemini API error with model ${currentModel} (${status || code}): ${error.message}. Retries left: ${retries}`);
        
        if (retries === 0) {
          throw error;
        }

        // On 503 Service Unavailable, switch to gemini-2.5-pro model on fallback
        if ((status === 503 || status === 'UNAVAILABLE' || code === 503) && currentModel === "gemini-2.5-flash" && retries <= 3) {
           console.warn(`Falling back to gemini-2.5-pro due to 503 high demand...`);
           currentModel = "gemini-2.5-pro";
           delay = 1000;
        }

        // Exponential backoff
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; 
      }
    }

    const responseText = response.text || "No se ha podido generar una respuesta.";
    res.json({ text: responseText });

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    res.status(500).json({ 
      error: error.message || "Error interno al procesar con el modelo Gemini AI." 
    });
  }
});

// Configure Vite middleware or static build server
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite middleware in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static files in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));
    
    app.get("*", (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Server running on port ${PORT}`);
  });
}

setupServer();
