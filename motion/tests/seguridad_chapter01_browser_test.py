"""Native-canvas regressions for the chapter-01 presentation data resolver.

Run with the existing Playwright/Chromium render dependencies. This is source
render QA; it does not certify encoded media or Google Drive playback.
"""
from pathlib import Path
import json
import shutil
import sys
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from seguridad_render_check import bundled_page


class Chapter01BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        chrome = shutil.which('chromium') or shutil.which('google-chrome')
        if not chrome:
            raise RuntimeError('native Chromium is required, not a mocked canvas')
        cls.browser = cls.pw.chromium.launch(executable_path=chrome, args=['--no-sandbox'])
        cls.page = cls.browser.new_page()
        cls.page.set_content(bundled_page())
        cls.page.wait_for_function('window.ready === true')
        cls.page.evaluate('(a)=>window.setup(a.s,a.r)', {
            's': json.loads((ROOT / 'migration/seguridad-ia-content-v1.json').read_text()),
            'r': json.loads((ROOT / 'migration/seguridad-ia-series-register.json').read_text())})
        cls.page.evaluate("""async()=>{
            const m=await import('@5sigmas/src/seguridad/chapter01-presentations.mjs');
            window.chapter01=m.CHAPTER01_PRESENTATIONS;
        }""")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def test_resolver_matches_explicit_data_in_all_variants(self):
        for locale in ('es','en'):
            for orientation in ('horizontal','vertical'):
                for t in (5.5,18.8,33.5,45.8,58.5):
                    with self.subTest(locale=locale, orientation=orientation, time=t):
                        result=self.page.evaluate("""a=>{
                            const original=window.R;
                            const first=window.frame(a.job,a.t);
                            try {
                                window.R=structuredClone(original);
                                for(const c of window.R.chapters[1].concepts)
                                    c.presentation=structuredClone(window.chapter01[c.id]);
                                const second=window.frame(a.job,a.t);
                                return {same:first.jpeg===second.jpeg,issues:second.result.issues};
                            } finally {window.R=original;}
                        }""", {'job':f'seguridad-ia-01-{locale}-{orientation}','t':t})
                        self.assertTrue(result['same'])
                        self.assertEqual(result['issues'], [])

    def filter_label_intersections(self, locale, orientation, legacy=False):
        return self.page.evaluate("""a=>{
            const layout=structuredClone(window.chapter01['S01-C3'].layouts[a.orientation]);
            const label=layout.annotations[0];
            if(a.legacy)label.y=315;
            const ctx=document.querySelector('canvas').getContext('2d');
            ctx.font=`400 ${label.size}px Arial`;
            const width=ctx.measureText(label.label[a.locale]).width;
            const box={left:label.x-width/2-3,right:label.x+width/2+3,
                       top:label.y-3,bottom:label.y+label.size*1.22+3};
            const intersections=[];
            for(const e of layout.edges)for(let i=1;i<e.points.length;i++){
                const u=e.points[i-1],v=e.points[i];
                if(u[0]===v[0] && u[0]>=box.left && u[0]<=box.right &&
                   Math.max(u[1],v[1])>=box.top && Math.min(u[1],v[1])<=box.bottom)
                    intersections.push([u,v]);
                if(u[1]===v[1] && u[1]>=box.top && u[1]<=box.bottom &&
                   Math.max(u[0],v[0])>=box.left && Math.min(u[0],v[0])<=box.right)
                    intersections.push([u,v]);
            }
            return intersections;
        }""",{'locale':locale,'orientation':orientation,'legacy':legacy})

    def test_filter_label_is_clear_of_edges_in_both_locales(self):
        for locale in ('es','en'):
            for orientation in ('horizontal','vertical'):
                with self.subTest(locale=locale,orientation=orientation):
                    self.assertEqual(self.filter_label_intersections(locale,orientation),[])

    def test_old_english_vertical_overlap_is_detected(self):
        self.assertTrue(self.filter_label_intersections('en','vertical',legacy=True))

    def rejected(self, mutation):
        return self.page.evaluate("""mutation=>{
            const original=window.R;
            try {
                window.R=structuredClone(original);
                const c=window.R.chapters[1].concepts[1];
                c.presentation=structuredClone(window.chapter01[c.id]);
                const node=c.presentation.layouts.horizontal.nodes[0];
                if(mutation==='phase')node.highlightPhase=999;
                if(mutation==='locale')delete node.label.en;
                window.frame('seguridad-ia-01-en-horizontal',22.5);
                return null;
            } catch(e){return String(e);} finally {window.R=original;}
        }""",mutation)

    def test_invalid_highlight_phase_blocks_actual_renderer(self):
        self.assertIn('invalid highlight phase', self.rejected('phase'))

    def test_missing_translation_blocks_actual_renderer(self):
        self.assertIn('missing localized box label', self.rejected('locale'))


if __name__ == '__main__':
    unittest.main()
