# Script de verificación: NotebookLM MCP en Windows
# Uso: powershell -ExecutionPolicy ByPass -File verificar-notebooklm.ps1

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Verificando NotebookLM MCP" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Paso 1: Verificar UV
Write-Host "[1/4] Verificando UV..." -ForegroundColor Yellow
try {
    $uvVersion = uv --version 2>$null
    if ($?) {
        Write-Host "✅ UV está instalado" -ForegroundColor Green
        Write-Host "   $uvVersion" -ForegroundColor Gray
    } else {
        throw "UV no encontrado"
    }
}
catch {
    Write-Host "❌ UV no está instalado" -ForegroundColor Red
    Write-Host "   Ejecuta: powershell -ExecutionPolicy ByPass -c `"irm https://astral.sh/uv/install.ps1 | iex`"" -ForegroundColor Gray
    $allGood = $false
}
Write-Host ""

# Paso 2: Verificar notebooklm-mcp-cli
Write-Host "[2/4] Verificando notebooklm-mcp-cli..." -ForegroundColor Yellow
try {
    $cliVersion = notebooklm-mcp-cli --version 2>$null
    if ($?) {
        Write-Host "✅ notebooklm-mcp-cli está instalado" -ForegroundColor Green
        Write-Host "   $cliVersion" -ForegroundColor Gray
    } else {
        throw "CLI no encontrado"
    }
}
catch {
    Write-Host "❌ notebooklm-mcp-cli no está instalado" -ForegroundColor Red
    Write-Host "   Ejecuta: uv tool install notebooklm-mcp-cli" -ForegroundColor Gray
    $allGood = $false
}
Write-Host ""

# Paso 3: Verificar API Key
Write-Host "[3/4] Verificando NOTEBOOKLM_API_KEY..." -ForegroundColor Yellow
$apiKey = [Environment]::GetEnvironmentVariable("NOTEBOOKLM_API_KEY", "User")

if (-not [string]::IsNullOrEmpty($apiKey)) {
    Write-Host "✅ API Key está configurada" -ForegroundColor Green
    # Mostrar solo primeros caracteres por seguridad
    $maskedKey = $apiKey.Substring(0, [Math]::Min(10, $apiKey.Length)) + "..."
    Write-Host "   Valor: $maskedKey" -ForegroundColor Gray
} else {
    Write-Host "❌ API Key NO está configurada" -ForegroundColor Red
    Write-Host "   Ejecuta en PowerShell (como Admin):" -ForegroundColor Gray
    Write-Host '   [Environment]::SetEnvironmentVariable("NOTEBOOKLM_API_KEY", "tu-key", "User")' -ForegroundColor Gray
    $allGood = $false
}
Write-Host ""

# Paso 4: Verificar .mcp.json
Write-Host "[4/4] Verificando .mcp.json..." -ForegroundColor Yellow
if (Test-Path ".mcp.json") {
    Write-Host "✅ .mcp.json encontrado" -ForegroundColor Green

    $mcpContent = Get-Content .mcp.json -Raw
    if ($mcpContent -like "*notebooklm-mcp-cli*") {
        Write-Host "✅ Configurado para UV" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Podría no estar configurado para UV" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .mcp.json no encontrado" -ForegroundColor Yellow
    Write-Host "   (debería estar en el directorio del proyecto)" -ForegroundColor Gray
}
Write-Host ""

# Resumen final
Write-Host "================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✨ VERIFICACIÓN COMPLETADA - TODO OK" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Estado: ✅ LISTO PARA USAR" -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Yellow
    Write-Host "1. Reinicia Claude Code (cierra y abre)" -ForegroundColor Gray
    Write-Host "2. Dile a Claude: `"Analiza este documento con NotebookLM`"" -ForegroundColor Gray
    Write-Host "3. ¡Debería funcionar automáticamente!" -ForegroundColor Gray
} else {
    Write-Host "❌ HAY PROBLEMAS - VER ARRIBA" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Revisa los errores marcados arriba" -ForegroundColor Yellow
    Write-Host "y sigue las instrucciones para corregirlos" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Presiona Enter para salir..."
Read-Host
