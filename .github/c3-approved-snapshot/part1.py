def evalunit(g):
    a, b, c = g.p
    g.heading('La unidad reproducible', 'The reproducible unit')
    items = [('Entrada', 'Input'), ('Contexto', 'Context'), ('Referencia', 'Reference')]
    for i, z in enumerate(items):
        g.document(55 + i * 320, 70, 250, 210, L(g.lang, *z), state='active' if i == 2 else 'normal', alpha=a)
    for i in range(3):
        g.arrow([(180 + i * 320, 280), (180 + i * 320, 334), (500, 334), (500, 388)], b, col=RULE)
    g.box(75, 405, 395, 110, 'Rúbrica', 'Rubric', 'active', b, size=42)
    g.box(530, 405, 395, 110, 'Harness', 'Harness', 'active', b, size=42)
    g.badge('Una versión del eval', 'One evaluation release', 590, 'normal', c)
def coverage(g):
    a, b, c = g.p
    g.heading('Matriz de cobertura ilustrativa', 'Illustrative coverage matrix')
    cols = [('Normal', 'Normal'), ('Límite', 'Boundary'), ('Fallo parcial', 'Partial failure')]
    for i, z in enumerate(cols):
        g.label(*z, 260 + i * 265, 75, align='center', width=240, size=29, alpha=a)
    for r, z in enumerate([('Leer', 'Read'), ('Escribir', 'Write'), ('Reintentar', 'Retry')]):
        g.label(*z, 5, 184 + r * 120, size=28, alpha=a)
        for k in range(3):
            x = 145 + k * 265
            y = 145 + r * 120
            filled = k == 0 or (b > 0.5 and (not (r == 2 and k == 2)))
            g.rect(x, y, 240, 92, fill=TINT if filled else WHITE, stroke=ACCENT if filled else RULE, alpha=a, lw=2)
            if filled:
                g.tick(x + 120, y + 46, alpha=a if k == 0 else b)
            else:
                g.text('?', x + 120, y + 23, size=40, col=GOLD, align='center', alpha=a)
            if r == 2 and k == 2 and c:
                g.rect(x, y, 240, 92, stroke=GOLD, lw=4, alpha=c)
    g.badge('Más filas no cubren esta celda', 'More rows do not cover this cell', 570, 'unknown', c)
def hardnegative(g):
    a, b, c = g.p
    g.heading('Política de ejemplo: hasta 30 días', 'Example policy: through day 30')
    for xx, ident in [(75, 'A'), (555, 'B')]:
        g.box(xx, 65, 370, 174, 'Mismo producto\nMismo estado', 'Same product\nSame condition', 'normal', a, size=34)
        g.text(ident, xx + 25, 255, size=27, col=MUTED, alpha=a)
    day = round(29 + 2 * b, 1)
    allowed = day <= 30
    number = str(int(day)) if day.is_integer() else f'{day:.1f}'
    if g.lang == 'es':
        number = number.replace('.', ',')
    g.label('29 días', '29 days', 260, 275, align='center', col=SUCCESS, size=57, bold=True, alpha=a)
    g.text(number + ' ' + L(g.lang, 'días', 'days'), 740, 275, align='center', col=SUCCESS if allowed else RED, size=57, bold=True, alpha=a)
    for yy, ident in [(398, 'A'), (466, 'B')]:
        g.line(180, yy, 820, yy, col=RULE, lw=3, alpha=a)
        g.text(ident, 100, yy - 18, size=32, col=INK, alpha=a)
    g.line(500, 365, 500, 494, col=GOLD, lw=3, alpha=a)
    for x, label in [(300, '29'), (500, '30'), (700, '31')]:
        g.text(label, x, 504, size=28, col=GOLD if x == 500 else MUTED, align='center', alpha=a)
    g.circle(300, 398, 13, fill=SUCCESS, alpha=a)
    x = 300 + 200 * (day - 29)
    g.line(300, 466, min(x, 500), 466, col=SUCCESS, lw=5, alpha=a)
    if x > 500:
        g.line(500, 466, x, 466, col=RED, lw=5, alpha=a)
    g.circle(x, 466, 15, fill=SUCCESS if allowed else RED, stroke=BG, lw=2, alpha=a)
    g.box(75, 568, 370, 85, 'Permitir', 'Allow', 'pass', c, size=40)
    g.box(555, 568, 370, 85, 'Rechazar', 'Reject', 'fail', c, size=40)
def familysplit(g):
    a, b, c = g.p
    g.heading('Variantes de la misma fuente', 'Variants of the same source')
    g.label('Familia A', 'Family A', 280, 40, align='center', col=ACCENT, alpha=a, size=34)
    g.label('Familia B', 'Family B', 825, 40, align='center', col=INK, alpha=a, size=34)
    g.rect(20, 96, 530, 185, stroke=ACCENT, lw=2, alpha=a)
    g.rect(650, 96, 345, 185, stroke=MUTED, lw=2, alpha=a)
    g.rect(20, 405, 530, 180, fill=TINT, stroke=ACCENT, lw=2, alpha=b)
    g.rect(650, 405, 345, 180, fill=WHITE, stroke=MUTED, lw=2, alpha=b)
    g.text('DEV', 280, 608, align='center', size=36, col=ACCENT, alpha=b)
    g.text('HOLDOUT', 825, 608, align='center', size=36, col=INK, alpha=b)
    for family, n, startx in [('A', 3, 40), ('B', 2, 670)]:
        for i in range(n):
            x = startx + i * 170
            y = 112 + 309 * b
            g.document(x, y, 145, 145, f'{family}{i + 1}', state='active' if family == 'A' else 'normal', alpha=a)
    g.arrow([(440, 320), (600, 398)], c, col=RED)
    g.cross(572, 372, alpha=c)
    g.label('No cruzar variantes', 'Do not split variants', 500, 670, align='center', col=RED, alpha=c, size=30)
def holdout(g):
    a, b, c = g.p
    g.heading('Bancos con funciones diferentes', 'Banks with different roles')
    vals = [('DEV', 'DEV', 'Ajustar', 'Tune'), ('REGRESIÓN', 'REGRESSION', 'Recordar fallos', 'Remember failures'), ('HOLDOUT', 'HOLDOUT', 'Decidir release', 'Release decision')]
    for i, (es, en, es2, en2) in enumerate(vals):
        y = 65 + i * 165
        pp = a if i == 0 else b if i == 1 else c
        g.box(30, y, 340, 110, es, en, 'active' if i == 0 else 'normal', pp, size=35)
        g.arrow([(370, y + 55), (440, y + 55)], pp, col=ACCENT if i == 0 else MUTED)
        g.label(es2, en2, 480, y + 38, size=36, alpha=pp, width=500)
    g.arrow([(915, 450), (975, 450), (975, 40), (200, 40), (200, 56)], c, col=RED)
    g.cross(800, 40, alpha=c)
    g.label('Sin ajuste contra el test final', 'No tuning against the final test', 500, 607, align='center', col=RED, alpha=c, size=32)
def version(g):
    a, b, c = g.p
    g.heading('Cambios visibles y trazables', 'Visible, traceable changes')
    g.box(55, 65, 390, 105, 'Eval v1', 'Eval v1', 'normal', a, size=44)
    g.box(555, 65, 390, 105, 'Eval v2', 'Eval v2', 'active', b, size=44)
    rows = [('Casos', 'Cases', 'A · B · C', 'A · B · C'), ('Rúbrica', 'Rubric', 'r1', 'r2'), ('Harness', 'Harness', 'h1', 'h1')]
    for i, (es, en, v1, v2) in enumerate(rows):
        y = 223 + i * 115
        g.label(es, en, 5, y - 7, size=26, col=MUTED, alpha=a)
        g.box(130, y + 26, 300, 70, v1, v1, 'normal', a, size=34)
        g.box(630, y + 26, 300, 70, v2, v2, 'unknown' if i == 1 else 'normal', b, size=34)
        g.arrow([(440, y + 60), (614, y + 60)], b, col=GOLD if i == 1 else RULE)
    g.badge('Comparabilidad: declarar qué cambió', 'Comparability: declare what changed', 590, 'unknown', c)
def grader(g):
    a, b, c = g.p
    g.heading('Tres criterios, tres formas de comprobar', 'Three criteria, three ways to check')
    g.label('ESTADO FINAL', 'FINAL STATE', 0, 65, col=MUTED, size=26, alpha=a)
    g.text('refund_count == 1', 30, 120, size=47, col=INK, alpha=a)
    g.tick(920, 146, alpha=a)
    g.label('Código', 'Code', 945, 186, align='right', col=ACCENT, alpha=a, size=30)
    g.line(0, 240, 1000, 240, col=RULE, alpha=a)
    g.label('AFIRMACIÓN Y EVIDENCIA', 'CLAIM AND EVIDENCE', 0, 280, col=MUTED, size=26, alpha=b)
    g.rect(25, 337, 650, 65, fill=TINT, alpha=b)
    g.label('«Dentro de la política»', '“Within policy”', 40, 350, size=40, alpha=b, col=ACCENT)
    g.line(45, 400, 653, 400, col=ACCENT, lw=3, alpha=b)
    g.label('Juez LLM', 'LLM judge', 945, 424, align='right', col=ACCENT, alpha=b, size=30)
    g.line(0, 480, 1000, 480, col=RULE, alpha=b)
    g.label('AMBIGÜEDAD O RIESGO', 'AMBIGUITY OR RISK', 0, 525, col=MUTED, size=26, alpha=c)
    g.circle(58, 606, 28, stroke=GOLD, lw=3, alpha=c)
    g.text('?', 58, 582, size=43, align='center', col=GOLD, alpha=c)
    g.label('Adjudicación humana', 'Human adjudication', 120, 585, size=40, alpha=c, col=GOLD)
def rubric(g):
    a, b, c = g.p
    g.heading('Afirmación vinculada a una regla', 'A claim linked to a rule')
    g.label('AFIRMACIÓN', 'CLAIM', 0, 55, col=MUTED, size=26, alpha=a)
    g.label('«Se puede devolver»', '“This can be returned”', 20, 110, size=48, col=INK, alpha=a)
    g.line(20, 175, 740, 175, col=INK, lw=2, alpha=a)
    g.label('POLÍTICA DEL EJEMPLO', 'EXAMPLE POLICY', 0, 245, col=MUTED, size=26, alpha=b)
    g.rect(20, 306, 880, 88, fill=TINT, alpha=b)
    g.label('Plazo Y producto elegible Y permiso', 'Deadline AND eligible item AND permission', 40, 326, width=850, size=35, col=ACCENT, alpha=b)
    g.arrow([(750, 165), (920, 165), (920, 350)], b)
    g.label('JUZGAR POR SEPARADO', 'JUDGE INDEPENDENTLY', 0, 475, col=MUTED, size=26, alpha=c)
    g.circle(220, 565, 42, fill=TINT, stroke=ACCENT, alpha=c)
    g.text('A', 220, 539, size=53, align='center', col=ACCENT, alpha=c)
    g.circle(780, 565, 42, fill=WHITE, stroke=MUTED, alpha=c)
    g.text('B', 780, 539, size=53, align='center', col=INK, alpha=c)
    g.label('Antes de adjudicar el desacuerdo', 'Before adjudicating disagreement', 500, 648, size=30, align='center', col=MUTED, alpha=c, width=970)
def agreement(g):
    a, b, c = g.p
    g.heading('20 casos · dos clases · ejemplo', '20 cases · two classes · example')
    g.label('JUEZ: SÍ', 'JUDGE: YES', 455, 52, align='center', size=27, alpha=a)
    g.label('JUEZ: NO', 'JUDGE: NO', 745, 52, align='center', size=27, alpha=a)
    g.label('HUMANO\nSÍ', 'HUMAN\nYES', 50, 180, size=30, alpha=a)
    g.label('HUMANO\nNO', 'HUMAN\nNO', 50, 355, size=30, alpha=a)
    kcase = 0
    for r, row in enumerate([[9, 1], [3, 7]]):
        for k, n in enumerate(row):
            x = 315 + k * 290
            y = 110 + r * 190
            diag = r == k
            g.rect(x, y, 275, 175, fill=TINT if diag else WHITE, stroke=ACCENT if diag else RULE, lw=2, alpha=a)
            for j in range(n):
                tx = x + 90 + j % 3 * 30
                ty = y + 115 + j // 3 * 17
                sx = 320 + kcase % 10 * 58
                sy = 115 + kcase // 10 * 65
                xx = sx + (tx - sx) * a
                yy = sy + (ty - sy) * a
                g.circle(xx, yy, 7, fill=ACCENT if diag else MUTED, alpha=min(1, a * 5))
                kcase += 1
            g.text(str(n), x + 137.5, y + 21, size=65, col=ACCENT if diag else INK, bold=True, align='center', alpha=ease((a - 0.7) / 0.3))
            if diag:
                g.rect(x + 4, y + 4, 267, 167, stroke=ACCENT, lw=4, alpha=b)
    g.text('(9 + 7) / 20 = 80%', 500, 537, size=49, col=ACCENT, align='center', bold=True, alpha=b)
    g.label('Acuerdo observado, no validez demostrada', 'Observed agreement, not proven validity', 500, 620, align='center', size=30, col=GOLD, alpha=c, width=980)
def position(g):
    a, b, c = g.p
    g.heading('La identidad de la respuesta no cambia', 'The answer identity does not change')
    left = 70
    right = 570
    travel = ease((b - 0.2) / 0.6)
    lift = 90 * ease(b / 0.18) * (1 - ease((b - 0.82) / 0.18))
    x1 = left + (right - left) * travel
    x2 = right - (right - left) * travel
    for x, num in [(247.5, '1'), (747.5, '2')]:
        g.line(x, 355, x, 448, col=RULE, alpha=a, lw=2)
        g.circle(x, 479, 25, fill=WHITE, stroke=RULE, alpha=a)
        g.text(num, x, 460, size=33, align='center', col=MUTED, alpha=a)
    g.arrow([(247, 135), (247, 82), (748, 82), (748, 135)], b, col=ACCENT)
    g.arrow([(748, 374), (748, 423), (247, 423), (247, 374)], b, col=MUTED)
    g.box(x1, 185 - lift, 355, 145, 'A\nMismo contenido', 'A\nSame content', 'active', a, size=39)
    g.box(x2, 185 + lift, 355, 145, 'B\nMismo contenido', 'B\nSame content', 'normal', a, size=39)
    g.label('Primera posición', 'First position', 247, 519, align='center', size=31, alpha=a)
    g.label('Segunda posición', 'Second position', 747, 519, align='center', size=31, alpha=a)
    g.badge('¿Sigue la preferencia a A o a la posición?', 'Does preference follow A or its position?', 602, 'unknown', c)
def variance(g):
    a, b, c = g.p
    g.heading('Un mismo caso, cinco juicios', 'One case, five judgments')
    g.document(395, 45, 210, 150, L(g.lang, 'Caso fijo', 'Fixed case'), state='active', alpha=a)
    outcomes = [True, True, False, True, False]
    for i, v in enumerate(outcomes):
        xx = 25 + i * 198
        pp = a if i == 0 else b
        g.arrow([(500, 195), (xx + 90, 292)], pp, col=RULE)
        g.box(xx, 310, 180, 118, 'SÍ' if v else 'NO', 'YES' if v else 'NO', 'pass' if v else 'unknown', pp, size=41)
        g.text(str(i + 1), xx + 90, 446, size=28, col=MUTED, align='center', alpha=pp)
    g.badge('Variación visible en un único ejemplo', 'Visible variation on one example', 550, 'unknown', c)
    g.label('No es una probabilidad calibrada', 'This is not a calibrated probability', 500, 650, align='center', size=27, col=MUTED, alpha=c)
def calibration(g):
    a, b, c = g.p
    g.heading('Ajustar a un lado, medir al otro', 'Tune on one side, measure on the other')
    g.line(510, 75, 510, 610, col=GOLD, lw=3, dash=[9, 8], alpha=a)
    g.label('DEV', 'DEV', 240, 70, size=42, col=ACCENT, align='center', alpha=a)
    g.label('SET SEPARADO', 'SEPARATE SET', 760, 70, size=34, col=MUTED, align='center', alpha=a)
    for k in range(3):
        g.document(60 + k * 140, 175, 118, 156, 'D' + str(k + 1), state='active', alpha=a)
        g.document(565 + k * 140, 175, 118, 156, 'H' + str(k + 1), alpha=b)
    g.arrow([(250, 360), (95, 360), (95, 490), (375, 490), (375, 356)], a)
    g.label('Ajustar rúbrica', 'Tune rubric', 230, 413, align='center', size=32, col=ACCENT, alpha=a)
    g.label('Medir sin ajustar', 'Measure without tuning', 760, 416, align='center', width=420, size=31, col=INK, alpha=b)
    g.arrow([(415, 345), (585, 345)], b)
    g.rect(470, 316, 80, 62, fill=BG, stroke=GOLD, alpha=b, lw=2)
    g.label('FIJO', 'FIXED', 510, 330, align='center', size=25, col=GOLD, alpha=b)
    g.badge('Autorizar el uso según riesgo y evidencia', 'Authorize use according to risk and evidence', 602, 'normal', c)
def states(g):
    a, b, c = g.p
    g.heading('Estado antes y después de una operación', 'State before and after an operation')
    g.label('SALDO PENDIENTE', 'PENDING BALANCE', 0, 55, size=28, col=MUTED, alpha=a)
    g.text('40 €' if g.lang == 'es' else '€40', 230, 120, size=108, col=INK, align='center', bold=True, alpha=a)
    g.arrow([(450, 175), (585, 175)], b)
    balance = '0' if c >= 0.5 else '?'
    g.text(f'{balance} €' if g.lang == 'es' else f'€{balance}', 795, 120, size=108, col=ACCENT, align='center', bold=True, alpha=b)
    g.label('Antes', 'Before', 230, 265, size=32, align='center', alpha=a)
    g.label('Después del commit' if c >= 0.5 else 'Pendiente de confirmar', 'After commit' if c >= 0.5 else 'Awaiting confirmation', 795, 265, size=32, align='center', alpha=b, width=405)
    g.label('LIBRO DE OPERACIONES', 'OPERATION LEDGER', 0, 385, col=MUTED, size=27, alpha=b)
    g.line(0, 438, 1000, 438, col=RULE, lw=2, alpha=b)
    g.text('R-104', 50, 475, size=41, alpha=c)
    g.label('Reembolso registrado', 'Refund recorded', 340, 482, size=33, col=ACCENT, alpha=c)
    g.text('40 €' if g.lang == 'es' else '€40', 960, 475, size=41, align='right', col=ACCENT, alpha=c)
    g.line(0, 550, 1000, 550, col=RULE, lw=2, alpha=c)
    g.label('Éxito verificable en el estado, no en el mensaje', 'Success verified in state, not in the message', 500, 620, align='center', size=30, width=975, col=ACCENT, alpha=c)
def policy(g):
    a, b, c = g.p
    g.heading('Dos dimensiones, no una media', 'Two dimensions, not one average')
    g.box(65, 100, 870, 135, 'Objetivo: reembolso completado', 'Goal: refund completed', 'pass', a, size=40)
    g.tick(870, 170, alpha=a)
    g.box(65, 305, 870, 135, 'Autorización: AUSENTE', 'Authorization: ABSENT', 'fail', b, size=40)
    g.cross(870, 375, alpha=b)
    g.arrow([(500, 440), (500, 520)], c, col=RED)
    g.badge('BLOQUEAR · política obligatoria violada', 'BLOCK · mandatory policy violated', 545, 'fail', c)
def timeout(g):
    a, b, c = g.p
    g.heading('La respuesta se pierde después del commit', 'The response is lost after the commit')
    g.label('AGENTE', 'AGENT', 205, 55, align='center', size=29, alpha=min(1, a * 4))
    g.label('BACKEND', 'BACKEND', 805, 55, align='center', size=29, alpha=min(1, a * 4))
    g.line(205, 112, 205, 560, col=RULE, lw=3, alpha=min(1, a * 4))
    g.line(805, 112, 805, 560, col=RULE, lw=3, alpha=min(1, a * 4))
    g.text('write R-104', 500, 118, align='center', size=34, alpha=min(1, a * 4))
    g.arrow([(217, 169), (793, 169)], a)
    if 0 < a < 1:
        g.circle(217 + 576 * a, 169, 13, fill=ACCENT)
    committed = ease((a - 0.83) / 0.17)
    g.circle(805, 290, 19, fill=SUCCESS, alpha=committed)
    g.label('Confirmado', 'Committed', 775, 330, align='right', col=SUCCESS, alpha=committed, size=36)
    g.arrow([(790, 290), (458, 290)], b, col=GOLD)
    if 0 < b < 1:
        g.circle(790 - 332 * b, 290, 12, fill=GOLD)
    g.cross(445, 290, alpha=ease((b - 0.8) / 0.2), col=GOLD)
    g.label('Respuesta perdida', 'Response lost', 470, 395, align='center', width=470, col=GOLD, alpha=ease((b - 0.8) / 0.2), size=34)
    g.box(35, 515, 340, 100, '¿Resultado?', 'Result unknown', 'unknown', c, size=38)
    g.box(625, 515, 340, 100, '1 write', '1 write', 'pass', c, size=46)
