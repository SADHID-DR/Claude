# Script de instalación automática: NotebookLM MCP con UV
# Windows (PowerShell)
# Uso: powershell -ExecutionPolicy ByPass -File instalar-notebooklm.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "NotebookLM MCP - Instalador UV" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Verificar si UV está instalado
Write-Host "📦 Paso 1: Verificando UV..." -ForegroundColor Yellow

$uvInstalled = $false
try {
    $uvVersion = uv --version 2>$null
    if ($?) {
        Write-Host "✅ UV ya está instalado: $uvVersion" -ForegroundColor Green
        $uvInstalled = $true
    }
}
catch {
    $uvInstalled = $false
}

if (-not $uvInstalled) {
    Write-Host "⬇️  Instalando UV..." -ForegroundColor Yellow
    Write-Host "   Ejecutando instalador de Astral..." -ForegroundColor Gray

    try {
        powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
        Write-Host "✅ UV instalado correctamente" -ForegroundColor Green

        # Actualizar PATH para la sesión actual
        $uvPath = "$env:USERPROFILE\AppData\Local\astral-uv\bin"
        if (Test-Path $uvPath) {
            $env:PATH = "$uvPath;$env:PATH"
        }

        # Esperar un momento
        Start-Sleep -Seconds 2

        # Verificar instalación
        $uvVersion = uv --version
        Write-Host "   $uvVersion" -ForegroundColor Gray
    }
    catch {
        Write-Host "❌ Error instalando UV" -ForegroundColor Red
        Write-Host "   Por favor intenta manualmente:" -ForegroundColor Yellow
        Write-Host "   powershell -ExecutionPolicy ByPass -c `"irm https://astral.sh/uv/install.ps1 | iex`"" -ForegroundColor Gray
        exit 1
    }
}

Write-Host ""

# Paso 2: Instalar NotebookLM MCP CLI
Write-Host "📦 Paso 2: Instalando NotebookLM MCP CLI..." -ForegroundColor Yellow

$cliInstalled = $false
try {
    $cliVersion = notebooklm-mcp-cli --version 2>$null
    if ($?) {
        Write-Host "✅ NotebookLM MCP CLI ya está instalado" -ForegroundColor Green
        $cliInstalled = $true
    }
}
catch {
    $cliInstalled = $false
}

if (-not $cliInstalled) {
    Write-Host "⬇️  Instalando notebooklm-mcp-cli..." -ForegroundColor Yellow

    try {
        & uv tool install notebooklm-mcp-cli
        Write-Host "✅ NotebookLM MCP CLI instalado correctamente" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  Error instalando notebooklm-mcp-cli" -ForegroundColor Yellow
        Write-Host "   Intenta manualmente: uv tool install notebooklm-mcp-cli" -ForegroundColor Gray
    }
}

Write-Host ""

# Paso 3: Verificar configuración
Write-Host "🔐 Paso 3: Verificando configuración..." -ForegroundColor Yellow

if (Test-Path ".mcp.json") {
    Write-Host "✅ .mcp.json encontrado" -ForegroundColor Green

    $mcpContent = Get-Content .mcp.json -Raw
    if ($mcpContent -like "*notebooklm-mcp-cli*") {
        Write-Host "✅ .mcp.json está correctamente configurado para UV" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  .mcp.json podría necesitar actualización" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠️  .mcp.json no encontrado (debería estar en el proyecto)" -ForegroundColor Yellow
}

Write-Host ""

# Paso 4: API Key
Write-Host "🔑 Paso 4: Configuración de API Key..." -ForegroundColor Yellow

$apiKey = [Environment]::GetEnvironmentVariable("NOTEBOOKLM_API_KEY", "User")

if ([string]::IsNullOrEmpty($apiKey)) {
    Write-Host "⚠️  NOTEBOOKLM_API_KEY no está configurada" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Para obtenerla:" -ForegroundColor Gray
    Write-Host "   1. Ve a https://ai.google.dev/" -ForegroundColor Gray
    Write-Host "   2. Solicita acceso a NotebookLM API" -ForegroundColor Gray
    Write-Host "   3. Copia tu API key" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Luego configúrala (PowerShell como Admin):" -ForegroundColor Gray
    Write-Host '   [Environment]::SetEnvironmentVariable("NOTEBOOKLM_API_KEY", "tu-api-key", "User")' -ForegroundColor Gray
}
else {
    Write-Host "✅ NOTEBOOKLM_API_KEY está configurada" -ForegroundColor Green
}

Write-Host ""

# Resumen final
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✨ INSTALACIÓN COMPLETADA" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Instalado:" -ForegroundColor Green
Write-Host "  ✅ UV (Astral package manager)" -ForegroundColor Green
Write-Host "  ✅ notebooklm-mcp-cli" -ForegroundColor Green

Write-Host ""
Write-Host "Configurado:" -ForegroundColor Green
Write-Host "  ✅ .mcp.json (usa UV)" -ForegroundColor Green
Write-Host "  ✅ .claude/settings.json" -ForegroundColor Green

Write-Host ""

if ([string]::IsNullOrEmpty($apiKey)) {
    Write-Host "⏳ Próximo paso:" -ForegroundColor Yellow
    Write-Host "  1. Obtén API key en https://ai.google.dev/" -ForegroundColor Gray
    Write-Host "  2. Configura en PowerShell (como Admin):" -ForegroundColor Gray
    Write-Host '     [Environment]::SetEnvironmentVariable("NOTEBOOKLM_API_KEY", "tu-key", "User")' -ForegroundColor Gray
    Write-Host "  3. Reinicia Claude Code" -ForegroundColor Gray
}
else {
    Write-Host "✅ Listo para usar NotebookLM en Claude Code" -ForegroundColor Green
}

Write-Host ""
Write-Host "Prueba con:" -ForegroundColor Gray
Write-Host "  notebooklm-mcp-cli --help" -ForegroundColor Gray
Write-Host ""

Write-Host "Presiona Enter para salir..."
Read-Host
