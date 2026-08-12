#!/usr/bin/env python3
"""
Cliente para interactuar con Nemotron 3.5 Lightning via Ollama.
"""

import requests
import json
import sys

OLLAMA_API_URL = "http://localhost:11434"
MODEL = "nemotron-3.5-lightning"

def check_ollama_running():
    """Verifica si ollama está corriendo."""
    try:
        response = requests.get(f"{OLLAMA_API_URL}/api/tags", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False

def run_prompt(prompt, stream=True):
    """Ejecuta un prompt en nemotron."""
    if not check_ollama_running():
        print("❌ Ollama no está corriendo. Inicia con: ollama serve")
        return None

    try:
        response = requests.post(
            f"{OLLAMA_API_URL}/api/generate",
            json={"model": MODEL, "prompt": prompt, "stream": stream},
            timeout=300
        )

        if response.status_code == 200:
            if stream:
                result = ""
                for line in response.iter_lines():
                    if line:
                        data = json.loads(line)
                        result += data.get("response", "")
                        if not data.get("done"):
                            sys.stdout.write(data.get("response", ""))
                            sys.stdout.flush()
                return result
            else:
                return response.json().get("response", "")
        else:
            print(f"❌ Error {response.status_code}: {response.text}")
            return None
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Uso: python3 nemotron_client.py '<tu prompt aquí>'")
        print("\nEjemplo:")
        print("  python3 nemotron_client.py 'Explica qué es Python'")
        sys.exit(1)

    prompt = " ".join(sys.argv[1:])
    print(f"🤖 Nemotron 3.5 Lightning\n")
    print(f"Prompt: {prompt}\n")
    print("Respuesta:")
    print("-" * 50)

    result = run_prompt(prompt)
    if result:
        print("\n" + "-" * 50)
        print("✅ Listo")

if __name__ == "__main__":
    main()
