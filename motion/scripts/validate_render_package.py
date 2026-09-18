#!/usr/bin/env python3
"""Strict validator for one rendered 5sigmas motion package."""
from __future__ import annotations
import argparse,json,re,subprocess
from pathlib import Path
from PIL import Image


def fail(message):
    raise SystemExit(f'RENDER PACKAGE INVALID: {message}')

def parse_ts(value):
    h,m,rest=value.split(':');s,ms=rest.split('.')
    return int(h)*3600+int(m)*60+int(s)+int(ms)/1000

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('spec',type=Path)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--orientation',choices=['horizontal','vertical'],required=True)
    args=ap.parse_args()
    spec=json.loads(args.spec.read_text())
    stem=f"{spec['id']}-{args.orientation}"
    required={
        'mp4':args.out/f'{stem}.mp4',
        'poster':args.out/f'{stem}.jpg',
        'validation':args.out/f'{stem}-validation.json',
        'chapters':args.out/f'{stem}-chapters.json',
        'transcript':args.out/f'{stem}-transcript.md',
        'captions':args.out/f'{stem}-captions.vtt',
    }
    for kind,path in required.items():
        if not path.is_file() or path.stat().st_size==0:fail(f'missing/empty {kind}: {path}')

    expected_duration=sum(float(scene['duration']) for scene in spec['scenes'])
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(required['mp4'])]))
    videos=[s for s in probe['streams'] if s.get('codec_type')=='video'];audios=[s for s in probe['streams'] if s.get('codec_type')=='audio']
    if len(videos)!=1:fail(f'expected one video stream, found {len(videos)}')
    if audios:fail('unexpected audio stream; narration is not part of this release contract')
    video=videos[0]
    if video.get('codec_name')!='h264':fail(f"codec must be h264, got {video.get('codec_name')}")
    if video.get('pix_fmt')!='yuv420p':fail(f"pixel format must be yuv420p, got {video.get('pix_fmt')}")
    rate=video.get('r_frame_rate','0/1').split('/');fps=float(rate[0])/float(rate[1])
    if abs(fps-60)>1e-6:fail(f'fps must be 60, got {fps}')
    width,height=int(video['width']),int(video['height'])
    if args.orientation=='horizontal' and not width>height:fail(f'horizontal aspect expected, got {width}x{height}')
    if args.orientation=='vertical' and not height>width:fail(f'vertical aspect expected, got {width}x{height}')
    actual_duration=float(probe['format']['duration'])
    if abs(actual_duration-expected_duration)>.12:fail(f'duration drift: spec={expected_duration:.3f}s media={actual_duration:.3f}s')

    report=json.loads(required['validation'].read_text())
    if report.get('spec')!=spec['id'] or report.get('variant')!=args.orientation:fail('validation report identity mismatch')
    if any(row.get('issues') for row in report.get('layout',[])):fail('validation report contains layout issues')
    if not all(report.get('setup',{}).get('fonts',[])):fail('required fonts were not loaded')

    chapters=json.loads(required['chapters'].read_text())
    if len(chapters)!=len(spec['scenes']):fail('chapter count does not match scene count')
    cursor=0.0
    for scene,chapter in zip(spec['scenes'],chapters):
        if chapter.get('id')!=scene['id']:fail(f"chapter id mismatch for {scene['id']}")
        if abs(float(chapter['start'])-cursor)>1e-7:fail(f"chapter gap/overlap before {scene['id']}")
        cursor+=float(scene['duration'])
        if abs(float(chapter['end'])-cursor)>1e-7:fail(f"chapter end mismatch for {scene['id']}")
    if abs(cursor-expected_duration)>1e-7:fail('chapters do not cover the full duration')

    transcript=required['transcript'].read_text()
    if not transcript.startswith(f"# {spec['title']}\n"):fail('transcript title mismatch')
    for scene in spec['scenes']:
        for paragraph in scene['paragraphs']:
            if paragraph not in transcript:fail(f"transcript missing paragraph from scene {scene['id']}")
        if scene.get('source') and scene['source'] not in transcript:fail(f"transcript missing source from scene {scene['id']}")

    vtt=required['captions'].read_text()
    if not vtt.startswith('WEBVTT\n'):fail('captions must be WebVTT')
    blocks=re.findall(r'(?m)^\d+\n(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})\n(.+)$',vtt)
    expected=[];offset=0.0
    for scene in spec['scenes']:
        for cue in scene.get('cues',[]):expected.append((offset+float(cue['at']),offset+float(cue['end']),cue['text']))
        offset+=float(scene['duration'])
    if len(blocks)!=len(expected):fail(f'caption cue count {len(blocks)} != spec cue count {len(expected)}')
    previous=0.0
    for i,((start,end,text),(exp_start,exp_end,exp_text)) in enumerate(zip(blocks,expected),1):
        start_s,end_s=parse_ts(start),parse_ts(end)
        if start_s+1e-6<previous or end_s<=start_s:fail(f'caption timing invalid at cue {i}')
        if abs(start_s-exp_start)>.0011 or abs(end_s-exp_end)>.0011:fail(f'caption timing drift at cue {i}')
        if text!=exp_text:fail(f'caption text drift at cue {i}')
        previous=end_s
    if expected and expected[-1][1]>expected_duration+1e-7:fail('captions extend beyond media duration')

    with Image.open(required['poster']) as poster:
        pw,ph=poster.size
    if args.orientation=='horizontal' and not pw>ph:fail(f'horizontal poster aspect invalid: {pw}x{ph}')
    if args.orientation=='vertical' and not ph>pw:fail(f'vertical poster aspect invalid: {pw}x{ph}')

    print(json.dumps({
        'spec':spec['id'],'orientation':args.orientation,'duration':actual_duration,'fps':fps,
        'dimensions':[width,height],'caption_cues':len(blocks),'chapters':len(chapters),
        'package':'valid'
    },ensure_ascii=False))

if __name__=='__main__':main()
