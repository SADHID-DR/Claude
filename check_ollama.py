#!/usr/bin/env python3
"""
Script para verificar qué modelo de ollama está disponible localmente.
"""

import requests
import json
import sys

OLLAMA_API_URL = "http://localhost:11434"

def check_ollama_running():
    """Verifica si ollama está corriendo."""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def get_available_models():
    """Obtiene lista de modelos disponibles."""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags")
        data = response.json()
        return data.get("models", [])
    except Exception as e:
        print(f"Error al obtener modelos: {e}")
        return []

def main():
    print("🔍 Verificando ollama...")

    if not check_ollama_running():
        print("❌ Ollama no está corriendo en localhost:11434")
        print("   Inicia ollama con: ollama serve")
        sys.exit(1)

    print("✅ Ollama está corriendo")

    models = get_available_models()

    if not models:
        print("⚠️  No hay modelos descargados")
        print("   Descarga uno con: ollama pull <modelo>")
        sys.exit(1)

    print(f"\n📦 Modelos disponibles ({len(models)}):")
    for model in models:
        name = model.get("name", "Unknown")
        size = model.get("size", 0)
        size_gb = size / (1024**3)
        print(f"   • {name} ({size_gb:.2f} GB)")

    # Mostrar el primer modelo como default
    if models:
        default_model = models[0].get("name", "unknown")
        print(f"\n✨ Modelo por defecto: {default_model}")

if __name__ == "__main__":
    main()
