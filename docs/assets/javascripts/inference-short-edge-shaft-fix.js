(() => {
  'use strict';

  const GRAPH_SELECTOR = '[data-inference-mobile-graph]';
  const EDGE_SELECTOR = '[data-mobile-graph-edge][data-mobile-graph-short-edge="true"][data-mobile-graph-routed-short-edge="true"]';
  const ROUTE_VERSION = 'orthogonal-shaft-v1';
  const DETOUR = 4.5;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const parsePoints = (value) => String(value || '').trim().split(/\s+/).map((point) => point.split(',').map(Number)).filter((point) => point.length === 2 && point.every(Number.isFinite));
  const serialize = (points) => points.map(([x, y]) => `${x},${y}`).join(' ');

  const orthogonalRoute = (points) => {
    if (points.length < 2) return points;
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    if (Math.hypot(dx, dy) < 0.001) return points;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const midpointY = (start[1] + end[1]) / 2;
      const sign = midpointY < 50 ? 1 : -1;
      const detourY = clamp(midpointY + sign * DETOUR, 3, 97);
      return [start, [start[0], detourY], [end[0], detourY], end];
    }
    const midpointX = (start[0] + end[0]) / 2;
    const sign = midpointX < 50 ? 1 : -1;
    const detourX = clamp(midpointX + sign * DETOUR, 3, 97);
    return [start, [detourX, start[1]], [detourX, end[1]], end];
  };

  const routeEdge = (edge) => {
    const points = parsePoints(edge.getAttribute('points'));
    const routed = orthogonalRoute(points);
    if (routed.length < 4) return;
    edge.setAttribute('points', serialize(routed));
    edge.dataset.mobileGraphShortEdgeRoute = ROUTE_VERSION;
  };

  const routeGraph = (graph) => graph.querySelectorAll(EDGE_SELECTOR).forEach(routeEdge);

  const bindGraph = (graph) => {
    if (graph.dataset.mobileGraphShaftFixBound === 'true') {
      routeGraph(graph);
      return;
    }
    graph.dataset.mobileGraphShaftFixBound = 'true';
    routeGraph(graph);
    const svg = graph.querySelector('svg');
    if (!svg) return;
    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.type === 'childList')) requestAnimationFrame(() => routeGraph(graph));
    });
    observer.observe(svg, { childList: true, subtree: true });
    graph._s5InferenceShaftObserver = observer;
  };

  const init = () => document.querySelectorAll(GRAPH_SELECTOR).forEach(bindGraph);
  const pageObserver = new MutationObserver(() => requestAnimationFrame(init));
  pageObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
