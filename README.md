# 5sigmas - Divulgación de IA sin Hype

> **"From Cave to AGI"** - A technical history of math, philosophy, and engineering.

Este proyecto es un repositorio de conocimiento sobre Inteligencia Artificial, enfocado en la **rigurosidad técnica y la perspectiva histórica**, alejándose del ruido mediático y el "hype" superficial.

El nombre **5sigmas** (5σ) hace referencia al estándar de oro en la física de partículas para declarar un descubrimiento: una certeza estadística de 99.99994%. Buscamos esa misma solidez en nuestras explicaciones.

## 🚀 Quick Start

Este sitio está construido con [MkDocs](https://www.mkdocs.org/) y [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/).

### Prerrequisitos
- Python 3.x
- Make (opcional, pero recomendado)

### Instalación y Ejecución

Hemos simplificado todo en un `Makefile`:

```bash
# 1. Instalar dependencias y levantar el servidor local
make build-and-update
```

El sitio estará disponible en `http://127.0.0.1:8000`.

Otros comandos útiles:
- `make install`: Solo instala las dependencias.
- `make build`: Genera el sitio estático en la carpeta `site/`.
- `make clean`: Limpia archivos temporales.

## 📂 Estructura del Proyecto

```
.
├── docs/
│   ├── index.md                 # Página de inicio
│   ├── assets/                  # Imágenes y logos
│   ├── stylesheets/             # CSS personalizado
│   └── series/                  # Contenido principal organizado por series
│       ├── podcasts.yml         # Base de datos de los podcasts
│       ├── from-cave-to-AGI/    # Serie principal
│       ├── what-is-agi/         # Serie sobre AGI
│       └── ...
├── mkdocs.yml                   # Configuración global
├── main.py                      # Lógica de macros (Players, etc.)
└── Makefile                     # Comandos de automatización
```

## ✍️ Cómo Contribuir / Crear Contenido

### 1. Nueva Serie o Artículo
Crea un archivo Markdown en la carpeta `docs/series/<nombre-serie>/`.
Asegúrate de añadirlo a la navegación en `mkdocs.yml` bajo la sección `nav`.

### 2. Inyectar Reproductores de Podcast
Para añadir un reproductor de audio asociado a una serie, usa la macro personalizada:

```markdown
{{ podcast_player('id-de-la-serie') }}
```

**Pasos:**
1.  Abre `docs/series/podcasts.yml`.
2.  Define el ID de la serie y los datos del audio:
    ```yaml
    id-de-la-serie:
      audio_file: "podcasts/ruta/al/archivo.mp3"
      spotify_url: "https://open.spotify.com/..."
    ```
3.  Inserta la macro en el archivo Markdown donde quieras que aparezca el player.

### 3. Imágenes y Diagramas
- **Imágenes**: Guárdalas en `docs/assets/images/` y úsalas como `![Alt](assets/images/archivo.png)`.
- **Mermaid**: Puedes escribir diagramas directamente en bloques de código:
    ```mermaid
    graph TD;
        A[Cave] --> B[AGI];
    ```

## 🎨 Filosofía de Diseño
- **Minimalismo**: El contenido es el rey.
- **Sin Distracciones**: Evita pop-ups, banners o elementos innecesarios.
- **Estética "Dark Mode"**: Preferimos colores oscuros y acentos cian/teal para una sensación técnica y moderna.

## 🛠️ Despliegue
El sitio está configurado para desplegarse en GitHub Pages:

```bash
make deploy
```
Esto compilará el sitio y lo subirá a la rama `gh-pages`.
