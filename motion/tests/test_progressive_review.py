"""Behavioral admission tests. Fixtures are not production-media evidence."""
from pathlib import Path
import tempfile,sys,unittest,copy,json
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from review_admission import assess,sha256,asset_binding,RUBRIC,GATES,finalize_package

class ProgressiveAdmission(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  r=self.root/'evidence.json';r.write_text('{"fixture":true}')
  self.receipt={'path':r.name,'sha256':sha256(r)}
  scenes=[dict(concept_id=f'S00-C{i+1}',declared_family=f'f{i}',topology=f't{i}') for i in range(5)]
  self.m=dict(unit='seguridad-ia',source_head='test-only',review_scope='video',required_series_chapters=[f'{i:02d}' for i in range(6)],outputs=4,inventory=[])
  for locale in ('es','en'):
   for orient in ('horizontal','vertical'):
    name=f'00-{locale}-{orient}.mp4';p=self.root/name;p.write_bytes(b'UNIT TEST ONLY, not an encoded video '+name.encode())
    self.m['inventory'].append(dict(mp4=name,chapter='00',locale=locale,orientation=orient,sha256=sha256(p),size_bytes=p.stat().st_size,fps=60,scenes=scenes,text_visual_cues=[dict(id='cue',sentence_id='sentence',visual_target_id='mechanism',text_at=.55,visual_at=4)]))
  b=asset_binding(self.m)
  self.qa=dict(rubric=RUBRIC,asset_binding_sha256=b,scope='complete_chapter_exact_variants',series_plan_reviewed=True,known_series_design_blocker=False,future_encoded_series_review='PENDING',critic=dict(role='independent_encoded_media_review',run_id='fixture-review',generator_run_id='fixture-generator',evaluator_revision='test'),gates={g:dict(status='PASS',method='fixture-independent-proof',findings='Fixture, not production evidence',receipt=self.receipt) for g in GATES},outputs=[dict(mp4=r['mp4'],sha256=r['sha256'],cue_observations=[dict(id='cue',text_at=.55,visual_at=4,semantics_match=True,reading_hold_verified=True,sample_phases=['before','during','after'])]) for r in self.m['inventory']])
  self.delivery=dict(asset_binding_sha256=b,files=[dict(mp4=r['mp4'],file_id=str(i),mime_type='video/mp4',sha256_readback=r['sha256'],size_bytes=r['size_bytes'],playback_url=f'https://drive.google.com/file/d/fixture-{i}',playback_verified=True,parent_verified=True) for i,r in enumerate(self.m['inventory'])])
 def tearDown(self):self.tmp.cleanup()
 def run_gate(self,**kw):return assess(self.m,self.root,self.qa,self.delivery,self.root,None,review_scope=kw.get('scope','video'))
 def test_complete_chapter_can_be_reviewed_without_discovery(self):
  d=self.run_gate();self.assertTrue(d['review_ready']);self.assertEqual(d['state'],'REVIEW_READY_VIDEO');self.assertFalse(d['release_ready'])
 def test_video_approval_cannot_be_escalated_to_series(self):
  d=self.run_gate(scope='series');self.assertFalse(d['review_ready']);self.assertIn('SCOPE_ESCALATION_FORBIDDEN',d['errors']);self.assertIn('INCOMPLETE_SERIES',d['errors'])
 def test_missing_discovery_still_blocks_series(self):
  self.m['review_scope']='series';self.m['required_series_chapters']=['00'];self.qa['asset_binding_sha256']=asset_binding(self.m);self.delivery['asset_binding_sha256']=asset_binding(self.m)
  self.assertIn('MISSING_CURRENT_DISCOVERY_RUBRIC',self.run_gate(scope='series')['errors'])
 def test_missing_qa_blocks_staging(self):
  self.qa={};self.assertFalse(self.run_gate()['content_ready'])
 def test_delivery_missing_is_not_review_ready(self):
  self.delivery={};d=self.run_gate();self.assertTrue(d['content_ready']);self.assertFalse(d['review_ready'])
 def test_250ms_shift_rejected(self):
  self.qa['outputs'][0]['cue_observations'][0]['text_at']+=.25;self.assertFalse(self.run_gate()['content_ready'])
 def test_wrong_visual_target_evidence_rejected(self):
  self.qa['outputs'][0]['cue_observations'][0]['semantics_match']=False;self.assertFalse(self.run_gate()['content_ready'])
 def test_stale_video_bytes_rejected(self):
  (self.root/self.m['inventory'][0]['mp4']).write_bytes(b'changed');self.assertFalse(self.run_gate()['content_ready'])
 def test_stale_receipt_rejected(self):
  (self.root/'evidence.json').write_text('mutated');self.assertFalse(self.run_gate()['content_ready'])
 def test_missing_orientation_rejected(self):
  self.m['inventory'].pop();self.assertIn('INCOMPLETE_ES_EN_HV_MATRIX',self.run_gate()['errors'])
 def test_zip_only_not_a_video(self):
  old=self.root/self.m['inventory'][0]['mp4'];old.rename(old.with_suffix('.zip'));self.assertFalse(self.run_gate()['content_ready'])
 def test_unseen_series_is_not_certified(self):
  self.qa['future_encoded_series_review']='PASS';self.assertIn('UNSEEN_SERIES_CANNOT_BE_CERTIFIED',self.run_gate()['errors'])
 def test_known_design_blocker_prevents_review(self):
  self.qa['known_series_design_blocker']=True;self.assertFalse(self.run_gate()['content_ready'])
 def test_renderer_self_report_rejected(self):
  self.qa['gates']['encoded_visual_review']['method']='renderer-self-report';self.assertFalse(self.run_gate()['content_ready'])
 def test_unknown_palette_blocks(self):
  self.qa['gates']['palette_style']['status']='UNKNOWN';self.assertFalse(self.run_gate()['content_ready'])
 def test_missing_decoded_phase_blocks(self):
  self.qa['outputs'][0]['cue_observations'][0]['sample_phases']=['after'];self.assertFalse(self.run_gate()['content_ready'])
 def test_side_effects_not_permitted_on_failed_gate(self):
  self.qa['gates']['semantic_motion']['status']='FAIL';writes=[]
  d=self.run_gate()
  if d['content_ready']:writes.append('upload')
  if d['review_ready']:writes.append('announce')
  self.assertEqual(writes,[])
 def test_finalizer_real_entrypoint_does_not_override_gate(self):
  (self.root/'manifest.json').write_text(json.dumps(self.m));(self.root/'independent-qa.json').write_text(json.dumps(self.qa));(self.root/'drive-delivery.json').write_text(json.dumps(self.delivery))
  d=finalize_package(self.root,self.root,review_scope='video');self.assertTrue(d['review_ready'])
  self.qa['gates']['semantic_motion']['status']='FAIL';(self.root/'independent-qa.json').write_text(json.dumps(self.qa))
  with self.assertRaises(SystemExit):finalize_package(self.root,self.root,review_scope='video')
  self.assertFalse(json.loads((self.root/'manifest.json').read_text())['review_ready'])
 def test_approval_not_withdrawn_on_technical_failure(self):
  self.m['owner_visual_approval']='APPROVED';(self.root/'manifest.json').write_text(json.dumps(self.m))
  finalize_package(self.root,self.root,internal_only=True,review_scope='video')
  self.assertEqual(json.loads((self.root/'manifest.json').read_text())['owner_visual_approval'],'APPROVED')
if __name__=='__main__':unittest.main()
