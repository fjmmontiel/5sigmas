const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = value => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export const SEGURIDAD_SYNC_PROFILE = Object.freeze({
  version: 'seguridad-semantic-sync-v1',
  orientationLeadSeconds: 0.55,
  textRevealSeconds: 0.35,
  readingHoldEndSeconds: 4.0,
  motionStartSeconds: 4.0,
  finalObservationHoldSeconds: 1.5
});

function resolvedMotionEnd(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('seguridad timeline: positive finite duration required');
  }
  const end = durationSeconds - SEGURIDAD_SYNC_PROFILE.finalObservationHoldSeconds;
  if (end <= SEGURIDAD_SYNC_PROFILE.motionStartSeconds) {
    throw new Error(`seguridad timeline: duration ${durationSeconds} leaves no semantic motion window`);
  }
  return end;
}

export function seguridadSemanticTimeline(conceptId, durationSeconds) {
  if (typeof conceptId !== 'string' || !conceptId) throw new Error('seguridad timeline: concept id required');
  const motionEndSeconds = resolvedMotionEnd(durationSeconds);
  return Object.freeze({
    version: SEGURIDAD_SYNC_PROFILE.version,
    sentence_id: `${conceptId}.sentence-01`,
    concept_id: conceptId,
    visual_target_id: `${conceptId}.mechanism`,
    action: 'read_then_explain',
    orientation_lead_start_seconds: 0,
    text_start_seconds: SEGURIDAD_SYNC_PROFILE.orientationLeadSeconds,
    text_reveal_end_seconds: SEGURIDAD_SYNC_PROFILE.orientationLeadSeconds + SEGURIDAD_SYNC_PROFILE.textRevealSeconds,
    reading_hold_end_seconds: SEGURIDAD_SYNC_PROFILE.readingHoldEndSeconds,
    visual_start_seconds: SEGURIDAD_SYNC_PROFILE.motionStartSeconds,
    visual_end_seconds: motionEndSeconds,
    final_hold_start_seconds: motionEndSeconds,
    end_seconds: durationSeconds
  });
}

export function seguridadMechanismSeconds(localSeconds, durationSeconds, { reducedMotion = false } = {}) {
  const timeline = seguridadSemanticTimeline('timing', durationSeconds);
  if (reducedMotion) return durationSeconds;
  const local = clamp(localSeconds, 0, durationSeconds);
  if (local <= timeline.visual_start_seconds) return 0;
  if (local >= timeline.visual_end_seconds) return durationSeconds;
  const q = (local - timeline.visual_start_seconds) / (timeline.visual_end_seconds - timeline.visual_start_seconds);
  return q * durationSeconds;
}

export function seguridadTextState(text, conceptId, localSeconds, durationSeconds, { reducedMotion = false } = {}) {
  if (typeof text !== 'string' || !text.length) throw new Error('seguridad timeline: scene text required');
  const timeline = seguridadSemanticTimeline(conceptId, durationSeconds);
  const local = reducedMotion ? durationSeconds : clamp(localSeconds, 0, durationSeconds);
  const visible = reducedMotion || local >= timeline.text_start_seconds;
  const alpha = reducedMotion ? 1 : ease((local - timeline.text_start_seconds) / SEGURIDAD_SYNC_PROFILE.textRevealSeconds);
  const emphasisIn = ease((local - timeline.text_start_seconds) / 0.24);
  const emphasisOut = ease((local - timeline.reading_hold_end_seconds) / 0.28);
  const emphasis = reducedMotion ? 0 : emphasisIn * (1 - emphasisOut);
  return Object.freeze({
    activeId: local >= timeline.text_start_seconds && local < timeline.reading_hold_end_seconds ? timeline.sentence_id : null,
    focus: conceptId,
    timeline,
    cues: Object.freeze([Object.freeze({
      id: timeline.sentence_id,
      sentence_id: timeline.sentence_id,
      concept_id: conceptId,
      visual_target_id: timeline.visual_target_id,
      action: timeline.action,
      paragraph: 0,
      range: Object.freeze({ start: 0, end: text.length }),
      visible,
      alpha,
      emphasis,
      status: local < timeline.text_start_seconds ? 'future' : local < timeline.reading_hold_end_seconds ? 'active' : 'read'
    })])
  });
}
