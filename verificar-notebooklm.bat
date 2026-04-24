@echo off
REM Script de verificación: NotebookLM MCP en Windows
REM Verifica que todo está instalado y configurado correctamente

echo.
echo ================================
echo Verificando NotebookLM MCP
echo ================================
echo.

REM Paso 1: Verificar UV
echo [1/4] Verificando UV...
where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ UV está instalado
    uv --version
) else (
    echo ❌ UV no está instalado
    echo   Ejecuta: powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
    goto error
)
echo.

REM Paso 2: Verificar notebooklm-mcp-cli
echo [2/4] Verificando notebooklm-mcp-cli...
where notebooklm-mcp-cli >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ notebooklm-mcp-cli está instalado
    notebooklm-mcp-cli --version 2>nul || echo (versión no disponible)
) else (
    echo ❌ notebooklm-mcp-cli no está instalado
    echo   Ejecuta: uv tool install notebooklm-mcp-cli
    goto error
)
echo.

REM Paso 3: Verificar API Key
echo [3/4] Verificando NOTEBOOKLM_API_KEY...
if defined NOTEBOOKLM_API_KEY (
    echo ✅ API Key está configurada
    REM Mostrar solo primeros caracteres por seguridad
    setlocal enabledelayedexpansion
    set "key=!NOTEBOOKLM_API_KEY!"
    set "key=!key:~0,10!..."
    echo   Valor: !key!
) else (
    echo ❌ API Key NO está configurada
    echo   Ejecuta en PowerShell (como Admin):
    echo   [Environment]::SetEnvironmentVariable("NOTEBOOKLM_API_KEY", "tu-key", "User")
    goto error
)
echo.

REM Paso 4: Verificar .mcp.json
echo [4/4] Verificando .mcp.json...
if exist ".mcp.json" (
    echo ✅ .mcp.json encontrado
    findstr /M "notebooklm-mcp-cli" ".mcp.json" >nul
    if %errorlevel% equ 0 (
        echo ✅ Configurado para UV
    ) else (
        echo ⚠️  Podría no estar configurado para UV
    )
) else (
    echo ⚠️  .mcp.json no encontrado
    echo   (debería estar en el directorio del proyecto)
)
echo.

echo ================================
echo ✨ VERIFICACIÓN COMPLETADA
echo ================================
echo.
echo Estado: LISTO PARA USAR
echo.
echo Próximo paso:
echo 1. Reinicia Claude Code
echo 2. Dile: "Analiza este documento con NotebookLM"
echo 3. ¡Debería funcionar automáticamente!
echo.
goto end

:error
echo.
echo ❌ Hay problemas con la instalación
echo   Revisa los pasos arriba
echo.

:end
pause
