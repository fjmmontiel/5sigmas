# Makefile para el sitio MkDocs + Material

VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
MKDOCS := $(VENV)/bin/mkdocs

.PHONY: install build serve deploy build-and-update clean

# Crear venv e instalar dependencias
install: $(MKDOCS)

$(MKDOCS):
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install mkdocs mkdocs-material pymdown-extensions mkdocs-macros-plugin

# Compilar la web a HTML estático (en ./site)
build: install
	$(MKDOCS) build

# Servir en local con autoreload (http://127.0.0.1:8000)
serve: install
	$(MKDOCS) serve

# Regla principal que tú usarás
# 1) Se asegura de tener todo instalado
# 2) Compila
# 3) Levanta el servidor local
build-and-update: build
	$(MKDOCS) serve

# Servir con soporte para "Range requests" (necesario para seek en video/audio)
serve-media: build
	$(PYTHON) serve_with_ranges.py

# Desplegar a GitHub Pages (gh-pages)
deploy: build
	$(MKDOCS) gh-deploy --clean

# Rutina completa de publicación: Git + Deploy
# Uso: make publish msg="Mi mensaje de commit"
publish: build
	git add .
	git commit -m "$(if $(msg),$(msg),Update content $(shell date '+%Y-%m-%d %H:%M:%S'))"
	git push origin main
	$(MKDOCS) gh-deploy --clean

# Limpiar artefactos
clean:
	rm -rf $(VENV) site
