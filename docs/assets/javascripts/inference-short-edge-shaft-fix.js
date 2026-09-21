(() => {
  'use strict';

  // GOLDEN checkpoint: every native mobile edge overlay must cover the full graph before routing
  // is measured. The intrinsic SVG aspect ratio otherwise collapses the overlay to ~286–294px
  // while graph contracts intentionally range from 480–640px, hiding lower causal relationships.
  const GRAPH_SELECTOR = '[data-inference-mobile-graph]';
  const EDGE_SELECTOR = '[data-mobile-graph-edge][data-mobile-graph-short-edge="true"][data-mobile-graph-routed-short-edge="true"]';
  const ROUTE_VERSION = 'orthogonal-clearance-v2';
  const CLEARANCE = 2.0;
  const FALLBACK_DETOUR = 7.0;
  const COVERAGE_MARKER = 'all-full-height-v2';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const enforceGraphCoverage = (graph) => {
    const svg = graph.querySelector('svg');
    if (!svg) return;
    svg.style.height = '100%';
    svg.style.overflow = 'hidden';
    svg.dataset.mobileGraphCoverageFix = COVERAGE_MARKER;
  };

  const parsePoints = (value) => String(value || '').trim().split(/\s+/).map((point) => point.split(',').map(Number)).filter((point) => point.length === 2 && point.every(Number.isFinite));
  const serialize = (points) => points.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');

  const svgGeometry = (graph) => {
    const svg = graph.querySelector('svg');
    if (!svg) return null;
    const graphRect = graph.getBoundingClientRect();
    const viewBox = svg.viewBox?.baseVal;
    if (!graphRect.width || !graphRect.height || !viewBox?.width || !viewBox?.height) return null;
    const boxFor = (id) => {
      if (!id) return null;
      const node = graph.querySelector(`[data-mobile-graph-node="${CSS.escape(id)}"]`);
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const left = viewBox.x + ((rect.left - graphRect.left) / graphRect.width) * viewBox.width;
      const right = viewBox.x + ((rect.right - graphRect.left) / graphRect.width) * viewBox.width;
      const top = viewBox.y + ((rect.top - graphRect.top) / graphRect.height) * viewBox.height;
      const bottom = viewBox.y + ((rect.bottom - graphRect.top) / graphRect.height) * viewBox.height;
      return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
    };
    return { svg, viewBox, boxFor };
  };

  const fallbackRoute = (points, viewBox = { x: 0, y: 0, width: 100, height: 100 }) => {
    if (points.length < 2) return points;
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    if (Math.hypot(dx, dy) < 0.001) return points;
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const midpointY = (start[1] + end[1]) / 2;
      const sign = midpointY < centerY ? 1 : -1;
      const detourY = clamp(midpointY + sign * FALLBACK_DETOUR, viewBox.y + 2, viewBox.y + viewBox.height - 2);
      return [start, [start[0], detourY], [end[0], detourY], end];
    }
    const midpointX = (start[0] + end[0]) / 2;
    const sign = midpointX < centerX ? 1 : -1;
    const detourX = clamp(midpointX + sign * FALLBACK_DETOUR, viewBox.x + 2, viewBox.x + viewBox.width - 2);
    return [start, [detourX, start[1]], [detourX, end[1]], end];
  };

  const clearanceRoute = (source, target, viewBox) => {
    const dx = target.cx - source.cx;
    const dy = target.cy - source.cy;
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    const minX = viewBox.x + 2;
    const maxX = viewBox.x + viewBox.width - 2;
    const minY = viewBox.y + 2;
    const maxY = viewBox.y + viewBox.height - 2;

    if (Math.abs(dx) >= Math.abs(dy)) {
      const midpointY = (source.cy + target.cy) / 2;
      const preferBelow = midpointY < centerY;
      let corridorY = preferBelow
        ? Math.max(source.bottom, target.bottom) + CLEARANCE
        : Math.min(source.top, target.top) - CLEARANCE;
      const preferredFits = corridorY >= minY && corridorY <= maxY;
      if (!preferredFits) {
        corridorY = preferBelow
          ? Math.min(source.top, target.top) - CLEARANCE
          : Math.max(source.bottom, target.bottom) + CLEARANCE;
      }
      corridorY = clamp(corridorY, minY, maxY);
      const useBottom = corridorY > Math.max(source.cy, target.cy);
      const start = [source.cx, useBottom ? source.bottom : source.top];
      const end = [target.cx, useBottom ? target.bottom : target.top];
      return [start, [start[0], corridorY], [end[0], corridorY], end];
    }

    const midpointX = (source.cx + target.cx) / 2;
    const preferRight = midpointX < centerX;
    let corridorX = preferRight
      ? Math.max(source.right, target.right) + CLEARANCE
      : Math.min(source.left, target.left) - CLEARANCE;
    const preferredFits = corridorX >= minX && corridorX <= maxX;
    if (!preferredFits) {
      corridorX = preferRight
        ? Math.min(source.left, target.left) - CLEARANCE
        : Math.max(source.right, target.right) + CLEARANCE;
    }
    corridorX = clamp(corridorX, minX, maxX);
    const useRight = corridorX > Math.max(source.cx, target.cx);
    const start = [useRight ? source.right : source.left, source.cy];
    const end = [useRight ? target.right : target.left, target.cy];
    return [start, [corridorX, start[1]], [corridorX, end[1]], end];
  };

  const routeEdge = (graph, geometry, edge) => {
    const points = parsePoints(edge.getAttribute('points'));
    if (points.length < 2) return;
    const source = geometry?.boxFor(edge.dataset.mobileGraphFrom || '');
    const target = geometry?.boxFor(edge.dataset.mobileGraphTo || '');
    const routed = source && target
      ? clearanceRoute(source, target, geometry.viewBox)
      : fallbackRoute(points, geometry?.viewBox);
    if (routed.length < 4) return;
    edge.setAttribute('points', serialize(routed));
    edge.dataset.mobileGraphShortEdgeRoute = ROUTE_VERSION;
    edge.dataset.mobileGraphShaftClearance = source && target ? String(CLEARANCE) : 'fallback';
  };

  const routeGraph = (graph) => {
    enforceGraphCoverage(graph);
    const geometry = svgGeometry(graph);
    graph.querySelectorAll(EDGE_SELECTOR).forEach((edge) => routeEdge(graph, geometry, edge));
  };

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
