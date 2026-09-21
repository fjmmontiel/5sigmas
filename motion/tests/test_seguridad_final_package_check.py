#!/usr/bin/env python3
"""Regression tests for Seguridad encoded-motion diagnostics.

These tests intentionally prove that pixel-change samples are diagnostic only:
semantic motion remains the responsibility of independent encoded-media review.
"""
from __future__ import annotations
import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
SPEC = importlib.util.spec_from_file_location(
    'seguridad_final_package_check', SCRIPTS / 'seguridad_final_package_check.py')
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


def cue():
    return {
        'id': 'S01-C1.sentence-01',
        'concept_id': 'S01-C1',
        'visual_target_id': 'S01-C1.mechanism',
        'visual_at': 4.0,
        'visual_end_at': 10.5,
        'scene_end_at': 12.0,
    }


class EncodedMotionDiagnosticTests(unittest.TestCase):
    def test_static_pixel_samples_are_warning_not_semantic_failure(self):
        with patch.object(MODULE, 'frame', side_effect=lambda *args, **kwargs: object()), \
             patch.object(MODULE, 'delta', return_value=0.0):
            rows, warnings = MODULE.encoded_motion_diagnostic(Path('example.mp4'), [cue()])
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['max_pair_delta'], 0.0)
        self.assertEqual(rows[0]['window_emergence_delta'], 0.0)
        self.assertEqual(rows[0]['scope'], 'PIXEL_CHANGE_DIAGNOSTIC_ONLY_NOT_SEMANTIC_MOTION')
        self.assertEqual(len(warnings), 1)

    def test_motion_samples_are_recorded_without_claiming_semantics(self):
        values = iter([0.0, 0.45, 0.12, 1.6])
        with patch.object(MODULE, 'frame', side_effect=lambda *args, **kwargs: object()), \
             patch.object(MODULE, 'delta', side_effect=lambda *args, **kwargs: next(values)):
            rows, warnings = MODULE.encoded_motion_diagnostic(Path('example.mp4'), [cue()])
        self.assertEqual(rows[0]['pair_deltas'], [0.0, 0.45, 0.12])
        self.assertEqual(rows[0]['window_emergence_delta'], 1.6)
        self.assertEqual(warnings, [])
        self.assertNotIn('semantic', ''.join(map(str, rows[0].values())).lower().replace('not_semantic_motion',''))

    def test_invalid_authored_window_fails_hard(self):
        broken = cue(); broken['visual_end_at'] = 3.0
        with self.assertRaises(ValueError):
            MODULE.encoded_motion_diagnostic(Path('example.mp4'), [broken])


if __name__ == '__main__':
    unittest.main()
