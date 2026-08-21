(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.S5AgentReliabilityCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULTS = Object.freeze({
    tasks: 200,
    firstPassSuccesses: 148,
    retryingTasks: 42,
    retryRecoveredTasks: 24,
    totalRetryAttempts: 58,
    expectedToolDecisions: 520,
    correctToolDecisions: 487,
    wrongToolDecisions: 18,
    totalAgentSteps: 1360,
    unnecessarySteps: 170,
    timeoutTasks: 9,
    policyViolationTasks: 3,
    monthlyTasks: 100000,
    minFinalSuccessPercent: 85,
    minFirstPassPercent: 70,
    minToolDecisionPercent: 95,
    maxTimeoutPercent: 5,
    maxPolicyViolationPercent: 1,
    maxUnnecessaryStepPercent: 15
  });

  function finite(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max, fallback = min) {
    return Math.min(max, Math.max(min, finite(value, fallback)));
  }

  function int(value, min, max, fallback = min) {
    return Math.round(clamp(value, min, max, fallback));
  }

  function ratio(successes, total) {
    return total > 0 ? successes / total : 0;
  }

  function wilson(successes, total, z = 1.959963984540054) {
    const n = Math.max(0, Math.round(finite(total, 0)));
    const k = int(successes, 0, n, 0);
    if (n === 0) return { low: 0, high: 0, center: 0 };
    const p = k / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
    return { low: Math.max(0, center - margin), high: Math.min(1, center + margin), center };
  }

  function normalize(raw = {}) {
    const tasks = int(raw.tasks, 0, 10000000, DEFAULTS.tasks);
    const firstPassSuccesses = int(raw.firstPassSuccesses, 0, tasks, Math.min(DEFAULTS.firstPassSuccesses, tasks));
    const maxRetrying = Math.max(0, tasks - firstPassSuccesses);
    const retryingTasks = int(raw.retryingTasks, 0, maxRetrying, Math.min(DEFAULTS.retryingTasks, maxRetrying));
    const retryRecoveredTasks = int(raw.retryRecoveredTasks, 0, retryingTasks, Math.min(DEFAULTS.retryRecoveredTasks, retryingTasks));
    const totalRetryAttempts = int(raw.totalRetryAttempts, retryingTasks, 100000000, Math.max(DEFAULTS.totalRetryAttempts, retryingTasks));

    const expectedToolDecisions = int(raw.expectedToolDecisions, 0, 100000000, DEFAULTS.expectedToolDecisions);
    const correctToolDecisions = int(raw.correctToolDecisions, 0, expectedToolDecisions, Math.min(DEFAULTS.correctToolDecisions, expectedToolDecisions));
    const remainingToolDecisions = Math.max(0, expectedToolDecisions - correctToolDecisions);
    const wrongToolDecisions = int(raw.wrongToolDecisions, 0, remainingToolDecisions, Math.min(DEFAULTS.wrongToolDecisions, remainingToolDecisions));

    const totalAgentSteps = int(raw.totalAgentSteps, 0, 1000000000, DEFAULTS.totalAgentSteps);
    const unnecessarySteps = int(raw.unnecessarySteps, 0, totalAgentSteps, Math.min(DEFAULTS.unnecessarySteps, totalAgentSteps));

    return {
      tasks,
      firstPassSuccesses,
      retryingTasks,
      retryRecoveredTasks,
      totalRetryAttempts,
      expectedToolDecisions,
      correctToolDecisions,
      wrongToolDecisions,
      totalAgentSteps,
      unnecessarySteps,
      timeoutTasks: int(raw.timeoutTasks, 0, tasks, Math.min(DEFAULTS.timeoutTasks, tasks)),
      policyViolationTasks: int(raw.policyViolationTasks, 0, tasks, Math.min(DEFAULTS.policyViolationTasks, tasks)),
      monthlyTasks: int(raw.monthlyTasks, 0, 1000000000, DEFAULTS.monthlyTasks),
      minFinalSuccessPercent: clamp(raw.minFinalSuccessPercent, 0, 100, DEFAULTS.minFinalSuccessPercent),
      minFirstPassPercent: clamp(raw.minFirstPassPercent, 0, 100, DEFAULTS.minFirstPassPercent),
      minToolDecisionPercent: clamp(raw.minToolDecisionPercent, 0, 100, DEFAULTS.minToolDecisionPercent),
      maxTimeoutPercent: clamp(raw.maxTimeoutPercent, 0, 100, DEFAULTS.maxTimeoutPercent),
      maxPolicyViolationPercent: clamp(raw.maxPolicyViolationPercent, 0, 100, DEFAULTS.maxPolicyViolationPercent),
      maxUnnecessaryStepPercent: clamp(raw.maxUnnecessaryStepPercent, 0, 100, DEFAULTS.maxUnnecessaryStepPercent)
    };
  }

  function gate(key, value, threshold, direction) {
    const pass = direction === 'min' ? value >= threshold : value <= threshold;
    return { key, value, threshold, direction, pass };
  }

  function evaluate(raw = {}) {
    const input = normalize(raw);
    const finalSuccesses = Math.min(input.tasks, input.firstPassSuccesses + input.retryRecoveredTasks);
    const finalFailures = Math.max(0, input.tasks - finalSuccesses);
    const missedToolDecisions = Math.max(0, input.expectedToolDecisions - input.correctToolDecisions - input.wrongToolDecisions);

    const metrics = {
      finalSuccessRate: ratio(finalSuccesses, input.tasks),
      firstPassSuccessRate: ratio(input.firstPassSuccesses, input.tasks),
      retryRecoveryRate: ratio(input.retryRecoveredTasks, input.retryingTasks),
      toolDecisionAccuracy: ratio(input.correctToolDecisions, input.expectedToolDecisions),
      wrongToolDecisionRate: ratio(input.wrongToolDecisions, input.expectedToolDecisions),
      missedToolDecisionRate: ratio(missedToolDecisions, input.expectedToolDecisions),
      timeoutRate: ratio(input.timeoutTasks, input.tasks),
      policyViolationRate: ratio(input.policyViolationTasks, input.tasks),
      unnecessaryStepRate: ratio(input.unnecessarySteps, input.totalAgentSteps),
      meanStepsPerTask: ratio(input.totalAgentSteps, input.tasks),
      retryAttemptsPerTask: ratio(input.totalRetryAttempts, input.tasks),
      attemptMultiplier: input.tasks > 0 ? (input.tasks + input.totalRetryAttempts) / input.tasks : 0
    };

    const intervals = {
      finalSuccess: wilson(finalSuccesses, input.tasks),
      firstPassSuccess: wilson(input.firstPassSuccesses, input.tasks),
      toolDecisionAccuracy: wilson(input.correctToolDecisions, input.expectedToolDecisions),
      timeoutRate: wilson(input.timeoutTasks, input.tasks),
      policyViolationRate: wilson(input.policyViolationTasks, input.tasks)
    };

    const gates = [
      gate('finalSuccess', metrics.finalSuccessRate, input.minFinalSuccessPercent / 100, 'min'),
      gate('firstPass', metrics.firstPassSuccessRate, input.minFirstPassPercent / 100, 'min'),
      gate('toolDecision', metrics.toolDecisionAccuracy, input.minToolDecisionPercent / 100, 'min'),
      gate('timeouts', metrics.timeoutRate, input.maxTimeoutPercent / 100, 'max'),
      gate('policyViolations', metrics.policyViolationRate, input.maxPolicyViolationPercent / 100, 'max'),
      gate('unnecessarySteps', metrics.unnecessaryStepRate, input.maxUnnecessaryStepPercent / 100, 'max')
    ];

    const monthlyFailurePoint = input.monthlyTasks * (1 - metrics.finalSuccessRate);
    const monthlyFailureLow = input.monthlyTasks * (1 - intervals.finalSuccess.high);
    const monthlyFailureHigh = input.monthlyTasks * (1 - intervals.finalSuccess.low);

    return {
      input,
      counts: {
        finalSuccesses,
        finalFailures,
        missedToolDecisions
      },
      metrics,
      intervals,
      gates,
      gateSummary: {
        passed: gates.filter((item) => item.pass).length,
        total: gates.length,
        allPass: gates.every((item) => item.pass)
      },
      projection: {
        monthlyTasks: input.monthlyTasks,
        expectedFinalFailures: monthlyFailurePoint,
        failureLow95: monthlyFailureLow,
        failureHigh95: monthlyFailureHigh,
        expectedTimeoutTasks: input.monthlyTasks * metrics.timeoutRate,
        expectedPolicyViolationTasks: input.monthlyTasks * metrics.policyViolationRate
      }
    };
  }

  return { DEFAULTS, finite, clamp, int, ratio, wilson, normalize, gate, evaluate };
});
