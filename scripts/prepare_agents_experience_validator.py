#!/usr/bin/env python3
"""Prepare the focused Agents browser validator for sequential reader-control probes.

The first integration run proved all 48 contexts reached the control phase but then
failed for one reason only: the validator opened the reader library and immediately
attempted the next background control while the modal correctly intercepted pointer
input. This preparation is intentionally exact/fail-closed: it patches one known
probe block, requires exactly one match, and adds an explicit close-control check.
It changes no product code and relaxes no quality threshold.
"""
from pathlib import Path

path = Path("scripts/validate_agents_full_experience.mjs")
text = path.read_text(encoding="utf-8")
old = '''    const safeButtons = article.locator('button:not([data-s5-inline-video-start]):not([type="submit"]), [role="button"]:not([data-s5-inline-video-start])');
    const count = await safeButtons.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const control = safeButtons.nth(i);
      if (!(await control.isVisible())) continue;
      try {
        await control.scrollIntoViewIfNeeded();
        if (job.width === 390) await control.tap({ timeout: 2500 });
        else await control.click({ timeout: 2500 });
        await page.waitForTimeout(80);
      } catch (error) {
        errors.push({ code: 'ARTICLE_CONTROL_INTERACTION_FAILED', index: i, detail: String(error) });
      }
    }
'''
new = '''    const safeButtons = article.locator('button:not([data-s5-inline-video-start]):not([type="submit"]):not([data-s5-reader-close]), [role="button"]:not([data-s5-inline-video-start]):not([data-s5-reader-close])');
    const count = await safeButtons.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const control = safeButtons.nth(i);
      if (!(await control.isVisible())) continue;
      try {
        await control.scrollIntoViewIfNeeded();
        if (job.width === 390) await control.tap({ timeout: 2500 });
        else await control.click({ timeout: 2500 });
        await page.waitForTimeout(80);

        // Reader-library controls legitimately open a modal. Prove that the modal
        // is operable, then close it through the product's own close control before
        // probing the next background control. The first run's 48/48 failures came
        // from omitting this lifecycle step, not from a page defect.
        const dialog = article.locator('[data-s5-reader-library][open]').first();
        if (await dialog.count()) {
          const close = dialog.locator('[data-s5-reader-close]').first();
          if (!(await close.count()) || !(await close.isVisible())) {
            errors.push({ code: 'READER_DIALOG_CLOSE_CONTROL_MISSING', index: i });
          } else {
            if (job.width === 390) await close.tap({ timeout: 2500 });
            else await close.click({ timeout: 2500 });
            await page.waitForTimeout(80);
            if (await article.locator('[data-s5-reader-library][open]').count()) {
              errors.push({ code: 'READER_DIALOG_DID_NOT_CLOSE', index: i });
            }
          }
        }
      } catch (error) {
        errors.push({ code: 'ARTICLE_CONTROL_INTERACTION_FAILED', index: i, detail: String(error) });
      }
    }
'''
count = text.count(old)
if count != 1:
    raise SystemExit(f"expected exactly one known Agents control-probe block, found {count}; refusing ambiguous patch")
patched = text.replace(old, new, 1)
if patched.count("READER_DIALOG_DID_NOT_CLOSE") != 1:
    raise SystemExit("postcondition failed: reader dialog lifecycle guard missing")
path.write_text(patched, encoding="utf-8")
print("prepared Agents validator: sequential modal lifecycle enforced")
