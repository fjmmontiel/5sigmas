"""Small deterministic diagnostic for chapter02 Spanish. No production files are written."""
from pathlib import Path
import sys,json,hashlib,cairo
import build_release
build_release.assemble()
import render as r
EXPECTED={'evalunit':'3a39b7973772db70e8fad8b5ab36afc2586648e92a8a28695290defb6b856a0a','coverage':'8f95a32116716d0d1820c65fe94427c5e774a5a96302e12dac1c42f5b8a27c19','hardnegative':'2b0ee8021b584de6a8e80855f3222217f438128365a389257df0eb0624d7e2e7','familysplit':'f6468fb1905c4c0d330cc2677e7e258336820bc8bade74ba96186d4c8b1d1694','holdout':'df7d224b46eef480257f1a5bfc2b3ccc082dffae31118755fb0d55bf0823d799','version':'21a9550672c5675701a71dae9c3ed9c32bf423d683781792af25639d9d66827f'}
ch=r.STORY['chapters'][1];offset=0;rows=[]
for sc in ch['scenes']:
 h=hashlib.sha256()
 for t in [0,3,7.9,8.2,8.575,9.1,9.7,10.2,10.7,11.5,12,14.7,15.2,16,19,sc['duration']-1/60]:
  n=round((offset+t)*60);s=r.render_frame(ch,'es','h',n/60);s.flush();h.update(s.get_data())
 row={'scene':sc['id'],'sha256':h.hexdigest(),'expected':EXPECTED[sc['id']],'match':h.hexdigest()==EXPECTED[sc['id']]};rows.append(row);print(json.dumps(row),flush=True)
 offset+=sc['duration']
out={'python':sys.version,'pycairo':cairo.version,'cairo':cairo.cairo_version_string(),'all_match':all(x['match'] for x in rows),'rows':rows}
Path('/tmp/c3-source-diagnostic.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='rows'}))
sys.exit(0 if out['all_match'] else 2)
