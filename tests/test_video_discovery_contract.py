"""Behavioral mutation tests; fixtures are NOT production release evidence."""
from pathlib import Path
import copy, hashlib, json, sys, tempfile, unittest
from html import escape
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import video_discovery_contract as c


def source(locale='es'):
    return json.loads((ROOT/'discovery'/'modelos-razonadores'/f'00-presentacion.{locale}.json').read_text(encoding='utf-8'))


def surfaces(s):
    e=c.compile_source(s)
    html=f'''<!doctype html><html lang="{s['locale']}"><head><title>{escape(s['title'])}</title><link rel="canonical" href="{s['watch_url']}"><meta name="robots" content="index,follow"><script type="application/ld+json">{json.dumps(e['schema'],ensure_ascii=False)}</script></head><body><h1>{escape(s['title'])}</h1><video controls data-s5-watch-player poster="{s['poster_url']}"><source src="{s['video_url']}" type="video/mp4"><track kind="captions" src="{s['vtt_url']}" srclang="{s['locale']}" label="{e['track_label']}"></video>{e['chapters_html']}{e['transcript_html']}<a href="{s['article_url']}">Article</a></body></html>'''
    fields={'thumbnail_loc':s['poster_url'],'title':s['title'],'description':s['description'],'content_loc':s['video_url'],'duration':str(c.seconds(s['duration_ms'])),'publication_date':s['upload_date']}
    video='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"><url><loc>'+s['watch_url']+'</loc><video:video>'+''.join(f'<video:{k}>{escape(v)}</video:{k}>' for k,v in fields.items())+'</video:video></url></urlset>'
    normal=f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{s["watch_url"]}</loc></url></urlset>'
    return {'html':html,'vtt':e['vtt'],'video_sitemap':video,'normal_sitemap':normal,'article_html':f'<a href="{s["watch_url"]}">Video</a>','status':200,'headers':{}}


class SourceTests(unittest.TestCase):
    def setUp(self): self.s=source()
    def bad(self,edit):
        edit(self.s)
        with self.assertRaises(c.ContractError): c.compile_source(self.s)
    def test_es_and_en_compile_deterministically(self):
        for locale in ('es','en'):
            s=source(locale); self.assertEqual(c.compile_source(s),c.compile_source(copy.deepcopy(s)))
    def test_out_of_duration(self): self.bad(lambda s:s['chapters'][-1].update(end_ms=76000))
    def test_unordered_chapters(self): self.bad(lambda s:s['chapters'].reverse())
    def test_overlapping_chapters(self): self.bad(lambda s:s['chapters'][1].update(start_ms=14900))
    def test_gap_chapter(self): self.bad(lambda s:s['chapters'][1].update(start_ms=15100))
    def test_missing_key_moment(self): self.bad(lambda s:s['chapters'].pop(1))
    def test_missing_final_key_moment(self): self.bad(lambda s:s['chapters'].pop())
    def test_empty_chapters(self): self.bad(lambda s:s.update(chapters=[]))
    def test_cue_past_chapter(self): self.bad(lambda s:s['chapters'][0]['cues'][0].update(end_ms=16000))
    def test_overlapping_cues(self): self.bad(lambda s:s['chapters'][0]['cues'][1].update(start_ms=700))
    def test_boolean_schema_version(self): self.bad(lambda s:s.update(schema_version=True))
    def test_boolean_time(self): self.bad(lambda s:s['chapters'][0].update(start_ms=False))
    def test_missing_cues(self): self.bad(lambda s:s['chapters'][0].update(cues=[]))
    def test_duplicate_cue(self): self.bad(lambda s:s['chapters'][0]['cues'][1].update(id=s['chapters'][0]['cues'][0]['id']))
    def test_empty_visual_description(self): self.bad(lambda s:s['chapters'][0].update(visual_description=[]))
    def test_locale_leakage(self): self.bad(lambda s:s.update(watch_url=s['watch_url'].replace('.com/','.com/en/')))
    def test_unknown_locale(self): self.bad(lambda s:s.update(locale='xx'))
    def test_zip_only(self): self.bad(lambda s:s.update(video_url=s['video_url'].replace('.mp4','.zip')))
    def test_missing_asset(self):
        with self.assertRaises(c.ContractError): c.inspect_asset(self.s,Path('/not/a/video.mp4'))
    def test_hash_stale(self):
        with tempfile.TemporaryDirectory() as root:
            p=Path(root)/'video.mp4'; p.write_bytes(b'x'*100)
            s=copy.deepcopy(self.s);s['video_bytes']=100
            with self.assertRaisesRegex(c.ContractError,'hash mismatch'): c.inspect_asset(s,p)
    def test_missing_caption_contract(self): self.bad(lambda s:s.pop('caption_contract'))
    def test_nonfinite_duration(self): self.bad(lambda s:s.update(duration_ms=float('nan')))
    def test_date_without_timezone(self): self.bad(lambda s:s.update(upload_date='2026-09-20'))


class RenderedTests(unittest.TestCase):
    def setUp(self): self.s=source();self.data=surfaces(self.s)
    def fail(self,code):
        result=c.audit_rendered(self.s,**self.data)
        self.assertEqual(result['status'],'FAIL',result);self.assertIn(code,result['errors'])
    def test_actual_compiled_es_and_en_surfaces(self):
        for locale in ('es','en'):
            s=source(locale);self.assertEqual(c.audit_rendered(s,**surfaces(s))['status'],'PASS')
    def test_clip_url_broken(self):
        self.data['html']=self.data['html'].replace('"url": "'+self.s['watch_url']+'?t=15"','"url": "https://5sigmas.com/missing/?t=15"');self.fail('CLIP_MISMATCH')
    def test_schema_locale(self):
        self.data['html']=self.data['html'].replace('"inLanguage": "es"','"inLanguage": "en"');self.fail('SCHEMA_INLANGUAGE')
    def test_schema_duration(self):
        self.data['html']=self.data['html'].replace('"duration": "PT75S"','"duration": "PT74S"');self.fail('SCHEMA_DURATION')
    def test_clip_end_missing(self):
        self.data['html']=self.data['html'].replace('"endOffset": 15, ','');self.fail('CLIP_MISMATCH')
    def test_transcript_stale(self):
        self.data['html']=self.data['html'].replace('data-video-sha256="'+self.s['video_sha256']+'"','data-video-sha256="'+'0'*64+'"');self.fail('TRANSCRIPT_STALE')
    def test_transcript_missing_sentence(self):
        self.data['html']=self.data['html'].replace(self.s['chapters'][0]['cues'][0]['text'],'');self.fail('TRANSCRIPT_CONTENT_OR_VISIBILITY')
    def test_transcript_js_only(self):
        e=c.compile_source(self.s);self.data['html']=self.data['html'].replace(e['transcript_html'],'<script type="application/json">'+json.dumps(e['transcript_html'])+'</script>');self.fail('TRANSCRIPT_MISSING')
    def test_transcript_hidden_ancestor(self):
        self.data['html']=self.data['html'].replace('<section id="video-transcript"','<div hidden><section id="video-transcript"').replace('</section><a href=','</section></div><a href=');self.fail('TRANSCRIPT_CONTENT_OR_VISIBILITY')
    def test_transcript_closed_details(self):
        e=c.compile_source(self.s);self.data['html']=self.data['html'].replace(e['transcript_html'],'<details><summary>Read</summary>'+e['transcript_html']+'</details>');self.fail('TRANSCRIPT_CONTENT_OR_VISIBILITY')
    def test_vtt_stale_text(self):
        self.data['vtt']=self.data['vtt'].replace(self.s['chapters'][0]['cues'][0]['text'],'Invented narration.');self.fail('VTT_STALE_OR_CONTENT')
    def test_vtt_shift_250ms(self):
        self.data['vtt']=self.data['vtt'].replace('00:00:00.700 -->','00:00:00.950 -->',1);self.fail('VTT_STALE_OR_CONTENT')
    def test_vtt_stale_hash(self):
        self.data['vtt']=self.data['vtt'].replace(c.digest(self.s),'0'*64);self.fail('VTT_BINDING')
    def test_missing_chapter_link(self):
        self.data['html']=self.data['html'].replace('data-s5-video-seek="15"','data-removed="15"');self.fail('MISSING_KEY_MOMENT')
    def test_wrong_chapter_link(self):
        self.data['html']=self.data['html'].replace('data-s5-video-seek="15"','data-s5-video-seek="16"');self.fail('CHAPTER_LINK')
    def test_meta_noindex(self):
        self.data['html']=self.data['html'].replace('content="index,follow"','content="noindex,follow"');self.fail('NOINDEX')
    def test_header_noindex(self): self.data['headers']={'X-Robots-Tag':'noindex'};self.fail('NOINDEX')
    def test_http_non_200(self): self.data['status']=404;self.fail('HTTP_STATUS')
    def test_wrong_canonical(self):
        self.data['html']=self.data['html'].replace('rel="canonical" href="'+self.s['watch_url']+'"','rel="canonical" href="https://5sigmas.com/"');self.fail('CANONICAL')
    def test_wrong_html_locale(self):
        self.data['html']=self.data['html'].replace('<html lang="es">','<html lang="en">');self.fail('HTML_LOCALE')
    def test_wrong_track_locale(self):
        self.data['html']=self.data['html'].replace('srclang="es"','srclang="en"');self.fail('VTT_TRACK')
    def test_video_sitemap_duration_divergence(self):
        self.data['video_sitemap']=self.data['video_sitemap'].replace('<video:duration>75</video:duration>','<video:duration>74</video:duration>');self.fail('VIDEO_SITEMAP_DURATION')
    def test_video_sitemap_title_divergence(self):
        self.data['video_sitemap']=self.data['video_sitemap'].replace('<video:title>Modelos razonadores</video:title>','<video:title>Wrong title</video:title>');self.fail('VIDEO_SITEMAP_TITLE')
    def test_sitemap_missing(self):
        self.data['normal_sitemap']=self.data['normal_sitemap'].replace(self.s['watch_url'],'https://5sigmas.com/');self.fail('NORMAL_SITEMAP_ENTRY')
    def test_article_link_missing(self): self.data['article_html']='<p>No video link.</p>';self.fail('ARTICLE_WATCH_LINKS')


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.s=source();self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        p=self.root/'synthetic-test-evidence.txt';p.write_text('Synthetic unit fixture; NOT a real-video review.\n')
        self.observed={name:'a'*64 for name in c.REQUIRED_ARTIFACT_BINDINGS}
        self.bindings={'source_sha256':c.digest(self.s),'video_sha256':self.s['video_sha256'],'evaluator_sha256':c.file_digest(Path(c.__file__)),**self.observed}
        special={'ASSET_BINDING':'ffprobe','TIMING_CONTENT_REVIEW':'independent-encoded-review','PLAYBACK':'playwright','INDEXABILITY':'http-crawler'}
        self.receipts={key:{'status':'PASS','producer':special.get(key,'discovery-auditor'),'bindings':self.bindings.copy(),'evidence':[{'path':p.name,'sha256':c.file_digest(p)}]} for key in c.REQUIRED_RELEASE_CHECKS}
    def tearDown(self): self.tmp.cleanup()
    def decision(self): return c.release_admission(self.s,self.receipts,self.observed,self.root)
    def test_synthetic_conjunction_semantics_only(self): self.assertTrue(self.decision()['release_ready'])
    def test_each_missing_artifact_binding_blocks(self):
        for key in c.REQUIRED_ARTIFACT_BINDINGS:
            old=self.observed.pop(key);self.assertFalse(self.decision()["release_ready"]);self.observed[key]=old
    def test_invalid_artifact_hash_blocks(self):
        self.observed["html_sha256"]="PASS";self.assertFalse(self.decision()["release_ready"])
    def test_invalid_receipt_binding_blocks(self):
        self.receipts["VTT"]["bindings"]=None;self.assertFalse(self.decision()["release_ready"])
    def test_each_missing_gate_blocks(self):
        for key in c.REQUIRED_RELEASE_CHECKS:
            old=self.receipts.pop(key); self.assertFalse(self.decision()['release_ready']);self.receipts[key]=old
    def test_fail_unknown_stale_block_each_gate(self):
        for key in c.REQUIRED_RELEASE_CHECKS:
            for value in ('FAIL','UNKNOWN','STALE'):
                self.receipts[key]['status']=value;self.assertFalse(self.decision()['release_ready'])
            self.receipts[key]['status']='PASS'
    def test_generation_not_release(self):
        c.compile_source(self.s);self.assertFalse(c.release_admission(self.s,{}, {},self.root)['release_ready'])
    def test_renderer_cannot_supply_independent_pass(self):
        self.receipts['TIMING_CONTENT_REVIEW']['producer']='renderer';self.assertFalse(self.decision()['release_ready'])
    def test_self_reported_pass_without_evidence(self):
        self.receipts['PLAYBACK']['evidence']=[];self.assertFalse(self.decision()['release_ready'])
    def test_stale_source(self):
        self.s['chapters'][0]['cues'][0]['text']='Changed source';self.assertFalse(self.decision()['release_ready'])
    def test_stale_video(self): self.s['video_sha256']='f'*64;self.assertFalse(self.decision()['release_ready'])
    def test_stale_evaluator(self):
        self.receipts['VTT']['bindings']['evaluator_sha256']='b'*64;self.assertFalse(self.decision()['release_ready'])
    def test_stale_html(self):
        self.receipts['RENDERED_HTML']['bindings']['html_sha256']='b'*64;self.assertFalse(self.decision()['release_ready'])
    def test_mutated_evidence(self):
        (self.root/'synthetic-test-evidence.txt').write_text('Modified.');self.assertFalse(self.decision()['release_ready'])
    def test_missing_evidence_file(self):
        (self.root/'synthetic-test-evidence.txt').unlink();self.assertFalse(self.decision()['release_ready'])
    def test_escape_evidence_root(self):
        self.receipts['VTT']['evidence'][0]['path']='../../outside';self.assertFalse(self.decision()['release_ready'])
    def test_reserved_fingerprint_override(self):
        with self.assertRaises(c.ContractError): c.release_admission(self.s,self.receipts,{'source_sha256':'0'*64},self.root)
    def test_approval_not_reopened(self): self.assertEqual(self.decision()['owner_approval'],'UNMODIFIED')


if __name__=='__main__': unittest.main(verbosity=2)
