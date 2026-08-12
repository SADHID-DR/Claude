#!/usr/bin/env python3
"""
Benchmark: Compara respuestas entre Claude y Nemotron.
"""

import requests
import json
import sys
import time
from datetime import datetime

OLLAMA_API_URL = "http://localhost:11434"
NEMOTRON_MODEL = "nemotron-3.5-lightning"

def check_ollama_running():
    """Verifica si ollama está corriendo."""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def run_nemotron(prompt):
    """Ejecuta prompt en Nemotron y retorna respuesta + tiempo."""
    if not check_ollama_running():
        return None, None, "Ollama no está corriendo"

    try:
        start = time.time()
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json={"model": NEMOTRON_MODEL, "prompt": prompt, "stream": False},
            timeout=300
        )
        elapsed = time.time() - start

        if response.status_code == 200:
            result = response.json().get("response", "")
            return result, elapsed, None
        else:
            return None, None, f"Error {response.status_code}"
    except Exception as e:
        return None, None, str(e)

def benchmark_question(question):
    """Ejecuta una pregunta en Nemotron y reporta."""
    print(f"\n📋 Pregunta: {question}")
    print("-" * 60)

    # Nemotron
    print("⏳ Ejecutando en Nemotron...")
    nemotron_resp, nemotron_time, nemotron_err = run_nemotron(question)

    if nemotron_err:
        print(f"❌ Nemotron error: {nemotron_err}")
    else:
        print(f"✅ Nemotron ({nemotron_time:.2f}s):")
        print(f"   {nemotron_resp[:200]}..." if len(nemotron_resp) > 200 else f"   {nemotron_resp}")

    print("-" * 60)

def main():
    questions = [
        "¿Qué es machine learning?",
        "Explica brevemente qué es Python",
        "¿Cuál es la diferencia entre AI y machine learning?",
    ]

    if len(sys.argv) > 1:
        questions = [" ".join(sys.argv[1:])]

    print("🔬 Benchmark: Nemotron 3.5 Lightning")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    for q in questions:
        benchmark_question(q)

    print("\n✨ Benchmark completado")

if __name__ == "__main__":
    main()
