export const FROM_CAVE_THEME = Object.freeze({
  background: '#FAFBFA',
  surface: '#FFFFFF',
  ink: '#17211F',
  muted: '#52605D',
  rule: '#D7E0DD',
  accent: '#26A69A',
  accentText: '#00776F',
  accentSurface: '#E7F4F0',
  bodyFont: 'Arial',
  headlineFont: 'Georgia'
});

const linear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const rgb = [1,3,5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return 0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
};
export const contrastRatio = (a, b) => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export function validateFromCaveTheme(theme = FROM_CAVE_THEME) {
  const issues = [];
  if (contrastRatio(theme.ink, theme.background) < 7) issues.push('body-ink-contrast');
  if (contrastRatio(theme.muted, theme.background) < 4.5) issues.push('muted-copy-contrast');
  if (contrastRatio(theme.accentText, theme.background) < 4.5) issues.push('accent-text-contrast');
  if (theme.accent !== '#26A69A' || theme.accentText !== '#00776F' || theme.accentSurface !== '#E7F4F0') issues.push('series-identity-drift');
  return issues;
}
