"""Regression checks for exact sub-second media/chapter timing in both locales."""
from pathlib import Path
import importlib.util, json, math, sys, unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from hooks import video_sitemap as es, video_sitemap_en as en
class FractionalTiming(unittest.TestCase):
 def test_integer_compatibility_and_fractional_seconds(self):
  fixtures={'PT36S':36,'PT2M12S':132,'PT130.8S':130.8,'PT2M10.433333S':130.433333,'PT1H2M3.25S':3723.25}
  for module in [es,en]:
   for text,expected in fixtures.items():self.assertEqual(module._duration_to_seconds(text),expected)
   for text in ['', 'P130S','PT-1S','PTNaNS','PTInfinityS','PT1.2.3S']:self.assertEqual(module._duration_to_seconds(text),0)
 def test_timestamp_precision_and_invalid_values(self):
  for module in [es,en]:
   for value in [0,21.5,43.166667,130.8]:self.assertEqual(module._timestamp_to_seconds(value),value)
   for value in [True,False,-1,float('nan'),float('inf')]:self.assertIsNone(module._timestamp_to_seconds(value))
   self.assertEqual(module._timestamp_to_seconds('2:10'),130)
 def test_clock_display_is_separate_from_precise_offsets(self):
  for module in [es,en]:
   self.assertEqual(module._clock_label(130.8),'2:10')
   self.assertEqual(module._clock_label(3601.25),'1:00:01')
 def test_all_approved_chapter_boundaries(self):
  m=json.loads((ROOT/'docs/coding-c1-release.json').read_text())
  self.assertEqual(len(m['objects']),12)
  for row in m['objects']:
   for module in [es,en]:
    self.assertEqual(module._duration_to_seconds(row['duration_iso']),row['duration'])
    self.assertEqual(module._normalize_chapters(row['chapters'],row['duration']),row['chapters'])
   self.assertAlmostEqual(row['frames']/60,row['duration'],places=5)
   self.assertEqual(row['chapters'][-1]['end'],row['duration'])
 def test_invalid_or_outside_chapters_are_not_admitted(self):
  for module in [es,en]:
   rows=module._normalize_chapters([{'name':'negative','start':-1},{'name':'nonfinite','start':float('nan')},{'name':'outside','start':131},{'name':'valid','start':21.5,'end':200}],130.8)
   self.assertEqual(rows,[{'name':'valid','start':21.5,'end':130.8}])
if __name__=='__main__':unittest.main(verbosity=2)
