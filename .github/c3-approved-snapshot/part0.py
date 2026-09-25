from __future__ import annotations
import argparse, hashlib, json, math, os, subprocess, sys, time
from pathlib import Path
from typing import Iterable
import cairo
HERE = Path(__file__).resolve().parent
STORY = json.loads((HERE / 'story.json').read_text())
BG = '#FBFAF7'
INK = '#222720'
ACCENT = '#243B8F'
TINT = '#E8EDFB'
SERIES_BLUE = '#324AB2'
SUCCESS = '#237345'
SUCCESS_WASH = '#E3F0E6'
MUTED = '#697069'
RULE = '#D6DCD3'
RED = '#9A3E33'
ROSE = '#F4E5DD'
GOLD = '#8B5B1E'
SAND = '#F3EBDD'
WHITE = '#FFFFFF'
SERIF = 'Noto Serif Display'
SANS = 'Cabin'
TEXT_LAYOUT_CACHE = {}
def rgb(h):
    return tuple((int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)))
def clamp(x):
    return max(0.0, min(1.0, float(x)))
def ease(x):
    x = clamp(x)
    return x * x * (3 - 2 * x)
def blend(a, b, p):
    return tuple((x + (y - x) * p for x, y in zip(rgb(a), rgb(b))))
def L(lang, es, en):
    return es if lang == 'es' else en
class Draw:

    def __init__(self, ctx, w, h, lang='es', portrait=False):
        self.c = ctx
        self.w = w
        self.h = h
        self.lang = lang
        self.v = portrait
        self.bounds = []
        self.failures = []

    def color(self, col, alpha=1):
        r, g, b = rgb(col) if isinstance(col, str) else col
        self.c.set_source_rgba(r, g, b, clamp(alpha))

    def rect(self, x, y, w, h, fill=None, stroke=None, lw=2, alpha=1, r=0):
        c = self.c
        c.new_path()
        if r:
            r = min(r, w / 2, h / 2)
            c.arc(x + w - r, y + r, r, -math.pi / 2, 0)
            c.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
            c.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
            c.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
            c.close_path()
        else:
            c.rectangle(x, y, w, h)
        if fill:
            self.color(fill, alpha)
            c.fill_preserve()
        if stroke:
            self.color(stroke, alpha)
            c.set_line_width(lw)
            c.stroke()
        else:
            c.new_path()

    def line(self, x1, y1, x2, y2, col=RULE, lw=2, alpha=1, dash=None):
        c = self.c
        c.new_path()
        c.move_to(x1, y1)
        c.line_to(x2, y2)
        self.color(col, alpha)
        c.set_line_width(lw)
        c.set_dash(dash or [])
        c.stroke()
        c.set_dash([])

    def circle(self, x, y, r, fill=None, stroke=None, lw=2, alpha=1):
        c = self.c
        c.new_path()
        c.arc(x, y, r, 0, math.tau)
        if fill:
            self.color(fill, alpha)
            c.fill_preserve()
        if stroke:
            self.color(stroke, alpha)
            c.set_line_width(lw)
            c.stroke()
        else:
            c.new_path()

    def font(self, size, bold=False, serif=False):
        self.c.select_font_face(SERIF if serif else SANS, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
        self.c.set_font_size(size)

    def width(self, s, size, bold=False, serif=False):
        self.font(size, bold, serif)
        return self.c.text_extents(s).x_advance

    def lines(self, s, maxw, size, bold=False, serif=False):
        key = (str(s), round(maxw, 4), round(size, 4), bold, serif)
        if key in TEXT_LAYOUT_CACHE:
            return TEXT_LAYOUT_CACHE[key]
        out = []
        for para in str(s).split('\n'):
            words = para.split()
            line = ''
            for word in words:
                new = (line + ' ' + word).strip()
                if line and self.width(new, size, bold, serif) > maxw:
                    out.append(line)
                    line = word
                else:
                    line = new
            out.append(line)
        TEXT_LAYOUT_CACHE[key] = out
        return out

    def text(self, s, x, y, size=30, col=INK, width=None, align='left', bold=False, serif=False, alpha=1, leading=1.21, record=True):
        lines = self.lines(s, width, size, bold, serif) if width else str(s).split('\n')
        self.font(size, bold, serif)
        for i, line in enumerate(lines):
            ext = self.c.text_extents(line)
            xx = x - (ext.x_advance / 2 if align == 'center' else ext.x_advance if align == 'right' else 0)
            yy = y + i * size * leading
            self.color(col, alpha)
            self.c.move_to(xx, yy + size * 0.84)
            self.c.show_text(line)
            if record and alpha > 0.02:
                box = (xx + ext.x_bearing, yy + size * 0.84 + ext.y_bearing, ext.width, ext.height, str(line))
                self.bounds.append(box)
                if box[0] < -1 or box[1] < -1 or box[0] + box[2] > self.w + 1 or (box[1] + box[3] > self.h + 1):
                    self.failures.append(('canvas_text_overflow', box))
        return len(lines) * size * leading

    def arrow(self, points, p=1, col=ACCENT, lw=3, alpha=1, head=True):
        p = clamp(p)
        n = len(points)
        if n < 2 or p <= 0:
            return
        ds = [math.dist(a, b) for a, b in zip(points, points[1:])]
        target = sum(ds) * p
        traced = 0
        end = points[0]
        direction = 0
        for a, b, d in zip(points, points[1:], ds):
            q = min(1, max(0, (target - traced) / max(d, 1e-09)))
            if q <= 0:
                break
            end = (a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q)
            self.line(*a, *end, col, lw, alpha)
            direction = math.atan2(b[1] - a[1], b[0] - a[0])
            traced += d
            if q < 1:
                break
        if head:
            k = 12
            self.line(*end, end[0] - k * math.cos(direction - 0.5), end[1] - k * math.sin(direction - 0.5), col, lw, alpha)
            self.line(*end, end[0] - k * math.cos(direction + 0.5), end[1] - k * math.sin(direction + 0.5), col, lw, alpha)

    def tick(self, x, y, size=16, col=SUCCESS, alpha=1):
        self.line(x - size * 0.6, y, x - size * 0.1, y + size * 0.45, col, 3, alpha)
        self.line(x - size * 0.1, y + size * 0.45, x + size * 0.75, y - size * 0.65, col, 3, alpha)

    def cross(self, x, y, size=13, col=RED, alpha=1):
        self.line(x - size, y - size, x + size, y + size, col, 3, alpha)
        self.line(x - size, y + size, x + size, y - size, col, 3, alpha)
class Graph:

    def __init__(self, d, x, y, w, h, p):
        self.d = d
        self.c = d.c
        self.x = x
        self.y = y
        self.w = w
        self.h = h
        self.scale = w / 1000
        self.v = d.v
        self.lang = d.lang
        self.p = p
        self.H = h / self.scale
        self.base = len(d.bounds)

    def X(self, x):
        return self.x + x * self.scale

    def Y(self, y):
        return self.y + y * self.scale

    def rect(self, x, y, w, h, **kw):
        if 'lw' in kw:
            kw['lw'] *= self.scale
        if 'r' in kw:
            kw['r'] *= self.scale
        self.d.rect(self.X(x), self.Y(y), w * self.scale, h * self.scale, **kw)

    def line(self, x1, y1, x2, y2, **kw):
        if 'lw' in kw:
            kw['lw'] *= self.scale
        self.d.line(self.X(x1), self.Y(y1), self.X(x2), self.Y(y2), **kw)

    def circle(self, x, y, r, **kw):
        self.d.circle(self.X(x), self.Y(y), r * self.scale, **kw)

    def text(self, s, x, y, size=None, **kw):
        if size is None:
            size = 34 if self.v else 30
        if 'width' in kw:
            kw['width'] *= self.scale
        return self.d.text(s, self.X(x), self.Y(y), size * self.scale, **kw) / self.scale

    def label(self, es, en, x, y, **kw):
        return self.text(L(self.lang, es, en), x, y, **kw)

    def arrow(self, points, p=1, **kw):
        self.d.arrow([(self.X(x), self.Y(y)) for x, y in points], p, **kw)

    def tick(self, x, y, **kw):
        self.d.tick(self.X(x), self.Y(y), size=15 * self.scale, **kw)

    def cross(self, x, y, **kw):
        self.d.cross(self.X(x), self.Y(y), size=13 * self.scale, **kw)

    def box(self, x, y, w, h, es, en='', state='normal', alpha=1, size=None):
        color = {'normal': INK, 'active': ACCENT, 'pass': SUCCESS, 'unknown': GOLD, 'fail': RED, 'muted': MUTED}[state]
        fill = {'normal': WHITE, 'active': TINT, 'pass': SUCCESS_WASH, 'unknown': SAND, 'fail': ROSE, 'muted': BG}[state]
        self.rect(x, y, w, h, fill=fill, stroke=color if state != 'normal' else RULE, lw=2, alpha=alpha, r=3)
        s = L(self.lang, es, en or es)
        size = size or (34 if self.v else 30)
        lines = self.d.lines(s, (w - 26) * self.scale, size * self.scale, True)
        hh = len(lines) * size * 1.14
        if alpha > 0.02 and hh > h - 10:
            self.d.failures.append(('box_label_overflow', s, hh, h))
        self.text(s, x + w / 2, y + (h - hh) / 2, size=size, width=w - 26, align='center', bold=True, col=color, alpha=alpha, leading=1.14)

    def heading(self, es, en):
        self.label(es.upper(), en.upper(), 0, -2, size=22 if not self.v else 27, col=MUTED)

    def badge(self, es, en, y, state='active', alpha=1):
        self.box(60, y, 880, 80, es, en, state, alpha, size=33 if self.v else 30)

    def document(self, x, y, w=175, h=200, label='', state='normal', alpha=1):
        self.rect(x, y, w, h, fill=TINT if state == 'active' else WHITE, stroke=ACCENT if state == 'active' else RULE, alpha=alpha, lw=2)
        for i, q in enumerate([0.65, 0.83, 0.74, 0.53]):
            yy = y + 25 + i * 22
            if yy < y + h - 70:
                self.line(x + 18, yy, x + 18 + (w - 36) * q, yy, col=ACCENT if state == 'active' else RULE, lw=3, alpha=alpha)
        if label:
            self.text(label, x + w / 2, y + h - 50, size=28, align='center', col=ACCENT if state == 'active' else INK, alpha=alpha, bold=True)

    def caption(self, es, en):
        self.label(es, en, 500, self.H - 36, size=24 if self.v else 21, col=MUTED, align='center', width=980)

    def finish(self):
        for bx, by, bw, bh, s in self.d.bounds[self.base:]:
            if bx < self.x - 3 or bx + bw > self.x + self.w + 3 or by < self.y - 10 or (by + bh > self.y + self.h + 5):
                self.d.failures.append(('diagram_text_overflow', s, (bx, by, bw, bh), (self.x, self.y, self.w, self.h)))
def path_point(points, p):
    p = clamp(p)
    ds = [math.dist(a, b) for a, b in zip(points, points[1:])]
    left = sum(ds) * p
    for a, b, d in zip(points, points[1:], ds):
        if left <= d:
            return (a[0] + (b[0] - a[0]) * left / max(d, 1e-09), a[1] + (b[1] - a[1]) * left / max(d, 1e-09))
        left -= d
    return points[-1]
MOTION_SECONDS = {'retrieval': [1.5, 3.2, 1.6], 'boundary': [1.8, 3.0, 1.6], 'hardnegative': [1.6, 3.4, 1.5], 'familysplit': [1.6, 3.0, 1.5], 'agreement': [3.0, 1.8, 1.5], 'position': [1.5, 3.3, 1.5], 'timeout': [3.1, 3.0, 1.7], 'reconcile': [3.0, 2.0, 1.6], 'shadow': [3.2, 3.0, 1.5], 'ab': [1.7, 3.5, 1.5], 'neighbors': [2.8, 3.3, 1.7], 'repair': [1.7, 3.3, 1.7]}
def outcome(g):
    a, b, c = g.p
    g.heading('La frase y el estado del mundo', 'The sentence and the world state')
    g.box(90, 80, 820, 100, '«Reembolso completado»', '“Refund complete”', 'active', a, size=44)
    g.label('MENSAJE', 'MESSAGE', 500, 205, align='center', col=MUTED, alpha=a)
    g.arrow([(500, 253), (500, 303)], b)
    g.box(50, 330, 425, 185, 'Solicitud: R-104\nImporte: 40 €', 'Request: R-104\nAmount: €40', 'normal', b)
    g.box(525, 330, 425, 185, 'Registro backend\nSin confirmar', 'Backend record\nNot confirmed', 'unknown', b)
    g.line(475, 422, 525, 422, col=RULE, lw=3, alpha=b)
    if c:
        g.badge('El texto no demuestra el éxito', 'The text does not prove success', 570, 'unknown', c)
def model(g):
    a, b, c = g.p
    g.heading('Experimento controlado', 'Controlled experiment')
    g.document(400, 60, 200, 145, L(g.lang, 'Mismo caso', 'Same case'), alpha=a)
    g.arrow([(450, 205), (230, 268)], a)
    g.arrow([(550, 205), (770, 268)], a)
    g.box(90, 275, 280, 115, 'Modelo A', 'Model A', 'active', a, size=42)
    g.box(630, 275, 280, 115, 'Modelo B', 'Model B', 'active', a, size=42)
    for x in [70, 610]:
        for i, s in enumerate([('Contexto fijo', 'Fixed context'), ('Tools fijas', 'Fixed tools'), ('Rúbrica fija', 'Fixed rubric')]):
            g.label(*s, x + 160, 420 + i * 49, align='center', alpha=b)
            g.tick(x + 325, 439 + i * 49, alpha=b)
    g.line(500, 275, 500, 560, col=RULE, alpha=b)
    g.badge('Conclusión limitada a este protocolo', 'Conclusion limited to this protocol', 590, 'normal', c)
def retrieval(g):
    a, b, c = g.p
    g.heading('Localiza la evidencia que falta', 'Locate the missing evidence')
    for i in range(4):
        x = 35 + i * 240
        if i != 2:
            g.document(x, 70, 190, 166, 'D' + str(i + 1), alpha=a)
    g.document(515, 70, 190, 166, '', alpha=a)
    g.text('D3', 610, 186, size=28, align='center', col=INK, alpha=a * ease((b - 0.15) / 0.3))
    g.label('Corpus', 'Corpus', 975, 265, align='right', size=28, col=MUTED, alpha=a)
    g.box(275, 370, 450, 180, '', '', 'normal', a)
    g.label('CONTEXTO', 'CONTEXT', 500, 385, align='center', size=28, col=MUTED, alpha=a)
    g.label('Falta la política', 'Policy is missing', 500, 455, align='center', size=33, col=GOLD, alpha=a * (1 - ease(b / 0.25)))
    xx = 515 + (405 - 515) * b + 270 * math.sin(math.pi * b)
    yy = 70 + (437 - 70) * b
    ww = 190 + (190 - 190) * b
    hh = 166 + (92 - 166) * b
    g.document(xx, yy, ww, hh, 'D3', state='active', alpha=a)
    g.label('Política vigente', 'Current policy', 610, 23, align='center', size=30, col=ACCENT, alpha=a)
    g.badge('Repite ahora la tarea completa', 'Now rerun the complete task', 600, 'normal', c)
def workflow(g):
    a, b, c = g.p
    g.heading('Reglas antes del efecto', 'Rules before the side effect')
    g.box(310, 60, 380, 92, 'Petición de reembolso', 'Refund request', 'normal', a)
    g.arrow([(500, 152), (500, 215)], a)
    g.box(270, 225, 460, 110, '¿Autorizado?', 'Authorized?', 'unknown', b, size=40)
    g.arrow([(355, 335), (250, 420)], b, col=RED)
    g.arrow([(645, 335), (750, 420)], b)
    g.box(65, 435, 365, 112, 'NO · Bloquear', 'NO · Block', 'fail', b)
    g.box(570, 435, 365, 112, 'SÍ · Ejecutar', 'YES · Execute', 'active', b)
    g.arrow([(250, 547), (250, 595)], c, col=RED)
    g.arrow([(750, 547), (750, 595)], c)
    g.label('Sin write', 'No write', 250, 610, align='center', col=RED, alpha=c)
    g.label('Write permitido', 'Authorized write', 750, 610, align='center', col=ACCENT, alpha=c)
def trace(g):
    if g.v:
        a, b, c = g.p
        g.heading('Una ejecución concreta', 'One specific execution')
        rows = [('Solicitud', 'Request', a), ('Write', 'Write', a), ('Timeout', 'Timeout', b), ('Retry', 'Retry', b), ('Respuesta', 'Answer', c)]
        for i, (es, en, pp) in enumerate(rows):
            yy = 88 + i * 120
            g.circle(90, yy + 24, 15, fill=GOLD if i == 2 else ACCENT, alpha=pp)
            if i:
                g.arrow([(90, yy - 75), (90, yy)], pp, col=RULE)
            g.label(es, en, 135, yy + 2, size=38, alpha=pp)
            if i == 1:
                g.box(550, yy - 16, 415, 88, 'R-104 · 40 €', 'R-104 · €40', 'pass', pp, size=37)
            if i == 2:
                g.label('Resultado desconocido', 'Result unknown', 550, yy + 4, width=420, size=32, col=GOLD, alpha=pp)
            if i == 3:
                g.box(550, yy - 16, 415, 88, 'R-104 · 40 €', 'R-104 · €40', 'fail', c, size=37)
        g.label('Dos efectos para una solicitud', 'Two side effects for one request', 500, 664, align='center', width=970, size=34, col=RED, alpha=c)
        return
    a, b, c = g.p
    g.heading('Una ejecución concreta', 'One specific execution')
    stages = [('Solicitud', 'Request'), ('Write', 'Write'), ('Timeout', 'Timeout'), ('Retry', 'Retry'), ('Respuesta', 'Answer')]
    for i, (es, en) in enumerate(stages):
        pp = a if i < 2 else b if i < 4 else c
        xx = 92 + i * 203
        g.circle(xx, 205, 19, fill=GOLD if i == 2 else ACCENT, alpha=pp)
        if i:
            g.arrow([(92 + (i - 1) * 203 + 22, 205), (xx - 22, 205)], pp, col=GOLD if i == 2 else ACCENT)
        g.label(es, en, xx, 252, align='center', size=29, alpha=pp)
        g.text(f't{i}', xx, 150, align='center', size=25, col=MUTED, alpha=pp)
    g.label('ESTADO BACKEND', 'BACKEND STATE', 30, 375, col=MUTED, alpha=b, size=26)
    g.box(70, 425, 355, 120, 'R-104 · 40 €', 'R-104 · €40', 'active', b, size=38)
    g.box(575, 425, 355, 120, 'R-104 · 40 €', 'R-104 · €40', 'fail', c, size=38)
    g.arrow([(425, 485), (555, 485)], c, col=RED)
    g.badge('Dos efectos para una solicitud', 'Two side effects for one request', 590, 'fail', c)
def boundary(g):
    a, b, c = g.p
    g.heading('Dos preguntas complementarias', 'Two complementary questions')
    g.rect(50, 65, 900, 430, fill=WHITE, stroke=RULE, lw=2, alpha=a)
    g.label('SISTEMA · TAREA COMPLETA', 'SYSTEM · COMPLETE TASK', 500, 86, align='center', col=MUTED, alpha=a, size=28)
    for i, (es, en) in enumerate([('Retriever', 'Retriever'), ('Modelo', 'Model'), ('Tools', 'Tools')]):
        xx = 90 + i * 305
        g.box(xx, 205, 220, 115, es, en, 'active' if i == 0 else 'normal', a)
        if i < 2:
            g.arrow([(xx + 222, 262), (xx + 282, 262)], a, col=RULE)
    x = 73 + (42 - 73) * b
    y = 186 + (57 - 186) * b
    w = 254 + (916 - 254) * b
    h = 153 + (446 - 153) * b
    g.rect(x, y, w, h, stroke=ACCENT, lw=4, alpha=a)
    g.label('¿Dónde falla?', 'Where does it fail?', 210, 365, align='center', col=ACCENT, alpha=a, size=30)
    g.label('¿La tarea queda resuelta y cumple la política?', 'Is the task solved within policy?', 500, 442, align='center', width=850, alpha=b, size=31)
    g.badge('Caso + versiones + protocolo', 'Case + versions + protocol', 600, 'active', c)
