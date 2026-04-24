# 🚀 Instalación NotebookLM MCP con UV

## ¿Qué es UV?

`uv` es un **gestor de paquetes Python ultra-rápido** que reemplaza pip, pip-tools, venv y más.

- ⚡ **10-100x más rápido** que pip
- 🔒 **Seguro y confiable**
- 📦 **Instalación simple de herramientas CLI**
- 🌍 **Compatible con todo el ecosistema Python**

---

## 📋 Instalación Paso a Paso

### Paso 1: Instalar UV (si no lo tienes)

```bash
# En macOS o Linux:
curl -LsSf https://astral.sh/uv/install.sh | sh

# En Windows (con PowerShell):
powershell -ExecutionPolicy BypassUser -c "irm https://astral.sh/uv/install.ps1 | iex"

# O con un gestor de paquetes:
brew install uv          # macOS con Homebrew
apt install uv           # Debian/Ubuntu
pacman -S uv             # Arch
choco install uv         # Windows con Chocolatey
```

**Verificar instalación:**
```bash
uv --version
# Output: uv 0.x.x
```

### Paso 2: Instalar NotebookLM MCP CLI

```bash
# Comando recomendado (con uv):
pip install uv
uv tool install notebooklm-mcp-cli

# Verificar:
notebooklm-mcp-cli --version
```

O simplemente:
```bash
uv tool install notebooklm-mcp-cli
```

---

## ✅ Verificación de Instalación

```bash
# Ver las herramientas instaladas
uv tool list

# Output esperado:
# notebooklm-mcp-cli
#   Installed at: ~/.local/bin/notebooklm-mcp-cli (or equivalent)

# Probar que funciona
notebooklm-mcp-cli --help
```

---

## 🔌 Configuración en Claude Code

Ya está configurado en `.mcp.json`:

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "uv",
      "args": ["tool", "run", "notebooklm-mcp-cli"],
      "env": {
        "NOTEBOOKLM_API_KEY": "${NOTEBOOKLM_API_KEY}"
      }
    }
  }
}
```

---

## 🔐 Configurar API Key

### Opción A: Variable de Entorno (Recomendado)

```bash
# En bash/zsh (~/.bashrc o ~/.zshrc):
export NOTEBOOKLM_API_KEY="tu-api-key-aqui"

# Recarga el shell:
source ~/.bashrc  # o ~/.zshrc
```

### Opción B: En Settings Local de Claude Code

```bash
# Crear archivo local (no se commitea):
cat > ~/.claude/settings.local.json << 'EOF'
{
  "env": {
    "NOTEBOOKLM_API_KEY": "tu-api-key-aqui"
  }
}
EOF

chmod 600 ~/.claude/settings.local.json  # Seguridad
```

### Opción C: En el Proyecto (Temporal, no commitear)

```bash
# En .claude/settings.local.json (proyecto específico)
cat > /home/user/Claude/.claude/settings.local.json << 'EOF'
{
  "env": {
    "NOTEBOOKLM_API_KEY": "tu-api-key-aqui"
  }
}
EOF
```

**⚠️ IMPORTANTE:** Siempre agrega `settings.local.json` a `.gitignore` (ya está hecho)

---

## 🧪 Probar la Integración

### Test 1: Verificar que UV encuentra el CLI

```bash
which notebooklm-mcp-cli
# Output: /home/user/.local/bin/notebooklm-mcp-cli (o similar)
```

### Test 2: Ejecutar directamente

```bash
notebooklm-mcp-cli --help
# Debe mostrar opciones de comandos
```

### Test 3: Con UV (como lo hace Claude)

```bash
uv tool run notebooklm-mcp-cli --help
```

### Test 4: En Claude Code

```
Dentro de Claude, simplemente usa:
"Analiza este documento con NotebookLM"
```

Claude debería conectar automáticamente vía MCP.

---

## 🎯 Ventajas de UV

| Característica | UV | pip |
|---|---|---|
| Velocidad | ⚡⚡⚡ Muy rápido | 🐢 Lento |
| Instalación herramientas | `uv tool install` | `pipx` + setup complejo |
| Aislamiento | ✅ Automático | ❌ Manual |
| Compatible | ✅ 100% Python | ✅ 100% Python |
| Instalación | 📦 Una línea | 📦 Múltiples pasos |

---

## 📚 Recursos

| Recurso | URL |
|---------|-----|
| UV Official | https://docs.astral.sh/uv/ |
| NotebookLM CLI | (Incluido en paquete) |
| NotebookLM | https://notebooklm.google.com |
| API Docs | https://ai.google.dev/ |

---

## ✨ Próximos Pasos

1. **Instala UV:**
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Instala NotebookLM CLI:**
   ```bash
   uv tool install notebooklm-mcp-cli
   ```

3. **Configura API Key:**
   ```bash
   export NOTEBOOKLM_API_KEY="tu-key"
   ```

4. **Reinicia Claude Code:**
   ```bash
   # Cierra y abre de nuevo, o:
   # Carga la nueva variable de entorno
   ```

5. **Prueba:**
   ```
   "Analiza mi documento con NotebookLM"
   ```

---

## 🆘 Troubleshooting

### "notebooklm-mcp-cli: command not found"
```bash
# Verifica instalación
uv tool list

# Reinstala si es necesario
uv tool uninstall notebooklm-mcp-cli
uv tool install notebooklm-mcp-cli

# Verifica PATH
echo $PATH
# Debe incluir ~/.local/bin o similar
```

### "NOTEBOOKLM_API_KEY not found"
```bash
# Verifica que está configurada
echo $NOTEBOOKLM_API_KEY

# Si está vacía, configura:
export NOTEBOOKLM_API_KEY="tu-key"

# Y recarga el shell
source ~/.bashrc
```

### Claude no detecta el MCP
```bash
# Verifica .mcp.json está bien formado
cat .mcp.json | jq .

# Cierra y abre Claude Code
# O reinicia el daemon:
claude stop
sleep 2
claude
```

---

## 📝 Actualizado

Este documento refleja la instalación correcta con:
- ✅ `uv` como gestor de paquetes
- ✅ `notebooklm-mcp-cli` como herramienta
- ✅ Configuración automática en `.mcp.json`
- ✅ API Key via variables de entorno

**Estado:** Listo para instalar y usar.
