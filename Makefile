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

# Servir en local (http://127.0.0.1:8000)
serve: install
	$(MKDOCS) serve


build-and-update: build
	-lsof -ti:8000 | xargs kill -9 || true
	$(MKDOCS) serve

# Limpiar artefactos
clean:
	rm -rf $(VENV) site
