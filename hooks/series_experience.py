"""Source-derived series explorer and causal scenes. Review-only, no media rewrites."""
from __future__ import annotations
import json
import re
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
import yaml
from mkdocs.utils.meta import get_data

ROOT = Path(__file__).resolve().parents[1]
CURRICULUM = json.loads((ROOT / 'hooks/series_curriculum.json').read_text(encoding='utf-8'))
SERIES, PAGE_MAP = [], {}
PREFIX, EN = '', False
GUIDES = {'seguridad-ia':'security','agentes-ia':'agent','agentes-voz-tiempo-real':'voice',
          'coding-agents-agent-harnesses':'coding','context-engineering-memory-mcp':'context',
          'llm-inference-engineering-economics':'inference','evaluating-ai-systems-production':'evaluation'}
PROTECTED = {'series/modelos-razonadores/01-que-es-razonar.md',
             'videos/series/agentes-ia/03-como-evaluar-un-agente.md'}

def t(es, en): return en if EN else es
def esc(value): return escape(str(value or ''), quote=True)
def local(value): return value['en' if EN else 'es']
def target(s): return f'{PREFIX}/series/#serie-{s["slug"]}'
def route(path):
    p=Path(path)
    relative=p.parent.as_posix() if p.name=='index.md' else p.with_suffix('').as_posix()
    return f'{PREFIX}/{relative.strip("/")}/'

def media(meta, src, files, docs_dir):
    video=str(meta.get('video') or '')
    if not video or '://' in video: return {}
    parent=Path(src).parent
    poster=str(meta.get('video_poster') or Path(video).with_suffix('.jpg'))
    watch=(Path('videos')/parent/Path(video).with_suffix('.md')).as_posix()
    if not files.get_file_from_path(watch): return {}
    if not (Path(docs_dir)/parent/video).is_file() or not (Path(docs_dir)/parent/poster).is_file(): return {}
    result={'poster':f'{PREFIX}/{parent.as_posix()}/{poster}', 'watch':route(watch),
            'video':f'{PREFIX}/{parent.as_posix()}/{video}'}
    vtt=str(meta.get('video_captions') or Path(video).with_suffix('.vtt').as_posix())
    if (Path(docs_dir)/parent/vtt).is_file(): result['track']=f'{PREFIX}/{parent.as_posix()}/{vtt}'
    return result

def on_files(files, config, **kwargs):
    global SERIES, PAGE_MAP, PREFIX, EN
    extra=config.get('extra') or {}
    EN=str(extra.get('content_language') or 'es').startswith('en')
    PREFIX='/en' if EN else ''
    SERIES, PAGE_MAP=[],{}
    declared=yaml.safe_load((ROOT/'locales/en/media.yml').read_text()) or {} if EN else {}
    label=(extra.get('reader_ui') or {}).get('learn_section','Aprender')
    sections=next((item[label] for item in config.get('nav',[]) if isinstance(item,dict) and label in item),[])
    for section in sections:
        if not isinstance(section,dict): continue
        title,items=next(iter(section.items()))
        if not isinstance(items,list): continue
        entries=[]
        for item in items:
            src=item if isinstance(item,str) else next(iter(item.values()))
            if not isinstance(src,str) or not src.startswith('series/'): continue
            file=files.get_file_from_path(src)
            if file is None: raise ValueError(f'Missing series source: {src}')
            meta=get_data(file.content_string)[1]
            meta.update(declared.get(src,{}))
            entries.append({'src':src,'url':route(src),'title':str(meta.get('title') or (next(iter(item.keys())) if isinstance(item,dict) else Path(src).stem)),
                            'description':str(meta.get('description') or ''),**media(meta,src,files,config['docs_dir'])})
        if not entries: continue
        slug=Path(entries[0]['src']).parts[1]
        chapters=[e for e in entries if not Path(e['src']).name.startswith('00')]
        intro=next((e for e in entries if Path(e['src']).name.startswith('00')),None)
        curriculum=CURRICULUM['series'][slug]
        if curriculum['lessons'] and len(curriculum['lessons'])!=len(chapters): raise ValueError(f'Curriculum drift: {slug}')
        s={'slug':slug,'number':len(SERIES)+1,'title':str(title),'chapters':chapters,'intro':intro,
           'description':local(curriculum['promise']),'curriculum':curriculum,'entries':entries,
           'facets':[p['id'] for p in CURRICULUM['paths'] if slug in p['series']]}
        SERIES.append(s)
        for e in entries:
            PAGE_MAP[e['src']]=(s,e)
            if e.get('watch'): PAGE_MAP['videos/'+e['src']]=(s,e)
    if len(SERIES)!=13 or sum(len(s['chapters']) for s in SERIES)!=67: raise ValueError('Series inventory requires review')
    return files

# Mechanism-only covers: no tiny slide text, stock art, fonts or regenerated videos.
def cover(s, small=False):
    n=s['number']; kind=GUIDES.get(s['slug'],'foundation')
    if n==1: art='<circle cx="66" cy="60" r="19"/><circle cx="66" cy="122" r="19"/><path d="M85 60L150 90M85 122L150 90M150 90L210 90"/><rect x="150" y="63" width="60" height="54" rx="4"/><path class="sx-ink" d="M210 90H270"/><circle class="sx-fill" cx="278" cy="90" r="12"/>'
    elif n==2: art='<path d="M36 115H302"/>'+''.join(f'<circle cx="{x}" cy="115" r="{r}"/><path d="M{x} {115-r}V{y}"/>' for x,r,y in [(55,7,80),(119,10,62),(191,13,42),(273,18,22)])
    elif n==3: art='<rect x="40" y="38" width="58" height="48" rx="3"/><path d="M45 77L63 58L80 68L92 52"/><path d="M40 124h58M40 137h42M240 59h55M240 74h42M240 89h49"/><path d="M104 65L166 90L230 72M104 126L166 90L239 129"/><circle class="sx-fill" cx="167" cy="90" r="18"/>'
    elif n==4: art='<path d="M28 90H72L137 40M72 90H137M72 90L137 140M164 40L244 90M164 90H244M164 140L244 90M244 90H300"/>'+''.join(f'<circle cx="150" cy="{y}" r="13"/>' for y in [40,90,140])+'<circle class="sx-fill" cx="274" cy="90" r="11"/>'
    elif n==5: art='<path d="M34 149H300M34 149V30"/>'+''.join(f'<rect x="{x}" y="{y}" width="32" height="{149-y}"/>' for x,y in [(65,106),(126,80),(187,67),(248,40)])+'<path class="sx-ink" d="M62 119L144 73L203 84L280 28"/>'
    elif n==6: art='<circle cx="101" cy="130" r="56"/><path d="M37 130H166M101 74V171"/><rect x="205" y="33" width="43" height="43" rx="3"/><path d="M180 55H205M248 55H277M181 42v25M277 42v25M143 101L205 77"/><path class="sx-ink" d="M249 92l32 29m-25-3 25 3-4-23"/>'
    elif kind=='security': art='<rect x="38" y="51" width="60" height="82" rx="4"/><path d="M51 69H84M51 82H84M51 96H76M110 91H169M185 35v114M185 91H255"/><rect class="sx-fill" x="173" y="75" width="24" height="30" rx="3"/><path d="M258 85l8 8 21-25" class="sx-ink"/>'
    elif kind=='agent': art='<path d="M69 57H269V128H69V57M258 49l12 8-12 8M81 120l-12 8 12 8"/>'+''.join(f'<rect x="{x}" y="{y}" width="48" height="38" rx="4" class="{cl}"/>' for x,y,cl in [(44,38,''),(245,38,'sx-fill'),(245,109,''),(44,109,'')])
    elif kind=='voice': art='<path d="M31 54H310M31 125H310"/>'+''.join(f'<path class="{cl}" d="M{x} {mid-h}v{h*2}"/>' for mid,start,cl in [(54,44,''),(125,166,'sx-ink')] for x,h in [(start+i*9,8+(i*7)%24) for i in range(14)])+'<path d="M202 24V156" stroke-dasharray="4 5"/>'
    elif kind=='coding': art='<rect x="37" y="31" width="173" height="125" rx="4"/><path d="M53 59H192M53 85H146M53 112H183M53 137H123"/><path class="sx-ink" d="M220 87h44m-12-9 12 9-12 9M268 125l11 11 30-37"/>'
    elif kind=='context': art=''.join(f'<rect x="{30+i*13}" y="{30+i*25}" width="75" height="35" rx="3"/>' for i in range(4))+'<path d="M130 90H185"/><rect x="194" y="30" width="108" height="123" rx="4"/><rect class="sx-fill" x="207" y="43" width="80" height="26" rx="2"/><rect x="207" y="79" width="80" height="26" rx="2"/><path d="M207 122h67"/>'
    elif kind=='inference': art='<path d="M29 135H308"/>'+''.join(f'<rect x="{40+i*23}" y="{50 if i<5 else 91}" width="17" height="{69 if i<5 else 28}" class="{("sx-fill" if i==5 else "")}"/>' for i in range(11))+'<path class="sx-ink" d="M155 32V150" stroke-dasharray="4 4"/>'
    else: art=''.join(f'<rect x="{56+i*45}" y="{42+j*47}" width="28" height="28" rx="2" class="{("sx-fill" if (i+j)%4==0 else "")}"/>' for j in range(3) for i in range(5))
    return f'<svg class="sx-cover" viewBox="0 0 340 184" role="img" aria-label="{esc(s["title"])}"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{art}</g></svg>'

def video_panel(entry, identifier):
    if not entry or not entry.get('video'): return ''
    track=f'<track kind="captions" src="{esc(entry["track"])}" srclang="{t("es","en")}" label="{t("Español","English")}" default>' if entry.get('track') else ''
    return f'''<div class="sx-player" data-sx-player><video id="{identifier}" controls playsinline preload="none" poster="{esc(entry['poster'])}" data-src="{esc(entry['video'])}" aria-label="{esc(entry['title'])}">{track}</video><button type="button" class="sx-player-start" data-sx-play aria-controls="{identifier}"><span aria-hidden="true">▶</span>{t('Reproducir aquí','Play here')}</button><a class="sx-player-fallback" href="{esc(entry['watch'])}">{t('Abrir página del vídeo y transcripción','Open video page and transcript')} ↗</a></div>'''

def gallery():
    by_slug={s['slug']:s for s in SERIES}
    cards,details=[],[]
    labels=[('all',t('Todas','All'))]+[(p['id'],local(p['title'])) for p in CURRICULUM['paths']]
    filters=''.join(f'<button type="button" data-sx-filter="{k}" aria-pressed="{str(k=="all").lower()}">{esc(v)}</button>' for k,v in labels)
    paths=[]
    for p in CURRICULUM['paths']:
        links=''.join(f'<a href="#serie-{slug}"><span>{by_slug[slug]["number"]:02}</span>{esc(by_slug[slug]["title"])}</a>' for slug in p['series'])
        paths.append(f'<div class="sx-path"><h3>{esc(local(p["title"]))}</h3><p>{esc(local(p["description"]))}</p><ol>{"".join(f"<li>{link}</li>" for link in re.findall(r"<a .*?</a>",links))}</ol></div>')
    for s in SERIES:
        n=len(s['chapters']); curricula=s['curriculum']; learn=curricula['lessons']
        search=' '.join([s['title'],s['description'],*(c['title'] for c in s['chapters'])])
        cards.append(f'''<div class="sx-series-card" data-sx-card data-facets="{' '.join(s['facets'])}" data-search="{esc(search)}" data-series-number="{s['number']}"><a class="sx-card-art" href="#serie-{s['slug']}">{cover(s)}<span class="sx-card-number">{s['number']:02}</span></a><div class="sx-card-copy"><span class="sx-meta">{n} {t('capítulos','chapters')} · {t('Desde cero','From scratch') if s['number']==1 else t('Serie guiada','Guided series')}</span><h2><a href="#serie-{s['slug']}">{esc(s['title'])}</a></h2><p>{esc(s['description'])}</p><a class="sx-card-open" href="#serie-{s['slug']}">{t('Explorar','Explore')} <span aria-hidden="true">→</span></a></div></div>''')
        preview=next((e for e in ([s['intro']] if s['intro'] else [])+s['chapters'] if e and e.get('video')),None)
        steps=[]
        for i,c in enumerate(s['chapters']):
            question=local(learn[i]['question']) if learn else c['title']
            watch=f'<button type="button" data-sx-preview="{esc(json.dumps(c,ensure_ascii=False))}">{t("Ver aquí","Watch here")}</button>' if c.get('video') else ''
            interactive=f'<a href="{esc(c["url"])}#mecanismo">{t("Experimentar","Experiment")}</a>' if learn else ''
            steps.append(f'''<li class="sx-chapter" data-sx-chapter-url="{esc(c['url'])}"><span class="sx-chapter-number">{i+1:02}</span><div><span class="sx-meta">{esc(c['title']) if learn else t('Capítulo','Chapter')+' '+str(i+1)}</span><h3><a href="{esc(c['url'])}">{esc(question)}</a></h3><div class="sx-chapter-actions"><a href="{esc(c['url'])}">{t('Leer','Read')} →</a>{watch}{interactive}</div></div></li>''')
        prereq=''.join(f'<a href="#serie-{slug}">{esc(by_slug[slug]["title"])}</a>' for slug in curricula['prerequisites']) or t('No necesitas conocimientos previos.','No prior knowledge needed.')
        next_s=by_slug[curricula['next']]
        details.append(f'''<details class="sx-series-detail" id="serie-{s['slug']}" data-sx-detail data-number="{s['number']}"><summary>{esc(s['title'])} · {n} {t('capítulos','chapters')}</summary><a class="sx-back" href="#catalogo">← {t('Todas las series','All series')}</a><div class="sx-detail-heading"><div class="sx-meta">{t('Serie','Series')} {s['number']:02} / 13 · {n} {t('capítulos','chapters')}</div><h2 tabindex="-1">{esc(s['title'])}</h2><p>{esc(s['description'])}</p></div><div class="sx-series-stage"><div class="sx-feature-video">{video_panel(preview,'sx-video-'+s['slug']) or cover(s)}<div class="sx-current-video" data-sx-current-video>{esc(preview['title']) if preview else ''}</div><div class="sx-preparation"><strong>{t('Antes de empezar','Before you start')}</strong><span>{prereq}</span>{('<a class="sx-original-intro" href="'+esc(s['intro']['url'])+'">'+t('Leer la presentación original','Read the original introduction')+' →</a>') if s['intro'] else ''}</div></div><div class="sx-roadmap"><div class="sx-roadmap-title"><h3>{t('El recorrido','The path')}</h3><span>{n} {t('capítulos','chapters')}</span></div><ol>{''.join(steps)}</ol></div></div><div class="sx-series-bottom"><a class="sx-primary" href="{esc(s['chapters'][0]['url'])}">{t('Empezar por el capítulo 1','Start with chapter 1')} →</a><a href="#mapa">{t('Ver el mapa de aprendizaje','See the learning map')}</a></div><nav class="sx-next-series"><div><span class="sx-meta">{t('Siguiente paso recomendado','Suggested next step')}</span><p>{esc(local(curricula['why']))}</p></div><a href="#serie-{next_s['slug']}">{esc(next_s['title'])} →</a></nav></details>''')
    featured=SERIES[0]
    return f'''<div class="s5-landing s5-series-hub sx-v2" data-sx-hub data-locale="{t('es','en')}"><div data-sx-overview><header class="sx-library-heading"><div><span class="sx-meta">{t('Aprender · 13 series · 67 capítulos','Learn · 13 series · 67 chapters')}</span><h1>{t('Explora las series de IA.','Explore the AI series.')}</h1><p>{t('Empieza desde cero o elige qué quieres entender. Vídeos, mecanismos y fuentes, en un recorrido claro.','Start from scratch or choose what to understand. Videos, mechanisms and sources along a clear path.')}</p></div><a class="sx-primary" href="#serie-{featured['slug']}">{t('Empieza desde cero','Start from scratch')} →</a></header><aside class="sx-resume" data-sx-resume hidden><span>{t('Última lectura en este navegador','Last reading in this browser')}</span><strong data-sx-resume-title></strong><a data-sx-resume-link>{t('Continuar','Continue')} →</a></aside><details class="sx-learning-map" id="mapa"><summary><span>{t('Encuentra tu recorrido','Find your path')}</span><small>{t('4 recorridos conectados · puedes entrar por cualquier serie','4 connected paths · start with any series')}</small><span aria-hidden="true">+</span></summary><div class="sx-map-grid">{''.join(paths)}</div></details><section class="sx-catalog" id="catalogo"><div class="sx-catalog-tools"><h2>{t('Todas las series','All series')} <span data-sx-count role="status">13</span></h2><label><span class="sx-visually-hidden">{t('Buscar serie o pregunta','Search a series or question')}</span><input type="search" data-sx-search placeholder="{t('Busca una idea, tema o pregunta…','Find an idea, topic or question…')}" autocomplete="off"></label></div><div class="sx-filters" role="group" aria-label="{t('Recorrido','Path')}">{filters}</div><div class="sx-catalog-grid">{''.join(cards)}</div><div data-sx-empty hidden><p>{t('No hay coincidencias para esta búsqueda.','No matches for this search.')}</p><button type="button" data-sx-clear>{t('Mostrar las 13 series','Show all 13 series')}</button></div></section></div><div class="sx-series-details">{''.join(details)}</div><noscript><p>{t('Sin JavaScript puedes desplegar las series y abrir todos sus capítulos.','Without JavaScript you can expand each series and open every chapter.')}</p></noscript></div>'''

class _Span(HTMLParser):
    """Find the end of one balanced outer element without rewriting its bytes."""
    def __init__(self, text, tag):
        super().__init__(convert_charrefs=False); self.text=text; self.tag=tag; self.depth=0; self.end=None
        self.lines=[0]
        for m in re.finditer('\n',text): self.lines.append(m.end())
    def handle_starttag(self,tag,attrs):
        if tag==self.tag and self.end is None: self.depth+=1
    def handle_endtag(self,tag):
        if tag==self.tag and self.end is None:
            self.depth-=1
            if self.depth==0:
                line,col=self.getpos(); self.end=self.text.find('>',self.lines[line-1]+col)+1

def guide(s, index, original=''):
    spec=s['curriculum']['lessons'][index]
    data={'kind':GUIDES[s['slug']], 'view':spec['view'], 'title':local(spec['question']),
          'options':local(spec['options']), 'steps':local(spec['steps']), 'locale':t('es','en'),
          'caveat':t('Ejemplo didáctico reproducible. Los datos y tiempos son sintéticos; no se ejecuta un modelo ni se mide un proveedor.','Reproducible educational example. Data and timings are synthetic; no model runs and no provider is measured.')}
    # This shared explanation accompanies BOTH selectable cases. The concrete
    # outcome remains in the scene; do not describe a blocked action as universal.
    comparison_copy = {
        'agent-safety': t(
            'Con la comprobación, se bloquea el cambio de destinatario; sin ella, el envío sale del permiso. El documento no concede autorización.',
            'With the check, the recipient change is blocked; without it, sending exceeds permission. The document does not grant authorization.'),
        'code-permissions': t(
            'Con la comprobación se bloquea la escritura fuera de ámbito; sin ella, el archivo externo se modifica. Compara los dos resultados.',
            'With the check, the out-of-scope write is blocked; without it, the external file changes. Compare both outcomes.'),
    }
    if data['view'] in comparison_copy:
        data['steps'] = [list(step) for step in data['steps']]
        data['steps'][-1][1] = comparison_copy[data['view']]
    stages=''.join(f'<button type="button" data-sx-step="{i}" aria-pressed="{str(i==0).lower()}"><span>{i+1:02}</span>{esc(step[0])}</button>' for i,step in enumerate(data['steps']))
    options=''.join(f'<button type="button" data-sx-scenario="{i}" aria-pressed="{str(i==0).lower()}">{esc(label)}</button>' for i,label in enumerate(data['options']))
    fallback=''.join(f'<li><strong>{esc(a)}</strong> {esc(b)}</li>' for a,b in data['steps'])
    original_html=original or f'<p>{t("La explicación técnica y las fuentes están a continuación.","The technical explanation and sources follow below.")}</p>'
    return f'''<section class="sx-lab" id="mecanismo" data-sx-guide="{data['kind']}" data-view="{data['view']}" data-guide="{esc(json.dumps(data,ensure_ascii=False))}" data-locale="{t('es','en')}"><header class="sx-lab-heading"><div><span class="sx-meta">{t('Comprueba el mecanismo','Inspect the mechanism')}</span><h2>{esc(data['title'])}</h2></div><button type="button" data-sx-fullscreen aria-label="{t('Ampliar mecanismo','Expand mechanism')}">⤢</button></header><div class="sx-lab-tabs" role="tablist" aria-label="{t('Vista del mecanismo','Mechanism view')}"><button id="sx-guided-tab" type="button" role="tab" aria-selected="true" aria-controls="sx-guided-panel" data-sx-tab="guided">{t('Paso a paso','Step by step')}</button><button id="sx-original-tab" type="button" role="tab" aria-selected="false" aria-controls="s5-diagrama-original" data-sx-tab="original">{t('Diagrama original','Original diagram') if original else t('Capítulo técnico','Technical chapter')}</button></div><div id="sx-guided-panel" role="tabpanel" aria-labelledby="sx-guided-tab" data-sx-panel="guided"><div class="sx-scenarios" role="group" aria-label="{t('Compara dos casos','Compare two cases')}"><span>{t('Compara','Compare')}</span>{options}</div><div class="sx-scene" data-sx-scene aria-label="{esc(data['title'])}"></div><span class="sx-visually-hidden" role="status" aria-live="polite" data-sx-status></span><nav class="sx-stages" aria-label="{t('Pasos del mecanismo','Mechanism steps')}">{stages}</nav><div class="sx-explanation" aria-live="polite"><strong data-sx-title>{esc(data['steps'][0][0])}</strong><p data-sx-copy>{esc(data['steps'][0][1])}</p></div><div class="sx-playback"><button type="button" data-sx-run>▶ {t('Ver secuencia','Play sequence')}</button><button type="button" data-sx-prev disabled>← {t('Anterior','Previous')}</button><button type="button" data-sx-next>{t('Siguiente','Next')} →</button><button type="button" data-sx-reset>{t('Reiniciar','Reset')}</button><a href="#mecanismo" data-sx-share>{t('Enlace al mecanismo','Link to mechanism')} ↗</a></div><p class="sx-caveat">{esc(data['caveat'])}</p><noscript><ol>{fallback}</ol></noscript></div><div id="s5-diagrama-original" role="tabpanel" aria-labelledby="sx-original-tab" data-sx-panel="original">{original_html}</div></section>'''

def wrap_mechanism(html, s, index):
    pattern=r'<(?P<tag>section|div)\b[^>]*class=["\'][^"\']*\b(?:anim-brand-shell|aix-loop|aix-eval|aix-sec|s5v)\b[^"\']*["\'][^>]*>'
    marker=re.search(pattern,html)
    if marker:
        parser=_Span(html[marker.start():],marker['tag']);parser.feed(html[marker.start():])
        if parser.end:
            end=marker.start()+parser.end
            return html[:marker.start()]+guide(s,index,html[marker.start():end])+html[end:]
    # Some chapters have no leading interactive wrapper; keep all prose untouched.
    match=re.search(r'<h2\b',html)
    pos=match.start() if match else len(html)
    return html[:pos]+guide(s,index)+html[pos:]

def on_page_content(html,page,config,files,**kwargs):
    src=page.file.src_uri
    if src=='series/index.md': return gallery()
    if src in {'visuales/index.md','videos/index.md'}:
        # The visual hub already has a compact jump navigator. Reuse it so Series
        # discovery is visible without pushing the first video below the fold.
        if src == 'visuales/index.md' and 's5-visual-hub__jump' in html:
            links=(f'<a class="sx-series-entry" href="{PREFIX}/series/">{t("Series","Series")}</a>'
                   f'<a class="sx-series-entry" href="{PREFIX}/series/#mapa">{t("Mapa de aprendizaje","Learning map")}</a>')
            html=re.sub(r"(<nav[^>]*class=['\"][^'\"]*s5-visual-hub__jump[^'\"]*['\"][^>]*>.*?)(</nav>)",
                        lambda m:m[1]+links+m[2],html,count=1,flags=re.S)
        else:
            link=f'<nav class="sx-discovery-banner"><span>{t("¿Quieres entender el tema completo?","Want to understand the whole topic?")}</span><a href="{PREFIX}/series/">{t("Explora las 13 series","Explore all 13 series")} →</a><a href="{PREFIX}/series/#mapa">{t("Encuentra tu recorrido","Find your path")}</a></nav>'
            html=re.sub(r'(</h1>)',lambda m:m[0]+link,html,count=1)
        return html
    match=PAGE_MAP.get(src)
    if not match or src in PROTECTED: return html
    s,entry=match
    index=next((i for i,c in enumerate(s['chapters']) if c['src']==entry['src']),None)
    count=len(s['chapters'])
    position=t('Presentación','Introduction') if index is None else f'{t("Capítulo","Chapter")} {index+1} / {count}'
    bar=f'<nav class="sx-reader-context" aria-label="{t("Tu recorrido","Your path")}"><a href="{PREFIX}/series/">{t("Todas las series","All series")}</a><span aria-hidden="true">/</span><a href="{target(s)}">{esc(s["title"])}</a><span>{position}</span></nav>'
    html=re.sub(r'(</h1>)',lambda m:m[0]+bar,html,count=1)
    if src.startswith('series/') and s['slug'] in GUIDES and index is not None:
        html=wrap_mechanism(html,s,index)
    if index is not None:
        if index+1<count:
            following=s['chapters'][index+1];url=following['url'];label=following['title'];why=t('Continúa dentro de esta serie.','Continue within this series.')
        else:
            next_s=next(x for x in SERIES if x['slug']==s['curriculum']['next']);url=target(next_s);label=next_s['title'];why=local(s['curriculum']['why'])
        html+=f'<nav class="sx-reader-next"><div><span class="sx-meta">{t("Tu siguiente paso","Your next step")}</span><p>{esc(why)}</p><a href="{esc(url)}">{esc(label)} →</a></div><a href="{target(s)}">{t("Ver el recorrido completo","See the full path")}</a></nav>'
    return html


def on_post_page(output, page, config, **kwargs):
    """Expose Series in the existing navigation without replacing its visual shell."""
    def replace_link(match):
        opening, text, closing = match.groups()
        if re.sub(r'<[^>]+>', '', text).strip() not in {'Aprender', 'Learn'}:
            return match[0]
        opening = re.sub(r'href=["\'][^"\']*["\']', f'href="{PREFIX}/series/"', opening)
        return opening + 'Series' + closing
    return re.sub(r'(<a\b[^>]*class=["\'][^"\']*md-tabs__link[^"\']*["\'][^>]*>)(.*?)(</a>)', replace_link, output, flags=re.S)
