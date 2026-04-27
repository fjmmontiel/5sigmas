import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const INCLUDE_SERIES = args.includes("--include-series");
const ONLY = args.find((arg) => arg.startsWith("--only="))?.split("=")[1] || "";
const SCREENSHOT_DIR = args.find((arg) => arg.startsWith("--screenshots="))?.split("=")[1] || "";
const JSON_OUT = args.find((arg) => arg.startsWith("--json-out="))?.split("=")[1] || "";
const SAFE_GAP = Number(args.find((arg) => arg.startsWith("--safe-gap="))?.split("=")[1] || "72");
const EXPLICIT_FILES = (args.find((arg) => arg.startsWith("--file="))?.split("=")[1] || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

function discoverHtmlFiles() {
  if (EXPLICIT_FILES.length) {
    return EXPLICIT_FILES.map((file) => path.resolve(file)).sort();
  }
  return fs.readdirSync(__dirname)
    .filter((file) => /^article_.*__.*\.html$/.test(file) || (INCLUDE_SERIES && /^series_.*\.html$/.test(file)))
    .filter((file) => !file.endsWith(".source.html"))
    .filter((file) => !ONLY || file.includes(ONLY))
    .sort();
}

function round(value) {
  return Number(value.toFixed(2));
}

function shouldFlag(item) {
  const lowCoverage =
    item.beatType === "content"
    && item.metrics.svgTextCount <= 2
    && item.metrics.svgContentCoverageRatio !== null
    && item.metrics.svgContentCoverageRatio < 0.08;
  return item.metrics.safeZoneIntrusionPx > 0
    || item.metrics.safeZoneSvgIntrusionPx > 0
    || item.metrics.decoOverlap.totalPx2 > 0
    || item.metrics.svgOverlap.totalPx2 > 0
    || item.metrics.occlusion.totalDecoTopSamples > 0
    || item.metrics.offFrame.totalPx > 0
    || item.metrics.nearEdgeCount > 0
    || (item.metrics.minSvgTextPx !== null && item.metrics.minSvgTextPx < 8)
    || item.metrics.svgTextCount > 6
    || lowCoverage
    || item.metrics.snippetVisibleWords > 34
    || (item.metrics.snippetMinTextPx !== null && item.metrics.snippetMinTextPx < 10.5)
    || (item.metrics.snippetAspectRatio !== null && (item.metrics.snippetAspectRatio < 0.56 || item.metrics.snippetAspectRatio > 2.2));
}

async function main() {
  const files = discoverHtmlFiles();
  if (!files.length) {
    console.error("No matching HTML files found.");
    process.exit(1);
  }

  if (SCREENSHOT_DIR) {
    fs.mkdirSync(path.resolve(SCREENSHOT_DIR), { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const results = [];

  for (const file of files) {
    await page.goto(`file://${path.resolve(__dirname, file)}`);
    const beats = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".beat[data-type='content'], .beat[data-type='opening'], .beat[data-type='cta']"))
        .map((el) => ({ id: el.dataset.id || "unknown", type: el.dataset.type || "unknown" }));
    });

    for (const beat of beats) {
      const item = await page.evaluate(({ id, safeGap }) => {
        const target = document.querySelector(`.beat[data-id="${id}"]`);
        if (!target) return null;

        const round = (value) => Number(value.toFixed(2));

        document.querySelectorAll(".beat").forEach((el) => {
          el.classList.remove("active");
          el.style.display = "none";
        });
        target.classList.add("active");
        target.style.display = "flex";

        const beatType = target.dataset.type || "unknown";
        const frame = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };

        const selectorsByType = {
          opening: [
            ["seriesTag", ".series-tag"],
            ["mainTitle", ".main-title"],
            ["subtitle", ".subtitle"],
            ["dateRange", ".date-range"],
            ["footer", ".footer"],
          ],
          content: [
            ["epoch", ".epoch"],
            ["headline", ".headline"],
            ["body", ".body"],
            ["footer", ".footer"],
          ],
          cta: [
            ["ctaHeadline", ".cta-headline"],
            ["ctaBody", ".cta-body"],
            ["ctaUrl", ".cta-url"],
            ["footer", ".footer"],
          ],
        };

        const rectOf = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          if (!r.width && !r.height) return null;
          return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        };

        const area = (rect) => rect ? Math.max(0, rect.width) * Math.max(0, rect.height) : 0;
        const intersect = (a, b) => {
          if (!a || !b) return null;
          const left = Math.max(a.left, b.left);
          const top = Math.max(a.top, b.top);
          const right = Math.min(a.right, b.right);
          const bottom = Math.min(a.bottom, b.bottom);
          if (right <= left || bottom <= top) return null;
          return { left, top, right, bottom, width: right - left, height: bottom - top };
        };

        const union = (rects) => {
          const filtered = rects.filter(Boolean);
          if (!filtered.length) return null;
          const left = Math.min(...filtered.map((rect) => rect.left));
          const top = Math.min(...filtered.map((rect) => rect.top));
          const right = Math.max(...filtered.map((rect) => rect.right));
          const bottom = Math.max(...filtered.map((rect) => rect.bottom));
          return { left, top, right, bottom, width: right - left, height: bottom - top };
        };

        const sampleOcclusion = (intersectionRect) => {
          if (!intersectionRect) return { total: 0, decoTop: 0, textTop: 0, otherTop: 0 };
          const xs = [0.18, 0.5, 0.82];
          const ys = [0.2, 0.5, 0.8];
          const points = [];
          for (const xRatio of xs) {
            for (const yRatio of ys) {
              points.push({
                x: intersectionRect.left + intersectionRect.width * xRatio,
                y: intersectionRect.top + intersectionRect.height * yRatio,
              });
            }
          }

          const result = { total: 0, decoTop: 0, textTop: 0, otherTop: 0 };
          for (const point of points) {
            const topEl = document.elementFromPoint(point.x, point.y);
            if (!topEl) continue;
            result.total += 1;
            if (topEl.closest(".deco")) {
              result.decoTop += 1;
            } else if (topEl.closest(".beat-inner") || topEl.closest(".footer")) {
              result.textTop += 1;
            } else {
              result.otherTop += 1;
            }
          }
          return result;
        };

        const textParts = Object.fromEntries(
          (selectorsByType[beatType] || selectorsByType.content)
            .map(([label, selector]) => [label, rectOf(target.querySelector(selector))])
            .filter(([, rect]) => rect),
        );

        const footerRect = textParts.footer || null;
        const safeTextRects = Object.entries(textParts)
          .filter(([label]) => label !== "footer")
          .map(([, rect]) => rect);
        const safeTextUnion = union(safeTextRects);

        const decoRect = rectOf(target.querySelector(".deco"));
        const decoComponent = target.querySelector(".deco-component");
        const svg = target.querySelector(".deco-svg");
        const svgNodes = svg
          ? Array.from(svg.querySelectorAll("text, path, rect, circle, ellipse, line, polyline, polygon"))
              .map((node) => {
                const rect = node.getBoundingClientRect();
                const computed = getComputedStyle(node);
                return {
                  tag: node.tagName.toLowerCase(),
                  text: (node.textContent || "").trim(),
                  className: node.getAttribute("class") || "",
                  rect: rect.width || rect.height ? {
                    left: rect.left,
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    width: rect.width,
                    height: rect.height,
                  } : null,
                  fontSize: parseFloat(computed.fontSize || "0") || null,
                  opacity: parseFloat(computed.opacity || "1"),
                };
              })
              .filter((item) => item.rect && item.opacity > 0.02)
          : [];

        const visibleSvgRects = svgNodes
          .map((item) => intersect(item.rect, decoRect))
          .filter(Boolean);
        const svgUnion = union(visibleSvgRects);
        const svgTextNodes = svgNodes.filter((item) => item.tag === "text" && item.text);
        const shellNodePattern = /\bdeco-panel-glow\b|\bdeco-panel\b|\bdeco-grid\b|\bdeco-frame\b/;
        const svgContentCoveragePx2 = decoRect
          ? svgNodes
              .filter((item) => !shellNodePattern.test(item.className || ""))
              .map((item) => ({
                rect: intersect(item.rect, decoRect),
                opacity: item.opacity,
              }))
              .filter((item) => item.rect)
              .reduce((sum, item) => sum + (area(item.rect) * Math.max(0.05, item.opacity || 0)), 0)
          : 0;
        const svgContentCoverageRatio = decoRect
          ? svgContentCoveragePx2 / Math.max(1, area(decoRect))
          : null;

        const perPart = {};
        let decoOverlapTotalPx2 = 0;
        let svgOverlapTotalPx2 = 0;
        let totalDecoTopSamples = 0;
        let totalTextTopSamples = 0;
        let totalOtherTopSamples = 0;
        for (const [label, rect] of Object.entries(textParts)) {
          const decoIntersection = intersect(decoRect, rect);
          const svgIntersection = intersect(svgUnion, rect);
          const occlusion = sampleOcclusion(decoIntersection);
          decoOverlapTotalPx2 += area(decoIntersection);
          svgOverlapTotalPx2 += area(svgIntersection);
          totalDecoTopSamples += occlusion.decoTop;
          totalTextTopSamples += occlusion.textTop;
          totalOtherTopSamples += occlusion.otherTop;
          perPart[label] = {
            decoPx2: round(area(decoIntersection)),
            svgPx2: round(area(svgIntersection)),
            decoRatio: rect ? round(area(decoIntersection) / Math.max(1, area(rect))) : 0,
            svgRatio: rect ? round(area(svgIntersection) / Math.max(1, area(rect))) : 0,
            decoTopSamples: occlusion.decoTop,
            textTopSamples: occlusion.textTop,
          };
        }

        const safeBoundaryRight = safeTextUnion ? safeTextUnion.right + safeGap : null;
        const safeZoneIntrusionPx = safeBoundaryRight && decoRect ? Math.max(0, safeBoundaryRight - decoRect.left) : 0;
        const safeZoneSvgIntrusionPx = safeBoundaryRight && svgUnion ? Math.max(0, safeBoundaryRight - svgUnion.left) : 0;

        const offFrameTarget = decoRect || svgUnion;
        const offFrame = offFrameTarget ? {
          left: Math.max(0, frame.left - offFrameTarget.left),
          top: Math.max(0, frame.top - offFrameTarget.top),
          right: Math.max(0, offFrameTarget.right - frame.right),
          bottom: Math.max(0, offFrameTarget.bottom - frame.bottom),
        } : { left: 0, top: 0, right: 0, bottom: 0 };

        const nearEdgeCount = svgTextNodes.filter((item) => {
          if (!decoRect) return false;
          const visibleRect = intersect(item.rect, decoRect);
          if (!visibleRect || area(visibleRect) < 24) return false;
          return visibleRect.left < decoRect.left + 6
            || visibleRect.top < decoRect.top + 6
            || visibleRect.right > decoRect.right - 6
            || visibleRect.bottom > decoRect.bottom - 6;
        }).length;

        return {
          beatType,
          decoRect,
          svgUnion,
          safeTextUnion,
          metrics: {
            safeGap,
            safeZoneIntrusionPx: round(safeZoneIntrusionPx),
            safeZoneSvgIntrusionPx: round(safeZoneSvgIntrusionPx),
            decoOverlap: {
              totalPx2: round(decoOverlapTotalPx2),
              byPart: perPart,
            },
            svgOverlap: {
              totalPx2: round(svgOverlapTotalPx2),
              byPart: perPart,
            },
            occlusion: {
              totalDecoTopSamples,
              totalTextTopSamples,
              totalOtherTopSamples,
            },
            offFrame: {
              ...offFrame,
              totalPx: round(offFrame.left + offFrame.top + offFrame.right + offFrame.bottom),
            },
            nearEdgeCount,
            minSvgTextPx: svgTextNodes.length ? round(Math.min(...svgTextNodes.map((item) => item.fontSize || 999))) : null,
            avgSvgTextPx: svgTextNodes.length ? round(svgTextNodes.reduce((sum, item) => sum + (item.fontSize || 0), 0) / svgTextNodes.length) : null,
            svgTextCount: svgTextNodes.length,
            svgContentCoveragePx2: round(svgContentCoveragePx2),
            svgContentCoverageRatio: svgContentCoverageRatio === null ? null : round(svgContentCoverageRatio),
            decoKind: decoComponent ? "snippet" : (svg ? "svg" : "unknown"),
            snippetVisibleWords: decoComponent ? Number(decoComponent.dataset.previewWordCount || "0") : 0,
            snippetTextNodeCount: decoComponent ? Number(decoComponent.dataset.previewTextCount || "0") : 0,
            snippetMinTextPx: decoComponent ? round(Number(decoComponent.dataset.previewMinFont || "0")) || null : null,
            snippetAspectRatio: decoComponent ? round(Number(decoComponent.dataset.previewAspect || "0")) || null : null,
          },
        };
      }, { id: beat.id, safeGap: SAFE_GAP });

      if (!item) continue;
      const result = { file, beatId: beat.id, beatType: item.beatType, metrics: item.metrics };
      results.push(result);

      if (SCREENSHOT_DIR && shouldFlag(result)) {
        const safeFile = `${file.replace(/\.html$/, "")}__${beat.id}.png`;
        await page.screenshot({ path: path.resolve(SCREENSHOT_DIR, safeFile) });
      }
    }
  }

  await browser.close();

  const flagged = results.filter(shouldFlag);
  const byFile = {};
  for (const item of flagged) {
    byFile[item.file] ||= [];
    byFile[item.file].push({
      beatId: item.beatId,
      beatType: item.beatType,
      metrics: item.metrics,
    });
  }

  const sortedByIntrusion = [...results]
    .sort((a, b) => (
      b.metrics.safeZoneIntrusionPx
      - a.metrics.safeZoneIntrusionPx
      || b.metrics.decoOverlap.totalPx2 - a.metrics.decoOverlap.totalPx2
    ))
    .slice(0, 10)
    .map((item) => ({
      file: item.file,
      beatId: item.beatId,
      beatType: item.beatType,
      safeZoneIntrusionPx: item.metrics.safeZoneIntrusionPx,
      decoOverlapPx2: item.metrics.decoOverlap.totalPx2,
      svgOverlapPx2: item.metrics.svgOverlap.totalPx2,
      decoTopSamples: item.metrics.occlusion.totalDecoTopSamples,
      minSvgTextPx: item.metrics.minSvgTextPx,
      nearEdgeCount: item.metrics.nearEdgeCount,
      svgTextCount: item.metrics.svgTextCount,
      snippetVisibleWords: item.metrics.snippetVisibleWords,
      snippetMinTextPx: item.metrics.snippetMinTextPx,
      svgContentCoverageRatio: item.metrics.svgContentCoverageRatio,
    }));

  const report = {
    totalBeats: results.length,
    flaggedBeats: flagged.length,
    safeGap: SAFE_GAP,
    insights: {
      categoryCounts: {
        safeZoneText: flagged.filter((item) => item.metrics.safeZoneIntrusionPx > 0).length,
        safeZoneSvg: flagged.filter((item) => item.metrics.safeZoneSvgIntrusionPx > 0).length,
        decoOverlap: flagged.filter((item) => item.metrics.decoOverlap.totalPx2 > 0).length,
        svgOverlap: flagged.filter((item) => item.metrics.svgOverlap.totalPx2 > 0).length,
        occlusion: flagged.filter((item) => item.metrics.occlusion.totalDecoTopSamples > 0).length,
        offFrame: flagged.filter((item) => item.metrics.offFrame.totalPx > 0).length,
        nearEdge: flagged.filter((item) => item.metrics.nearEdgeCount > 0).length,
        smallSvgText: flagged.filter((item) => item.metrics.minSvgTextPx !== null && item.metrics.minSvgTextPx < 8).length,
        denseSvgText: flagged.filter((item) => item.metrics.svgTextCount > 6).length,
        lowSvgCoverage: flagged.filter((item) => item.beatType === "content" && item.metrics.svgTextCount <= 2 && item.metrics.svgContentCoverageRatio !== null && item.metrics.svgContentCoverageRatio < 0.08).length,
        denseSnippetText: flagged.filter((item) => item.metrics.snippetVisibleWords > 34).length,
        smallSnippetText: flagged.filter((item) => item.metrics.snippetMinTextPx !== null && item.metrics.snippetMinTextPx < 10.5).length,
        awkwardSnippetAspect: flagged.filter((item) => item.metrics.snippetAspectRatio !== null && (item.metrics.snippetAspectRatio < 0.56 || item.metrics.snippetAspectRatio > 2.2)).length,
      },
      worstByIntrusion: sortedByIntrusion,
      filesWithFlags: Object.keys(byFile).length,
    },
    files: byFile,
  };

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(JSON_OUT), json, "utf8");
  }
  process.stdout.write(json);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
