# ⚡ Quick Start: NotebookLM MCP

**Instalación en 2 minutos**

---

## 🐧 Linux / macOS

```bash
# 1. Instalar UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Instalar NotebookLM CLI
uv tool install notebooklm-mcp-cli

# 3. Configurar API Key
export NOTEBOOKLM_API_KEY="tu-api-key"

# 4. Automático (opcional)
chmod +x instalar-notebooklm.sh
./instalar-notebooklm.sh
```

---

## 🪟 Windows (PowerShell)

```powershell
# Ejecutar como Administrador

# 1. Instalar UV
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# 2. Instalar NotebookLM CLI
uv tool install notebooklm-mcp-cli

# 3. Configurar API Key (PowerShell Admin)
[Environment]::SetEnvironmentVariable("NOTEBOOKLM_API_KEY", "tu-api-key", "User")

# 4. Automático (opcional)
powershell -ExecutionPolicy ByPass -File instalar-notebooklm.ps1
```

---

## ✅ Verificar Instalación

```bash
# Ver herramientas instaladas
uv tool list

# Probar CLI
notebooklm-mcp-cli --help

# Verificar API Key
echo $NOTEBOOKLM_API_KEY  # Linux/macOS
echo %NOTEBOOKLM_API_KEY%  # Windows CMD
```

---

## 📱 Obtener API Key

1. Ve a: https://ai.google.dev/
2. Inicia sesión con Google
3. Solicita acceso a NotebookLM API
4. Copia tu API key
5. Configúrala en tu sistema

---

## 🚀 Usar en Claude Code

Ahora simplemente dile a Claude:

```
"Analiza este documento con NotebookLM"
```

Claude lo hará automáticamente.

---

## 📚 Documentación Completa

- `INSTALACION-UV.md` - Guía detallada
- `CLAUDE.md` - Instrucciones de uso
- `EJEMPLO-FLUJO.md` - Casos prácticos

---

## 🆘 Troubleshooting

### "Command not found: uv"
```bash
# Agrega PATH (Linux/macOS)
export PATH="$HOME/.local/bin:$PATH"
# Agrega a ~/.bashrc o ~/.zshrc para hacerlo permanente
```

### "notebooklm-mcp-cli not found"
```bash
# Reinstala
uv tool uninstall notebooklm-mcp-cli
uv tool install notebooklm-mcp-cli
```

### "API Key not recognized"
```bash
# Verifica que está configurada
echo $NOTEBOOKLM_API_KEY  # Debe mostrar tu key

# Si está vacía, configúrala nuevamente
export NOTEBOOKLM_API_KEY="tu-api-key"
```

---

**¿Necesitas ayuda?** Lee `INSTALACION-UV.md` para detalles completos.
