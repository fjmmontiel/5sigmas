VENV := .venv
PYTHON := $(VENV)/bin/python
PIP := $(VENV)/bin/pip
MKDOCS := $(VENV)/bin/mkdocs
MKDOCS_ENV := DISABLE_MKDOCS_2_WARNING=true NO_MKDOCS_2_WARNING=true

.PHONY: install build serve deploy build-and-update up clean check-animation-branding check-video-indexing video-notebooklm-jobs video-article-payloads video-render-articles video-catalog video-audit video-suite-manifests video-render-suite video-suite video-datacenter-options video-render-datacenter-options video-feedback-frames video-datacenter-feedback video-iteration-bundle video-all

# Crear venv e instalar dependencias
install: $(MKDOCS)

$(MKDOCS):
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt watchdog==6.0.0

# Compilar la web a HTML estático (en ./site)
build: install check-animation-branding
	$(MKDOCS_ENV) MKDOCS_REDIRECTS=false $(MKDOCS) build --strict
	$(PYTHON) scripts/audit_video_indexing.py

# Servir en local (http://127.0.0.1:8000)
serve: install
	$(MKDOCS_ENV) $(MKDOCS) serve


up: build-and-update

build-and-update: install
	-lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	$(MKDOCS_ENV) MKDOCS_REDIRECTS=false WATCHDOG_FORCE_POLLING=1 $(MKDOCS) serve



check-animation-branding:
	python3 scripts/validate_animation_branding.py

check-video-indexing:
	$(PYTHON) scripts/audit_video_indexing.py

# Limpiar artefactos
clean:
	rm -rf $(VENV) site

video-notebooklm-jobs: install
	$(PYTHON) scripts/build_notebooklm_article_jobs.py

video-article-payloads: install
	$(PYTHON) scripts/build_article_video_payloads.py --source-mode auto

video-render-articles: video-article-payloads
	cd tools/remotion && npm run render:batch -- --payload-root ../../video/manifests/articles --out-root ../../docs/series --skip-webm

video-catalog: install
	$(PYTHON) scripts/build_video_catalog.py

video-audit: install
	$(PYTHON) scripts/build_video_audit.py

video-suite-manifests: video-article-payloads
	$(PYTHON) scripts/build_video_suite.py

video-render-suite: video-suite-manifests
	cd tools/remotion && npm run render:batch -- --payload-root ../../video/manifests/suite --out-root ../../docs/series --skip-webm

video-suite: video-render-suite video-catalog video-audit

video-datacenter-options: install
	$(PYTHON) scripts/build_datacenter_feedback_options.py

video-render-datacenter-options: video-datacenter-options
	cd tools/remotion && npm run render:batch -- --payload-root ../../video/manifests/feedback/datacenters-espacio --out-root ../../docs/series --skip-webm

video-feedback-frames: video-render-datacenter-options
	cd tools/remotion && npm run extract:frames -- --video ../../docs/series/datacenters-espacio/videos/01-por-que-ahora-pulse-core-teaser.mp4 --out-dir ../../output/video-frames/datacenters-espacio/pulse-core
	cd tools/remotion && npm run extract:frames -- --video ../../docs/series/datacenters-espacio/videos/01-por-que-ahora-pulse-orbit-teaser.mp4 --out-dir ../../output/video-frames/datacenters-espacio/pulse-orbit
	cd tools/remotion && npm run extract:frames -- --video ../../docs/series/datacenters-espacio/videos/01-por-que-ahora-pulse-cascade-teaser.mp4 --out-dir ../../output/video-frames/datacenters-espacio/pulse-cascade

video-datacenter-feedback: video-feedback-frames video-catalog video-audit

video-iteration-bundle: video-feedback-frames
	$(PYTHON) scripts/build_video_iteration_bundle.py

video-all: video-notebooklm-jobs video-article-payloads video-render-articles video-catalog video-audit
