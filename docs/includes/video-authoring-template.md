# Plantilla interna para publicar un vídeo

Este archivo está excluido del sitio público. Sirve como plantilla única para que un artículo alimente su reproductor, la biblioteca `/videos/`, su página de visualización, el catálogo JSON, el sitemap de vídeo y los datos estructurados.

```yaml
video: "nombre-estable-v1.mp4"
video_poster: "nombre-estable-v1.jpg"
video_duration: "PT1M29S"
video_title: "Título directo que resuelve una intención de búsqueda"
video_summary: "Dos frases que explican qué aprenderá la persona y cuál es el límite principal."
video_captions: "nombre-estable-es-v1.vtt"
video_transcript: "nombre-estable-transcript.md"
video_takeaways:
  - "Primera idea autocontenida."
  - "Segunda idea autocontenida."
  - "Tercera idea autocontenida."
video_chapters:
  - name: "Planteamiento"
    start: 0
    end: 28
  - name: "Mecanismo"
    start: 28
    end: 66
  - name: "Coste, límites y decisión"
    start: 66
    end: 89
```

## Criterios

- Publicar una página de visualización por vídeo completo. Los momentos breves se expresan como capítulos y enlaces `?t=`, no como páginas casi duplicadas.
- Omitir `video_takeaways` cuando los primeros encabezados útiles del artículo ya producen un buen resumen. Añadirlos solo para mejorar la respuesta directa.
- Revisar manualmente subtítulos y transcripción antes de declararlos en el frontmatter.
- Usar nombres versionados. No reemplazar los bytes de un archivo que ya pueda estar cacheado o indexado.
- Mantener el vídeo, el póster, los subtítulos y la transcripción junto al Markdown del artículo para conservar una ruta pública determinista.
- No activar `S5_VIDEO_MEDIA_ORIGIN` hasta que el workflow de R2 haya publicado y verificado CORS, caché y byte ranges.

## Validación local

```bash
make check-video-media
make build
```

El primer comando valida los activos declarados. El segundo compila estrictamente y ejecuta las auditorías de indexación de vídeo y de búsqueda.
