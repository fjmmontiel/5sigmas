const HEX=/^#[0-9A-Fa-f]{6}$/;
const luminance=hex=>{
  const c=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
};
export const contrastRatio=(a,b)=>{
  const [hi,lo]=[luminance(a),luminance(b)].sort((x,y)=>y-x);
  return (hi+.05)/(lo+.05);
};
export function validateVisualIdentity(identity,baseTheme){
  if(!identity)throw new Error('Missing visualIdentity; every release unit must lock one accent');
  for(const k of ['unit','accentName','accent','accentText','accentSurface']){
    if(typeof identity[k]!=='string'||!identity[k].trim())throw new Error(`visualIdentity.${k} required`);
  }
  for(const k of ['accent','accentText','accentSurface'])if(!HEX.test(identity[k]))throw new Error(`visualIdentity.${k} must be #RRGGBB`);
  if(!Array.isArray(identity.uses)||identity.uses.length<3)throw new Error('visualIdentity.uses must document functional accent uses');
  if(!Array.isArray(identity.forbidden)||!identity.forbidden.some(x=>/gradient/i.test(x)))throw new Error('visualIdentity.forbidden must explicitly prohibit decorative gradients');
  const bg=baseTheme?.background||'#FFFFFF';
  if(contrastRatio(identity.accentText,bg)<4.5)throw new Error('visualIdentity.accentText must meet WCAG AA contrast on the base background');
  return true;
}
export function resolveTheme(baseTheme,spec){
  validateVisualIdentity(spec.visualIdentity,baseTheme);
  return {...baseTheme,
    accent:spec.visualIdentity.accent,
    accentText:spec.visualIdentity.accentText,
    accentSurface:spec.visualIdentity.accentSurface,
    semantic:{...(baseTheme.semantic||{}),...(spec.visualIdentity.semantic||{})}
  };
}
