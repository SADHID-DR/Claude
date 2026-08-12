# Nemotron 3.5 Lightning Integration

Herramientas para usar Nemotron 3.5 Lightning de NVIDIA via Ollama, con opción de comparar con Claude.

## ⚙️ Requisitos previos

```bash
# Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Instalar requests (Python)
pip install requests

# Descargar Nemotron
ollama pull nemotron-3.5-lightning

# Iniciar Ollama en otra terminal
ollama serve
```

## 🛠️ Herramientas

### 1. CLI Principal: `claude-nemotron-cli`

**Interfaz unificada que siempre te da opciones.**

```bash
# Te pregunta qué modelo usar
./claude-nemotron-cli --ask "Tu pregunta aquí"

# Directamente con Nemotron
./claude-nemotron-cli --nemotron "¿Qué es Python?"

# Directamente con Claude
./claude-nemotron-cli --claude "Explica machine learning"

# Sin opciones, elige automáticamente
./claude-nemotron-cli "¿Cuál es la capital de Francia?"
```

### 2. Cliente Nemotron: `nemotron_client.py`

**Cliente directo para Nemotron.**

```bash
python3 nemotron_client.py "Tu pregunta aquí"

# Ejemplos
python3 nemotron_client.py "Explica brevemente qué es Git"
python3 nemotron_client.py "Dame 3 ejemplos de funciones en Python"
```

### 3. Benchmark: `benchmark_models.py`

**Compara rendimiento y respuestas de Nemotron.**

```bash
# Benchmark con preguntas preestablecidas
python3 benchmark_models.py

# Benchmark con tu pregunta
python3 benchmark_models.py "¿Qué es machine learning?"
```

## 📊 Ejemplos de uso

### Pregunta rápida
```bash
./claude-nemotron-cli --ask "¿Cuál es la diferencia entre var, let y const en JavaScript?"
```

### Comparación de modelos
```bash
python3 benchmark_models.py "Explica brevemente Python"
```

### Análisis de código
```bash
python3 nemotron_client.py "¿Qué hace este código? function sum(a, b) { return a + b; }"
```

## 🔄 Workflow típico

1. **Iniciar Ollama** (en otra terminal):
   ```bash
   ollama serve
   ```

2. **Usar la CLI**:
   ```bash
   ./claude-nemotron-cli --ask "Tu pregunta"
   ```

3. **Ver la respuesta**:
   Se mostrará en streaming en tu terminal

## 📝 Notas

- **Nemotron** es rápido y ligero (7B parámetros)
- **Claude** es más potente pero requiere esta sesión de Claude Code
- Siempre tienes la opción de elegir con `--ask`
- Los modelos se cachean localmente, así que las preguntas repetidas son más rápidas

## 🚀 Próximos pasos

- [ ] Crear skill de Claude Code que integre estas herramientas
- [ ] Agregar logging de resultados
- [ ] Crear dashboard de benchmarks
