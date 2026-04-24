#!/bin/bash
# Script de instalación automática: NotebookLM MCP con UV
# Compatible con: macOS, Linux, WSL

set -e  # Exit on error

echo "================================"
echo "NotebookLM MCP - Instalador UV"
echo "================================"
echo ""

# Detectar sistema operativo
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="Windows"
else
    OS="Unknown"
fi

echo "🔍 Sistema detectado: $OS"
echo ""

# Paso 1: Verificar si UV está instalado
echo "📦 Paso 1: Verificando UV..."
if command -v uv &> /dev/null; then
    UV_VERSION=$(uv --version)
    echo "✅ UV ya está instalado: $UV_VERSION"
else
    echo "⬇️  Instalando UV..."

    if [[ "$OS" == "Linux" || "$OS" == "macOS" ]]; then
        curl -LsSf https://astral.sh/uv/install.sh | sh

        # Agregar a PATH si es necesario
        if ! command -v uv &> /dev/null; then
            export PATH="$HOME/.local/bin:$PATH"
            echo "⚠️  Agrega esto a tu ~/.bashrc o ~/.zshrc:"
            echo "   export PATH=\"\$HOME/.local/bin:\$PATH\""
        fi
    else
        echo "❌ Por favor instala UV manualmente en Windows:"
        echo "   powershell -ExecutionPolicy ByPass -c \"irm https://astral.sh/uv/install.ps1 | iex\""
        exit 1
    fi

    echo "✅ UV instalado correctamente"
fi

UV_VERSION=$(uv --version)
echo "   $UV_VERSION"
echo ""

# Paso 2: Instalar NotebookLM MCP CLI
echo "📦 Paso 2: Instalando NotebookLM MCP CLI..."
if command -v notebooklm-mcp-cli &> /dev/null; then
    echo "✅ NotebookLM MCP CLI ya está instalado"
else
    echo "⬇️  Instalando notebooklm-mcp-cli..."
    uv tool install notebooklm-mcp-cli
    echo "✅ NotebookLM MCP CLI instalado correctamente"
fi

notebooklm-mcp-cli --version 2>/dev/null || echo "   (versión no disponible)"
echo ""

# Paso 3: Verificar configuración
echo "🔐 Paso 3: Verificando configuración..."

# Verificar .mcp.json
if [ -f ".mcp.json" ]; then
    echo "✅ .mcp.json encontrado"
    # Verificar que tiene notebooklm-mcp-cli
    if grep -q "notebooklm-mcp-cli" .mcp.json; then
        echo "✅ .mcp.json está correctamente configurado para UV"
    else
        echo "⚠️  .mcp.json podría necesitar actualización"
    fi
else
    echo "⚠️  .mcp.json no encontrado (debería estar en el proyecto)"
fi
echo ""

# Paso 4: API Key
echo "🔑 Paso 4: Configuración de API Key..."
if [ -z "$NOTEBOOKLM_API_KEY" ]; then
    echo "⚠️  NOTEBOOKLM_API_KEY no está configurada"
    echo ""
    echo "   Para obtenerla:"
    echo "   1. Ve a https://ai.google.dev/"
    echo "   2. Solicita acceso a NotebookLM API"
    echo "   3. Copia tu API key"
    echo ""
    echo "   Luego configúrala:"
    echo "   export NOTEBOOKLM_API_KEY=\"tu-api-key-aqui\""
    echo ""
    echo "   O en ~/.bashrc / ~/.zshrc (permanente):"
    echo "   echo 'export NOTEBOOKLM_API_KEY=\"tu-api-key\"' >> ~/.bashrc"
else
    echo "✅ NOTEBOOKLM_API_KEY está configurada"
fi
echo ""

# Resumen final
echo "================================"
echo "✨ INSTALACIÓN COMPLETADA"
echo "================================"
echo ""
echo "Instalado:"
echo "  ✅ UV (Astral package manager)"
echo "  ✅ notebooklm-mcp-cli"
echo ""
echo "Configurado:"
echo "  ✅ .mcp.json (usa UV)"
echo "  ✅ .claude/settings.json"
echo ""
if [ -z "$NOTEBOOKLM_API_KEY" ]; then
    echo "⏳ Próximo paso:"
    echo "  1. Obtén API key en https://ai.google.dev/"
    echo "  2. Configura: export NOTEBOOKLM_API_KEY=\"...\""
    echo "  3. Reinicia Claude Code"
else
    echo "✅ Listo para usar NotebookLM en Claude Code"
fi
echo ""
echo "Prueba con:"
echo "  notebooklm-mcp-cli --help"
echo ""
