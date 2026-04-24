#!/usr/bin/env python3
"""
Script de ejemplo: Procesar salida de NotebookLM con Claude

Este script muestra el flujo de:
1. Leer análisis de NotebookLM
2. Depurar y estructurar la información
3. Generar output útil
"""

import re
import json
from pathlib import Path

def leer_analisis_notebooklm(archivo):
    """Lee el archivo procesado por NotebookLM"""
    with open(archivo, 'r', encoding='utf-8') as f:
        return f.read()

def extraer_secciones(contenido):
    """Extrae secciones del análisis"""
    secciones = {}

    # Extractores simples basados en patrones
    if "RESUMEN GENERAL:" in contenido:
        inicio = contenido.find("RESUMEN GENERAL:") + len("RESUMEN GENERAL:")
        fin = contenido.find("PUNTOS EXTRAÍDOS")
        secciones['resumen'] = contenido[inicio:fin].strip()

    if "PUNTOS EXTRAÍDOS" in contenido:
        inicio = contenido.find("PUNTOS EXTRAÍDOS")
        fin = contenido.find("SECCIONES IDENTIFICADAS")
        puntos_texto = contenido[inicio:fin]
        puntos = [p.strip() for p in puntos_texto.split('-')[1:] if p.strip()]
        secciones['puntos'] = puntos

    if "SECCIONES IDENTIFICADAS:" in contenido:
        inicio = contenido.find("SECCIONES IDENTIFICADAS:")
        fin = contenido.find("DATOS MENCIONADOS")
        secciones_texto = contenido[inicio:fin]
        secciones['estructura'] = [s.strip() for s in secciones_texto.split('\n')[1:] if s.strip()]

    if "DATOS MENCIONADOS" in contenido:
        inicio = contenido.find("DATOS MENCIONADOS")
        fin = contenido.find("REFERENCIAS ENCONTRADAS")
        datos_texto = contenido[inicio:fin]
        datos = [d.strip() for d in datos_texto.split('\n')[1:] if d.strip() and '-' in d]
        secciones['datos'] = datos

    return secciones

def depurar_puntos(puntos):
    """Depura y categoriza los puntos extraídos"""
    categorias = {
        'tecnologia': [],
        'empresa': [],
        'desafios': [],
        'regulacion': [],
        'otros': []
    }

    for punto in puntos:
        punto_lower = punto.lower()
        if any(x in punto_lower for x in ['llm', 'gpt', 'modelo', 'claude', 'rag']):
            categorias['tecnologia'].append(punto)
        elif any(x in punto_lower for x in ['empresa', 'corporat', 'adopci']):
            categorias['empresa'].append(punto)
        elif any(x in punto_lower for x in ['desafio', 'problema', 'hallucination', 'sesgo']):
            categorias['desafios'].append(punto)
        elif any(x in punto_lower for x in ['regulaci', 'ley', 'eu', 'act', 'governanza']):
            categorias['regulacion'].append(punto)
        else:
            categorias['otros'].append(punto)

    return categorias

def generar_reporte(archivo_notebooklm):
    """Genera un reporte depurado"""
    print("=" * 60)
    print("PROCESADOR DE ANÁLISIS NOTEBOOKLM -> CLAUDE")
    print("=" * 60)

    # Leer
    print("\n📖 Leyendo análisis de NotebookLM...")
    contenido = leer_analisis_notebooklm(archivo_notebooklm)

    # Extraer
    print("🔍 Extrayendo secciones...")
    secciones = extraer_secciones(contenido)

    # Depurar
    print("🧹 Depurando y categorizando información...\n")

    # Resumen
    print("📋 RESUMEN EJECUTIVO")
    print("-" * 60)
    print(secciones.get('resumen', 'N/A'))

    # Puntos categorizados
    if 'puntos' in secciones:
        categorias = depurar_puntos(secciones['puntos'])

        print("\n\n📌 PUNTOS CLAVE (CATEGORIZADOS)")
        print("-" * 60)

        for categoria, items in categorias.items():
            if items:
                print(f"\n{categoria.upper()}:")
                for item in items:
                    print(f"  • {item}")

    # Estructura
    if 'estructura' in secciones:
        print("\n\n🏗️  ESTRUCTURA DEL DOCUMENTO")
        print("-" * 60)
        for i, seccion in enumerate(secciones['estructura'], 1):
            print(f"  {i}. {seccion}")

    # Datos importantes
    if 'datos' in secciones:
        print("\n\n📊 DATOS CLAVE")
        print("-" * 60)
        for dato in secciones['datos']:
            print(f"  • {dato}")

    # Recomendaciones
    print("\n\n💡 RECOMENDACIONES PARA CLAUDE")
    print("-" * 60)
    print("  1. Los puntos ya están organizados por categoría")
    print("  2. Enfocarse en desafíos para análisis más profundos")
    print("  3. Validar datos numéricos con fuentes externas")
    print("  4. Conectar regulación con casos de implementación empresarial")

    print("\n" + "=" * 60)
    print("✅ Análisis completado. Información lista para Claude.")
    print("=" * 60)

if __name__ == "__main__":
    archivo = Path(__file__).parent / "ejemplo-notebooklm.txt"

    if archivo.exists():
        generar_reporte(archivo)
    else:
        print(f"❌ Archivo no encontrado: {archivo}")
