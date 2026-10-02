#!/usr/bin/env python3
"""Verify exact owner-approved Fundamentos F1 assets locally and after deployment."""
from __future__ import annotations
import argparse,hashlib,json,os,re,time
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]
def objects(v):
    if isinstance(v,dict):
        yield v
        for x in v.values(): yield from objects(x)
    elif isinstance(v,list):
        for x in v: yield from objects(x)
def repo_path(public_path:str)->Path:
    return ROOT/("locales/"+public_path if public_path.startswith("en/") else "docs/"+public_path)
def digest(path:Path)->str:
    return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--origin")
    ap.add_argument("--revision",default=os.environ.get("GITHUB_SHA",""))
    ap.add_argument("--output",default="/tmp/fundamentos-f1-20261002.json")
    a=ap.parse_args()
    m=json.loads((ROOT/"docs/fundamentos-f1-20261002-release.json").read_text())
    assert m["series"]=="fundamentos-ia-iag" and m["round"]=="F1"
    assert m["owner_approval"]=="EXPLICIT_APPROVED_2026-09-28"
    assert m["exact_byte_policy"]=="NO_RERENDER_NO_TRANSCODE"
    assert len(m["objects"])==10
    for row in m["objects"]:
        p=repo_path(row["path"])
        assert p.stat().st_size==row["bytes"],("bytes",row["path"])
        assert digest(p)==row["sha256"],("sha256",row["path"])
        assert digest(repo_path(row["poster_path"]))==row["poster_sha256"],("poster",row["path"])
        assert digest(repo_path(row["captions_path"]))==row["captions_sha256"],("captions",row["path"])
        assert digest(repo_path(row["transcript_path"]))==row["transcript_sha256"],("transcript",row["path"])
    if not a.origin:
        print("FUNDAMENTOS_F1_LOCAL_EXACT_PASS 10 videos + posters + captions + transcripts")
        return
    cache={}
    def get(path):
        path=path.lstrip("/")
        if path in cache: return cache[path]
        url=a.origin.rstrip("/")+"/"+path
        sep="&" if "?" in url else "?"
        req=Request(url+sep+"revision="+a.revision,headers={"Cache-Control":"no-cache","User-Agent":"5sigmas-fundamentos-f1-release-check/1"})
        with urlopen(req,timeout=90) as r:
            assert r.status==200,(path,r.status)
            value=r.read()
        cache[path]=value
        return value
    if a.revision:
        current=None
        for _ in range(60):
            cache.pop("build.json",None)
            try: current=json.loads(get("build.json")).get("revision")
            except Exception: current=None
            if current==a.revision: break
            time.sleep(5)
        assert current==a.revision,("deployed_revision",current,a.revision)
    assert json.loads(get("fundamentos-f1-20261002-release.json"))==m
    results=[]
    for row in m["objects"]:
        raw=get(row["path"])
        assert len(raw)==row["bytes"] and hashlib.sha256(raw).hexdigest()==row["sha256"],row["path"]
        assert hashlib.sha256(get(row["poster_path"])).hexdigest()==row["poster_sha256"]
        assert hashlib.sha256(get(row["captions_path"])).hexdigest()==row["captions_sha256"]
        assert hashlib.sha256(get(row["transcript_path"])).hexdigest()==row["transcript_sha256"]
        captions=get(row["captions_path"]).decode()
        assert captions.startswith("WEBVTT") and captions.count(" --> ")==18,row["captions_path"]
        prefix="" if row["locale"]=="es" else "en/"
        cat=json.loads(get(prefix+"videos/catalog.json"))
        matches=[x for x in cat["videos"] if urlsplit(x["watch_url"]).path=="/"+row["watch"]]
        assert len(matches)==1 and matches[0]["duration_seconds"]==row["duration"],row["watch"]
        vmap=get(prefix+"video-sitemap.xml").decode()
        smap=get(prefix+"sitemap.xml").decode()
        assert row["watch"] in vmap and row["watch"] in smap and row["article"] in smap
        article=get(row["article"]).decode()
        watch=get(row["watch"]).decode()
        assert "<video" in article and "s5-video-embed" in article and row["watch"] in article
        assert row["article"] in watch and "s5-video-watch__transcript" in watch
        assert row["captions_path"] in watch and "<track" in watch
        found=[]
        for text in re.findall(r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>(.*?)</script>",watch,re.S):
            found.extend(n for n in objects(json.loads(text)) if n.get("@type")=="VideoObject")
        assert len(found)==1,row["watch"]
        v=found[0]
        assert urlsplit(v["contentUrl"]).path=="/"+row["path"]
        assert v["duration"]==row["duration_iso"] and v.get("inLanguage")==row["locale"]
        clips=v.get("hasPart",[])
        assert len(clips)==6,row["watch"]
        for actual,expected in zip(clips,row["chapters"]):
            assert actual["startOffset"]==expected["start"] and actual["endOffset"]==expected["end"] and actual["name"]==expected["name"]
        assert "potentialAction" not in v
        assert not re.search(r"<meta[^>]+name=.?robots.?[^>]+noindex",watch,re.I)
        results.append({"path":row["path"],"sha256":row["sha256"],"status":"PASS"})
        print("PASS exact Fundamentos F1 media + discovery",row["locale"],row["path"],flush=True)
    report={"scope":"Fundamentos F1 exact owner-approved release","revision":a.revision,"origin":a.origin,"media_count":10,"surface_count":20,"clips":60,"status":"PASS","results":results}
    Path(a.output).write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print("FUNDAMENTOS_F1_LIVE_PASS 10 media, 20 article/watch surfaces, 60 clips")
if __name__=="__main__": main()
