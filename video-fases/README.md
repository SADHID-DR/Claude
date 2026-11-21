# video-fases

Videos MP4 con animación Remotion y narración en español generada con edge-tts.

## Instalación

```bash
npm install
pip install -r requirements.txt
```

## Uso

1. Edita `src/guion.json`. Cada escena lleva `id`, `titulo`, `narracion`, `puntos`, `foto`, `foco` y `zoom`.
2. Copia las fotos a `public/fotos`. Esa carpeta queda fuera de Git.
3. Ejecuta `npm run video`. Genera un MP3 por escena en `public/audio` y renderiza `out/video.mp4`.

`npm run voz` genera solo los audios. Reutiliza los MP3 cuya narración no cambió.

`npm run dev` abre Remotion Studio para previsualizar.

## Sincronía

Cada escena dura lo que mide su MP3 más medio segundo. Sin MP3, la duración sale de una estimación de 2.5 palabras por segundo y el video queda mudo.

## Voces

`es-DO-RamonaNeural` y `es-DO-EmilioNeural`. Lista completa con `edge-tts --list-voices`. La voz se fija en el campo `voz` del guion.

## Fotos

`foco` marca el punto de la imagen hacia el que se acerca la cámara, en porcentaje horizontal y vertical. `zoom` fija la escala inicial y final de la escena. `ancho` y `alto` del guion definen el formato del video.
