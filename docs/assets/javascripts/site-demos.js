(function () {
  let cleanupSigma = null;
  let document$Bound = false;

  function initSigma() {
    if (cleanupSigma) cleanupSigma();
    cleanupSigma = null;

    let sigmaObserver = null;

    function erf(x) {
      const sign = x < 0 ? -1 : 1;
      x = Math.abs(x);
      const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
      const p = 0.3275911;
      const t = 1.0 / (1.0 + p * x);
      const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
      return sign * y;
    }

    function normalCDF(x) {
      return 0.5 * (1 + erf(x / Math.SQRT2));
    }

    function twoSidedTailP(sigma) {
      return 2 * (1 - normalCDF(sigma));
    }

    function fmt(n) {
      return n.toLocaleString('es-ES');
    }

    function oneInStr(p) {
      if (!isFinite(p) || p <= 0) return '1 entre \u221E';
      const n = 1 / p;
      if (n >= 1e12) return `1 entre ${fmt(Math.round(n / 1e12))} billones`;
      if (n >= 1e9) return `1 entre ${fmtFixed(n / 1e9, 2)} mil millones`;
      if (n >= 1e6) return `1 entre ${fmtFixed(n / 1e6, 2)} millones`;
      if (n >= 1e3) return `1 entre ${fmtFixed(n / 1e3, 2)} mil`;
      return `1 entre ${fmtFixed(n, 1)}`;
    }

    function fmtFixed(x, digits) {
      return x.toFixed(digits).replace('.', ',');
    }

    function coinAllSameP(n) {
      if (!isFinite(n) || n <= 0) return 0;
      return Math.pow(2, -n);
    }

    function coinStreakN(p) {
      if (p <= 0) return Infinity;
      return Math.ceil(1 + Math.log2(1 / p));
    }

    const curveEl = document.getElementById('sigma-curve');
    const tailLEl = document.getElementById('sigma-tailL');
    const tailREl = document.getElementById('sigma-tailR');
    const mLEl = document.getElementById('sigma-mL');
    const mREl = document.getElementById('sigma-mR');
    const sigmaTag = document.getElementById('sigma-tag');

    const sigmaInput = document.getElementById('sigma');
    const sigmaRead = document.getElementById('sigma-read');

    const coinEquivOneInEl = document.getElementById('sigma-coin-one-in');
    const coinEquivNEl = document.getElementById('sigma-coin-n');

    if (!curveEl || !sigmaInput) return;

    const X0 = 60, Y0 = 40, W = 800, H = 240;
    const xMin = -6, xMax = 6;
    const yMax = 0.42;

    function xMap(z) {
      return X0 + ((z - xMin) / (xMax - xMin)) * W;
    }
    function yMap(pdf) {
      return (Y0 + H) - (pdf / yMax) * H;
    }

    function normalPDF(z) {
      return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    }

    function buildCurvePath() {
      const step = 0.05;
      let d = "";
      let first = true;
      for (let z = xMin; z <= xMax + 1e-9; z += step) {
        const x = xMap(z);
        const y = yMap(normalPDF(z));
        d += (first ? `M ${x} ${y}` : ` L ${x} ${y}`);
        first = false;
      }
      return d;
    }

    function buildTailPath(side, sigma) {
      const step = 0.05;
      const baseY = Y0 + H;

      let zStart, zEnd;
      if (side === "L") {
        zStart = xMin;
        zEnd = -sigma;
      } else {
        zStart = sigma;
        zEnd = xMax;
      }

      zStart = Math.max(xMin, Math.min(xMax, zStart));
      zEnd = Math.max(xMin, Math.min(xMax, zEnd));

      if ((side === "L" && zEnd <= xMin) || (side === "R" && zStart >= xMax)) {
        return "";
      }

      let points = [];
      for (let z = zStart; z <= zEnd + 1e-9; z += step) {
        points.push([xMap(z), yMap(normalPDF(z))]);
      }

      let d = `M ${points[0][0]} ${baseY}`;
      for (const [x, y] of points) {
        d += ` L ${x} ${y}`;
      }
      d += ` L ${points[points.length - 1][0]} ${baseY} Z`;
      return d;
    }

    curveEl.setAttribute("d", buildCurvePath());

    function update(s) {
      const sigma = Math.max(1, Math.min(5, s));
      sigmaRead.textContent = sigma.toFixed(1);
      sigmaTag.textContent = `|Z| \u2265 ${sigma.toFixed(1)}\u03c3 (dos colas)`;

      const xL = xMap(-sigma);
      const xR = xMap(+sigma);
      mLEl.setAttribute("x1", xL); mLEl.setAttribute("x2", xL);
      mREl.setAttribute("x1", xR); mREl.setAttribute("x2", xR);

      tailLEl.setAttribute("d", buildTailPath("L", sigma));
      tailREl.setAttribute("d", buildTailPath("R", sigma));

      const p = twoSidedTailP(sigma);
      const nEquiv = coinStreakN(p);
      const pCoin = coinAllSameP(nEquiv);

      coinEquivOneInEl.textContent = oneInStr(pCoin);
      coinEquivNEl.innerHTML = `\u2248 <span class=\"mono\">${nEquiv}</span> lanzamientos seguidos solo caras/cruces.`;
    }

    const onInput = (e) => update(parseFloat(e.target.value));
    sigmaInput.removeEventListener("input", onInput);
    sigmaInput.addEventListener("input", onInput);

    let animFrame = null;
    function animateToFive() {
      const start = 1.5, end = 5.0, dur = 1600;
      const t0 = performance.now();
      function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
      function frame(now) {
        if (!document.body.contains(sigmaInput)) return;

        const t = Math.min(1, (now - t0) / dur);
        const s = start + (end - start) * easeOutCubic(t);
        sigmaInput.value = s.toFixed(1);
        update(s);
        if (t < 1) animFrame = requestAnimationFrame(frame);
      }
      animFrame = requestAnimationFrame(frame);
    }

    function runSelfTests() {
      if (Math.abs(coinAllSameP(1) - 0.5) >= 1e-12) console.warn('Test failed: coinAllSameP(1)');
    }

    runSelfTests();
    update(parseFloat(sigmaInput.value));

    let hasAnimated = false;
    function startAnimation() {
      if (hasAnimated) return;
      hasAnimated = true;
      console.info('[sigma] animación iniciada.');
      animateToFive();
    }

    startAnimation();

    cleanupSigma = () => {
      sigmaInput.removeEventListener("input", onInput);
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = null;
      if (sigmaObserver) sigmaObserver.disconnect();
      sigmaObserver = null;
    };
  }

  function initAll() {
    initSigma();
  }

  function bindDocument$() {
    if (document$Bound) return true;
    if (typeof document$ === 'undefined' || !document$.subscribe) return false;

    document$.subscribe(() => initAll());

    // Listen for color palette changes (native Material for MkDocs)
    if (typeof palette$ !== 'undefined' && palette$.subscribe) {
      palette$.subscribe(function () {
        // Redraw/Re-init demos that need theme-specific updates
        requestAnimationFrame(() => initAll());
      });
    }

    document$Bound = true;
    return true;
  }

  function onReady() {
    initAll();
    if (bindDocument$()) return;

    let attempts = 0;
    const maxAttempts = 20;
    const retryMs = 150;
    const timer = setInterval(() => {
      attempts += 1;
      if (bindDocument$()) {
        clearInterval(timer);
        console.info('[site-demos] document$ enlazado en reintento.', { attempts });
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(timer);
        console.info('[site-demos] document$ no disponible; demos sin navegación instantánea.');
      }
    }, retryMs);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady, { once: true });
  } else {
    onReady();
  }

  window.copyEmail = function () {
    const emailEl = document.getElementById("email-text");
    if (!emailEl) return;
    navigator.clipboard.writeText("fran@5sigmas.com").then(() => {
      const originalText = emailEl.innerText;
      emailEl.innerText = "Copiado!";
      setTimeout(() => {
        emailEl.innerText = originalText;
      }, 2000);
    });
  };
})();
