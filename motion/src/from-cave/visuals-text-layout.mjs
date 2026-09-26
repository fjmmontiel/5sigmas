import {drawFromCaveMechanism as drawBase} from './visuals.mjs';
import {drawFromCaveSemanticMotion} from './visuals-motion.mjs';

/** Paint.text intentionally handles one line. Semantic diagrams can opt into explicit line breaks. */
export function drawFromCaveMechanism(P, mechanism) {
  const baseText = P.text.bind(P);
  P.text = (value, x, y, size=28, color=P.T.ink, weight=400, align='left', maxWidth=10000, family=P.T.bodyFont) => {
    const text = String(value);
    if (!text.includes('\n')) return baseText(text, x, y, size, color, weight, align, maxWidth, family);
    const lines = text.split('\n');
    let widest = 0;
    for (const [index, line] of lines.entries()) {
      widest = Math.max(widest, baseText(line, x, y + index * size * 1.08, size, color, weight, align, maxWidth, family));
    }
    return widest;
  };
  try {
    drawBase(P, mechanism);
    drawFromCaveSemanticMotion(P, mechanism);
  } finally {
    P.text = baseText;
  }
}
