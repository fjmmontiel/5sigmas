VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
MKDOCS := $(VENV)/bin/mkdocs
MKDOCS_ENV := DISABLE_MKDOCS_2_WARNING=true NO_MKDOCS_2_WARNING=true

.PHONY: help install build serve build-and-update up clean check-animation-branding check-video-indexing check-search-foundation

# Fachada pública: build/preview del site y operaciones mínimas de curación/publicación.
help:
	@printf '%s\n' \
		"install                    crea .venv e instala dependencias base" \
		"check-animation-branding   valida snippets/branding usando el tooling canónico" \
		"check-video-indexing       valida el metadata de indexación de vídeo" \
		"check-search-foundation    valida SEO técnico, sitemap, enlaces y llms.txt" \
		"build                      compila el site público + auditorías de indexado" \
		"serve                      levanta MkDocs en local"

# Crear venv e instalar dependencias
install: $(MKDOCS)

$(MKDOCS):
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt watchdog==6.0.0

# Compilar la web a HTML estático (en ./site)
build: install check-animation-branding
	$(MKDOCS_ENV) MKDOCS_REDIRECTS=true $(MKDOCS) build --strict
	$(PYTHON) scripts/audit_video_indexing.py
	$(PYTHON) scripts/audit_search_foundation.py

# Servir en local (http://127.0.0.1:8000)
serve: install
	$(MKDOCS_ENV) MKDOCS_REDIRECTS=true $(MKDOCS) serve


up: build-and-update

build-and-update: install
	-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	$(MKDOCS_ENV) MKDOCS_REDIRECTS=true WATCHDOG_FORCE_POLLING=1 $(MKDOCS) serve

check-animation-branding: install
	$(PYTHON) scripts/validate_animation_branding.py

check-video-indexing: install
	$(PYTHON) scripts/audit_video_indexing.py

check-search-foundation: install
	@test -d site || (echo "site/ no existe; ejecuta 'make build' primero" && exit 1)
	$(PYTHON) scripts/audit_search_foundation.py

# Limpiar artefactos
clean:
	rm -rf $(VENV) site
