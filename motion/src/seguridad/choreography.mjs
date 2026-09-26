const clamp = value => Math.max(0, Math.min(1, Number(value) || 0));

export const SEGURIDAD_CHOREOGRAPHY_PROFILE_BY_NAME = Object.freeze({
  parallel_arrival_then_merge: 'parallel_then_merge',
  edge_by_edge_reveal: 'trace',
  attempt_then_stop_at_scope: 'gated',
  branch_highlight_by_chapter: 'branch',
  route_attempt_then_cut: 'cut',
  layer_addition_then_decision_shift: 'layers',
  ranking_then_selection: 'selection',
  transform_variants_then_pass_filter: 'filter',
  untrusted_read_then_structured_handoff: 'handoff',
  single_fail_then_parallel_exploration: 'exploration',
  iterate_then_project: 'fanout',
  budget_marker_progression: 'markers',
  advance_only_with_evidence: 'gated',
  bind_controls_around_attempt_path: 'constraints',
  write_retrieve_execute_revoke: 'cycle',
  place_items_then_highlight_mismatch: 'plot',
  materialize_derivatives_then_revoke_source: 'fanout_revoke',
  same_trigger_compare_different_storage: 'parallel_compare',
  attribute_validation_then_authority_result: 'projection',
  bind_constraints_then_reveal_path: 'constraints',
  lane_by_lane_measurement: 'lanes',
  optimize_score_then_audit_divergence: 'audit_loop',
  step_and_pin_evidence: 'trace_evidence',
  capture_then_normalize_then_lock: 'contract',
  read_then_validate_then_authorize: 'handoff',
  allocate_required_then_reject_excess: 'allocation',
  validate_trust_layer_by_layer: 'layers',
  runtime_cycle_then_external_revocation_exit: 'cycle',
  bind_evidence_then_resolve_hold: 'matrix'
});

export const SEGURIDAD_CHOREOGRAPHY_PROFILES = Object.freeze(
  [...new Set(Object.values(SEGURIDAD_CHOREOGRAPHY_PROFILE_BY_NAME))].sort()
);

export function seguridadChoreographyProfile(choreography) {
  const profile = SEGURIDAD_CHOREOGRAPHY_PROFILE_BY_NAME[choreography];
  if (!profile) throw new Error(`seguridad choreography: unsupported choreography ${choreography}`);
  return profile;
}

function phase(values, index) {
  if (!values.length) return 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

/**
 * Translate authored choreography into element-level progress.
 *
 * The semantic cue clock remains deterministic and shared across text/MP4 export;
 * this layer only decides which parts of a mechanism participate in each phase.
 * That prevents every topology from degenerating into the same index-by-index
 * reveal while preserving seek/replay determinism and reduced-motion resolution.
 */
export function seguridadElementProgress(plan, kind, index, total = 1) {
  const values = (plan?.cueProgress ?? []).map(item => clamp(item?.progress));
  if (!values.length || values.every(value => value >= 0.999)) return 1;
  const profile = seguridadChoreographyProfile(plan?.choreography);
  const last = values.length - 1;
  const n = Math.max(1, Number(total) || 1);

  switch (profile) {
    case 'parallel_then_merge':
      if (kind === 'node') return index < 2 ? phase(values, 0) : phase(values, Math.min(last, index - 1));
      if (kind === 'edge') return index < 2 ? phase(values, 0) : phase(values, last);
      return phase(values, Math.min(index, last));

    case 'trace':
    case 'gated':
      return phase(values, index);

    case 'branch':
      if (kind === 'node') {
        if (index === 0) return phase(values, 0);
        if (index === n - 1) return phase(values, last);
        return phase(values, Math.min(1, last));
      }
      if (kind === 'edge') return phase(values, index % 2 === 0 ? Math.min(1, last) : last);
      return phase(values, Math.min(1, last));

    case 'cut':
      if (kind === 'zone') return phase(values, Math.min(index + 1, last));
      return phase(values, 0);

    case 'layers':
      if (kind === 'zone') return phase(values, index);
      return phase(values, last);

    case 'selection':
      if (kind === 'zone') return phase(values, Math.min(1, last));
      if (kind === 'edge') return phase(values, last);
      return phase(values, index >= Math.max(1, n - 2) ? last : 0);

    case 'filter':
      if (kind === 'node') {
        if (index < Math.max(1, n - 2)) return phase(values, 0);
        if (index === n - 2) return phase(values, Math.min(1, last));
        return phase(values, last);
      }
      if (kind === 'edge') return phase(values, index < Math.max(1, n - 2) ? Math.min(1, last) : last);
      return phase(values, 0);

    case 'handoff':
      if (kind === 'zone') return phase(values, 0);
      if (kind === 'node') return phase(values, Math.min(1, last));
      if (kind === 'edge') return phase(values, Math.min(index + 1, last));
      return phase(values, last);

    case 'exploration':
      if (kind === 'node') return index === 0 ? phase(values, 0) : phase(values, Math.min(1, last));
      if (kind === 'zone') return phase(values, last);
      return phase(values, Math.min(1, last));

    case 'fanout':
      if (kind === 'node') {
        if (index === 0) return phase(values, 0);
        if (index === 1) return phase(values, Math.min(1, last));
        return phase(values, last);
      }
      if (kind === 'edge') return phase(values, index === 0 ? Math.min(1, last) : last);
      return phase(values, last);

    case 'markers':
      if (kind === 'node') return phase(values, index);
      return phase(values, 0);

    case 'constraints':
      if (kind === 'node') return index === 0 ? phase(values, last) : phase(values, Math.min(index - 1, last));
      if (kind === 'edge') return phase(values, Math.min(index, last));
      return phase(values, 0);

    case 'cycle':
      if ((kind === 'node' || kind === 'edge') && index === n - 1) return phase(values, last);
      return phase(values, index % values.length);

    case 'plot':
      if (kind === 'path' || kind === 'axis') return phase(values, 0);
      if (kind === 'node') return index === 0 ? phase(values, last) : phase(values, Math.min(1, last));
      return phase(values, Math.min(1, last));

    case 'fanout_revoke':
      if (kind === 'zone') return phase(values, last);
      if (kind === 'node') return index === 0 ? phase(values, 0) : phase(values, Math.min(1, last));
      return phase(values, Math.min(1, last));

    case 'parallel_compare':
      if (kind === 'zone') return phase(values, 0);
      return phase(values, last);

    case 'projection':
      if (kind === 'node') return index === n - 1 ? phase(values, last) : phase(values, Math.min(index, Math.max(0, last - 1)));
      if (kind === 'edge') return phase(values, last);
      return phase(values, 0);

    case 'lanes':
      if (kind === 'zone') return phase(values, index);
      return phase(values, last);

    case 'audit_loop':
      if (kind === 'node') return phase(values, Math.min(index, last));
      if (kind === 'edge') return phase(values, index < 2 ? Math.min(1, last) : last);
      return phase(values, 0);

    case 'trace_evidence': {
      if (kind === 'node') {
        const half = Math.max(1, Math.floor(n / 2));
        return phase(values, Math.min(index % half, last));
      }
      return phase(values, index);
    }

    case 'contract':
      if (kind === 'node') {
        if (index < Math.max(1, n - 2)) return phase(values, 0);
        if (index === n - 2) return phase(values, Math.min(1, last));
        return phase(values, last);
      }
      if (kind === 'edge') return phase(values, index === n - 2 ? last : Math.min(1, last));
      return phase(values, 0);

    case 'allocation':
      if (kind === 'zone') return phase(values, 0);
      if (kind === 'node') return phase(values, index);
      return phase(values, last);

    case 'matrix':
      if (kind === 'zone') {
        const columns = 3;
        return phase(values, Math.floor(index / columns));
      }
      return phase(values, last);

    default:
      throw new Error(`seguridad choreography: unimplemented profile ${profile}`);
  }
}
