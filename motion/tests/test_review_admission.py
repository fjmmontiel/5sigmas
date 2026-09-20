import copy
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

SPEC=importlib.util.spec_from_file_location('review_admission',Path(__file__).parents[1]/'scripts/review_admission.py')
qa=importlib.util.module_from_spec(SPEC); SPEC.loader.exec_module(qa)

class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name); self.inventory=[]
        # Synthetic contract fixtures, intentionally NOT claims about real videos.
        for language in ['es','en']:
            for orientation in ['horizontal','vertical']:
                name=f'chapter-{language}-{orientation}.mp4'; p=self.root/name;p.write_bytes(b'fixture-not-real-media-'+name.encode())
                self.inventory.append(dict(chapter='chapter',locale=language,orientation=orientation,mp4=name,
                    sha256=qa.sha256(p),size_bytes=p.stat().st_size,frames=60,duration_seconds=1,
                    text_visual_cues=[dict(id='cue1',sentence_id='sentence1',visual_target_id='node1',text_at=.2,visual_at=.3)],scenes=[]))
        self.manifest=dict(unit='test-fixture',source_head='a'*40,outputs=4,inventory=self.inventory)
        binding=qa.asset_binding(self.manifest);receipt=self.root/'critic.txt';receipt.write_text('synthetic test finding, not a production review')
        self.proof=dict(rubric=qa.RUBRIC,asset_binding_sha256=binding,
             critic=dict(role='independent_encoded_media_review',run_id='critic-2',generator_run_id='generator-1',evaluator_revision='test-v1'),
             gates={k:dict(status='PASS',method='independent-encoded-review',findings=['test fixture'],receipt=dict(path='critic.txt',sha256=qa.sha256(receipt))) for k in qa.GATES},
             outputs=[dict(mp4=r['mp4'],sha256=r['sha256'],cue_observations=[dict(id='cue1',text_at=.2,visual_at=.3,semantics_match=True,reading_hold_verified=True,sample_phases=['before','during','after'])]) for r in self.inventory])
        self.delivery=dict(asset_binding_sha256=binding,files=[dict(mp4=r['mp4'],file_id=str(i),mime_type='video/mp4',sha256_readback=r['sha256'],size_bytes=r['size_bytes'],playback_url=f'https://drive.google.com/file/d/{i}/view',playback_verified=True,parent_verified=True) for i,r in enumerate(self.inventory)])
    def assess(self): return qa.assess(self.manifest,self.root,self.proof,self.delivery,self.root)
    def assertBlocked(self,code):
        d=self.assess();self.assertFalse(d['review_ready']);self.assertTrue(any(e.startswith(code) for e in d['errors']),d['errors'])
    def test_positive_contract_fixture(self): self.assertTrue(self.assess()['review_ready'])
    def test_no_independent_evidence(self): self.proof={};self.assertBlocked('NO_INDEPENDENT_CRITIC')
    def test_self_review_not_independent(self): self.proof['critic']['run_id']='generator-1';self.assertBlocked('NO_INDEPENDENT_CRITIC')
    def test_stale_media(self): (self.root/self.inventory[0]['mp4']).write_bytes(b'new');self.assertBlocked('STALE_MEDIA_HASH')
    def test_missing_mp4(self): (self.root/self.inventory[0]['mp4']).unlink();self.assertBlocked('MISSING_MP4')
    def test_missing_locale(self): self.manifest['inventory']=self.inventory[:-1];self.assertBlocked('INCOMPLETE_ES_EN_HV_MATRIX')
    def test_duplicate_output(self): self.manifest['inventory'].append(self.inventory[0]);self.assertBlocked('DUPLICATE_OUTPUT_IDENTITY')
    def test_stale_manifest(self): self.manifest['source_head']='b'*40;self.assertBlocked('STALE_QA_BINDING')
    def test_changed_receipt(self): (self.root/'critic.txt').write_text('changed');self.assertBlocked('MISSING_OR_STALE_RECEIPT')
    def test_fail_unknown_stale_and_absent_never_pass(self):
        for status in ['FAIL','UNKNOWN','NOT_VERIFIED','STALE',None]:
            with self.subTest(status=status):
                self.proof['gates']['palette_style']['status']=status;self.assertBlocked('GATE_NOT_PASS')
    def test_pixel_delta_not_semantic_qa(self): self.proof['gates']['semantic_motion']['method']='pixel-delta-only';self.assertBlocked('INSUFFICIENT_GATE_EVIDENCE')
    def test_contact_sheet_not_temporal_qa(self): self.proof['gates']['text_visual_sync']['method']='contact-sheet-only';self.assertBlocked('INSUFFICIENT_GATE_EVIDENCE')
    def test_text_revealed_early(self): self.proof['outputs'][0]['cue_observations'][0]['text_at']=0;self.assertBlocked('CUE_TIMING_MISMATCH')
    def test_visual_shifted(self): self.proof['outputs'][0]['cue_observations'][0]['visual_at']=.5;self.assertBlocked('CUE_TIMING_MISMATCH')
    def test_subframe_observation_tolerance(self): self.proof['outputs'][0]['cue_observations'][0]['visual_at']+=.01;self.assertTrue(self.assess()['review_ready'])
    def test_missing_authored_cues(self): self.inventory[0]['text_visual_cues']=[];self.assertBlocked('MISSING_OR_DUPLICATE_AUTHORED_CUES')
    def test_irrelevant_motion_despite_timing(self): self.proof['outputs'][0]['cue_observations'][0]['semantics_match']=False;self.assertBlocked('CUE_SEMANTICS_OR_READING_FAILED')
    def test_absent_before_during_after(self): self.proof['outputs'][0]['cue_observations'][0]['sample_phases']=['during'];self.assertBlocked('INCOMPLETE_ENCODED_CUE_SAMPLING')
    def test_zip_instead_of_mp4(self): self.delivery['files'][0]['mime_type']='application/zip';self.assertBlocked('MP4_NOT_READY_IN_DRIVE')
    def test_drive_processing_not_playable(self): self.delivery['files'][0]['playback_verified']=False;self.assertBlocked('MP4_NOT_READY_IN_DRIVE')
    def test_stale_delivery(self): self.delivery['files'][0]['sha256_readback']='f'*64;self.assertBlocked('MP4_NOT_READY_IN_DRIVE')
    def test_missing_delivery_does_not_invalidate_content(self): self.delivery={};d=self.assess();self.assertTrue(d['content_ready']);self.assertFalse(d['review_ready'])
    def test_relabelled_same_handler(self):
        self.manifest['unit']='fundamentos-ia-iag';self.inventory[0]['scenes']=[dict(family='foo',visual_style='lattice'),dict(family='bar',visual_style='hub')]
        self.assertBlocked('ALIASED_HANDLER_COUNTED_AS_DISTINCT_FAMILIES')
    def test_path_traversal(self): self.inventory[0]['mp4']='../outside.mp4';self.assertBlocked('INVALID_MEDIA_PATH')
    def test_embedded_manifest_cannot_retain_review_state(self):
        self.manifest['state']='COMPLETE_REVIEW_CANDIDATE_TECHNICAL_PACKAGE'
        (self.root/'manifest.json').write_text(json.dumps(self.manifest))
        archive=self.root/'fixture-review-candidate.zip'
        with zipfile.ZipFile(archive,'w') as z:z.writestr('manifest.json',json.dumps(self.manifest))
        with contextlib.redirect_stdout(io.StringIO()):
            qa.finalize_package(self.root,self.root,internal_only=True)
        with zipfile.ZipFile(archive) as z:
            m=json.loads(z.read('manifest.json'));self.assertEqual(m['state'],'CHANGES_REQUIRED');self.assertFalse(m['review_ready'])
        self.assertEqual(json.loads((self.root/'summary.json').read_text())['package_sha256'],qa.sha256(archive))
    def test_default_packager_returns_failure_without_qa(self):
        (self.root/'manifest.json').write_text(json.dumps(self.manifest))
        with contextlib.redirect_stdout(io.StringIO()),self.assertRaises(SystemExit):qa.finalize_package(self.root,self.root)

if __name__=='__main__':unittest.main(verbosity=2)
