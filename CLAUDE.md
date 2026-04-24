# NotebookLM MCP - Workflow de Procesamiento de Documentos

## Descripción General

Este proyecto integra **NotebookLM** como preprocesador de documentos. El flujo es:

1. 📄 **NotebookLM procesa** tus documentos (PDFs, escritos, videos, fotos)
2. 🔍 **Tú depuras** la información extraída
3. 📤 **Pasas a Claude** la información estructurada y limpia

## Flujo de Trabajo Actual (Sin credenciales)

### Paso 1: Procesar documentos en NotebookLM
```
1. Ve a https://notebooklm.google.com
2. Sube tus documentos:
   - PDFs
   - Textos/Escritos
   - Imágenes/Fotos
   - Videos (si NotebookLM los soporta)
3. Deja que NotebookLM analice y resuma
```

### Paso 2: Copiar información a Claude
```bash
# Opción A: Pega el resumen/análisis directamente aquí
# Claude lo depurará y estructurará automáticamente

# Opción B: Crea un archivo temporal
echo "Tu contenido procesado por NotebookLM" > /tmp/notebooklm-content.txt
# Luego carga el archivo en Claude
```

### Paso 3: Claude depura y estructura
```
Cuando pases contenido, puedes pedir:
- "Depura y estructura esta información de NotebookLM"
- "Extrae los puntos clave"
- "Organiza por temas/categorías"
- "Crea un resumen ejecutivo"
```

## Configuración MCP (Para cuando tengas credenciales)

Cuando obtengas una API key de NotebookLM:

### 1. Configura la variable de entorno
```bash
export NOTEBOOKLM_API_KEY="tu-api-key-aqui"
```

### 2. Verifica la instalación
```bash
npx notebooklm-mcp --version
```

### 3. Claude usará el MCP automáticamente
El `.mcp.json` ya está configurado para usar `notebooklm-mcp` cuando tengas las credenciales.

## Prompts Útiles para Claude

### Procesar información de NotebookLM
```
Tengo información procesada por NotebookLM:

[PEGAR CONTENIDO AQUÍ]

Por favor:
1. Estructura la información por temas
2. Extrae los puntos clave
3. Identifica datos faltantes o inconsistencias
4. Crea un resumen limpio
```

### Análisis comparativo
```
NotebookLM me dio este análisis de [DOCUMENTO]:

[CONTENIDO]

Compáralo con [CONTEXTO/REFERENCIA] y crea un informe consolidado.
```

### Extracción de datos específicos
```
De este análisis de NotebookLM:

[CONTENIDO]

Extrae solo:
- Nombres y fechas
- Números y métricas
- Conceptos clave
- Referencias a recursos
```

## Archivos del Proyecto

- `.mcp.json` - Configuración MCP de NotebookLM
- `.claude/settings.json` - Configuración de Claude Code
- `CLAUDE.md` - Este archivo (instrucciones)

## Próximos Pasos

1. **Obtén credenciales de NotebookLM**
   - Visita https://ai.google.dev/
   - Solicita acceso a NotebookLM API

2. **Configura la API key**
   ```bash
   # En ~/.claude/settings.json o en tu shell
   export NOTEBOOKLM_API_KEY="tu-key"
   ```

3. **Prueba el MCP**
   ```bash
   # Claude usará automáticamente notebooklm-mcp
   claude
   ```

## Comandos Rápidos

```bash
# Verificar configuración
cat .mcp.json

# Instalar dependencias MCP
npm install notebooklm-mcp

# Listar servidores MCP disponibles
claude mcps list
```

## Notas

- Por ahora, copia manualmente del navegador de NotebookLM a Claude
- El MCP se activará automáticamente cuando tengas API key
- Puedes usar las instrucciones en este archivo como prompts base
