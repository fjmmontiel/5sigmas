export const FUNDAMENTOS_THEME=Object.freeze({
  background:'#FAFAF8',surface:'#FFFFFF',ink:'#17202A',muted:'#53606B',rule:'#D8DEE3',
  accent:'#2D6A9F',accentText:'#1F4E75',accentSurface:'#E8F1F7',bodyFont:'Arial',headlineFont:'Georgia'
});
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4};
const lum=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return .2126*linear(r)+.7152*linear(g)+.0722*linear(b)};
export const contrastRatio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
export function validateFundamentosTheme(T=FUNDAMENTOS_THEME){
  const issues=[];
  if(contrastRatio(T.ink,T.background)<7)issues.push('body-ink-contrast');
  if(contrastRatio(T.muted,T.background)<4.5)issues.push('muted-copy-contrast');
  if(contrastRatio(T.accentText,T.background)<4.5)issues.push('accent-text-contrast');
  if(T.accent!=='#2D6A9F'||T.accentText!=='#1F4E75'||T.accentSurface!=='#E8F1F7')issues.push('series-identity-drift');
  return issues;
}
