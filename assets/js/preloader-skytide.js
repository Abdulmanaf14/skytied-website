/* =====================================================================
   SKYTIDE LOGISTICS — Premium Preloader (mounts instantly, self-dismisses)
   - Injects the splash overlay synchronously (load this as the first
     <script> inside <body>, no defer/async) so it paints before page content.
   - Plays the cinematic build, then dismisses once the window has loaded
     AND a minimum branding time has elapsed.
   - First visit in a session: full intro. Return visits: snappy.
   Vanilla — no jQuery dependency.
   ===================================================================== */
(function () {
  "use strict";

  /* Bail out for ancient browsers — just clear the preloading flag. */
  if (!document.body || !window.requestAnimationFrame) {
    document.documentElement.className =
      document.documentElement.className.replace(/\s?sky-preloading/g, "");
    return;
  }

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* First visit = full intro, return visits = quick splash. */
  var firstVisit = false;
  try {
    firstVisit = !sessionStorage.getItem("skySplashSeen");
    sessionStorage.setItem("skySplashSeen", "1");
  } catch (e) {}
  var MIN_SHOW = firstVisit ? 2000 : 4000;   /* minimum branding time (ms) */
  var HARD_MAX = 9000;                        /* never let it hang longer than this */

  /* ------------------------------------------------------------------
     Splash markup (styling lives in assets/css/preloader-skytide.css)
  ------------------------------------------------------------------ */
  var SPLASH_HTML =
    '<canvas class="layer map-canvas" id="skyMapCanvas"></canvas>' +

    '<div class="layer silhouettes">' +
      '<svg class="silo-ship" viewBox="0 0 520 150" fill="currentColor" aria-hidden="true">' +
        '<path d="M30 96 L490 96 L452 132 L72 132 Z"/>' +
        '<rect x="96" y="70" width="46" height="26"/><rect x="150" y="70" width="46" height="26"/>' +
        '<rect x="204" y="70" width="46" height="26"/><rect x="258" y="70" width="46" height="26"/>' +
        '<rect x="312" y="70" width="46" height="26"/><rect x="366" y="70" width="46" height="26"/>' +
        '<rect x="420" y="48" width="40" height="48"/><rect x="448" y="30" width="20" height="20"/>' +
      '</svg>' +
      '<svg class="silo-plane" viewBox="0 0 360 150" fill="currentColor" aria-hidden="true">' +
        '<path d="M20 78 C120 50 250 44 332 52 L350 70 L332 80 C250 86 120 92 20 92 Z"/>' +
        '<path d="M196 58 L214 18 L232 18 L224 60 Z"/>' +
        '<path d="M196 92 L214 132 L232 132 L224 90 Z"/>' +
        '<path d="M300 70 L344 40 L352 44 L332 74 Z"/>' +
      '</svg>' +
      '<svg class="silo-truck" viewBox="0 0 300 150" fill="currentColor" aria-hidden="true">' +
        '<rect x="20" y="50" width="160" height="64" rx="4"/>' +
        '<path d="M180 74 L232 74 L268 100 L268 114 L180 114 Z"/>' +
        '<circle cx="68" cy="120" r="16"/><circle cx="140" cy="120" r="16"/><circle cx="238" cy="120" r="16"/>' +
      '</svg>' +
      '<svg class="silo-warehouse" viewBox="0 0 280 180" fill="currentColor" aria-hidden="true">' +
        '<path d="M10 78 L140 18 L270 78 L270 90 L140 40 L10 90 Z"/>' +
        '<rect x="34" y="86" width="212" height="78"/>' +
        '<rect x="118" y="120" width="44" height="44"/>' +
        '<rect x="48" y="100" width="22" height="22"/><rect x="82" y="100" width="22" height="22"/>' +
        '<rect x="176" y="100" width="22" height="22"/><rect x="210" y="100" width="22" height="22"/>' +
      '</svg>' +
      '<svg class="silo-cranes" viewBox="0 0 360 180" fill="currentColor" aria-hidden="true">' +
        '<rect x="40" y="20" width="8" height="120"/><rect x="160" y="20" width="8" height="120"/>' +
        '<rect x="20" y="20" width="180" height="10"/>' +
        '<rect x="70" y="30" width="3" height="34"/><rect x="130" y="30" width="3" height="34"/>' +
        '<rect x="60" y="64" width="84" height="6"/><rect x="20" y="140" width="200" height="10"/>' +
        '<rect x="250" y="40" width="8" height="100"/><rect x="240" y="40" width="90" height="9"/>' +
        '<rect x="300" y="49" width="3" height="28"/><rect x="250" y="140" width="110" height="10"/>' +
      '</svg>' +
    '</div>' +

    '<canvas class="layer fx-canvas" id="skyFxCanvas"></canvas>' +
    '<div class="layer rays" aria-hidden="true"></div>' +
    '<div class="layer streaks" aria-hidden="true">' +
      '<span class="streak s1" style="left:-10%"></span>' +
      '<span class="streak s2" style="left:10%"></span>' +
      '<span class="streak s3" style="left:34%"></span>' +
    '</div>' +
    '<div class="layer vignette" aria-hidden="true"></div>' +

    '<div class="corner tl"><span class="live-dot"></span>Global Trade Network</div>' +
    '<div class="corner br">Skytide Logistics · FZE-LLC</div>' +

    '<main class="content">' +
      '<div class="logo-stage">' +
        '<div class="logo-glow" aria-hidden="true"></div>' +
        '<div class="logo-wrap">' +
          '<img class="logo" src="WHITE.png" alt="Skytide Logistics"' +
               ' onerror="this.onerror=null;this.src=\'assets/images/WHITE.png\';">' +
        '</div>' +
      '</div>' +
      '<div class="divider" aria-hidden="true"></div>' +
      '<p class="tagline">Moving Possibilities. <b>Beyond Boundaries</b></p>' +
      '<div class="loader-block" id="skyLoaderBlock">' +
        '<div class="prepare-row"><span class="prepare">Delivering Excellence</span><span class="pct" id="skyPct">0%</span></div>' +
        '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="skyBar">' +
          '<div class="bar-fill" id="skyBarFill"></div>' +
          '<div class="bar-dot" id="skyBarDot"></div>' +
        '</div>' +
        '<div class="loading-row"><span class="loading" id="skyLoading">Loading<span class="dots"></span></span></div>' +
      '</div>' +
    '</main>';

  /* Mount the splash. */
  var root = document.createElement("div");
  root.className = "sky-loader";
  root.id = "skyLoader";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = SPLASH_HTML;
  document.body.appendChild(root);

  /* The anti-flash navy background is only needed in the brief window before
     the splash mounts. The splash now covers the viewport, so release the
     <html> background lock — otherwise the body stays navy and bleeds through
     when the splash later fades out (visible colour flash on the real page). */
  var htmlEl = document.documentElement;
  htmlEl.className = htmlEl.className.replace(/\s?sky-preloading/g, "");

  /* Shortcuts. */
  var barFill = document.getElementById("skyBarFill");
  var barDot  = document.getElementById("skyBarDot");
  var pctEl   = document.getElementById("skyPct");
  var barEl   = document.getElementById("skyBar");
  var block   = document.getElementById("skyLoaderBlock");
  var loadTxt = document.getElementById("skyLoading");

  function setLoading(txt) { loadTxt.innerHTML = txt + '<span class="dots"></span>'; }
  function apply(p) {
    p = Math.max(0, Math.min(100, p));
    barFill.style.width = p + "%";
    barDot.style.left = p + "%";
    barDot.style.opacity = p < 1 ? "0" : "1";
    pctEl.textContent = Math.round(p) + "%";
    barEl.setAttribute("aria-valuenow", Math.round(p));
  }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ------------------------------------------------------------------
     Canvas: dotted world map + trade routes
  ------------------------------------------------------------------ */
  var mapCanvas = document.getElementById("skyMapCanvas");

  var CONTINENTS = [
    [0.20,0.26,0.060,0.050],[0.150,0.220,0.035,0.035],[0.170,0.310,0.045,0.050],
    [0.250,0.330,0.035,0.045],[0.270,0.400,0.025,0.035],
    [0.290,0.460,0.022,0.030],[0.300,0.550,0.035,0.050],[0.310,0.640,0.028,0.045],[0.330,0.720,0.018,0.030],
    [0.490,0.260,0.035,0.035],[0.520,0.230,0.025,0.025],[0.470,0.290,0.020,0.020],
    [0.520,0.400,0.040,0.045],[0.540,0.490,0.045,0.055],[0.560,0.570,0.030,0.040],
    [0.585,0.370,0.025,0.030],
    [0.630,0.300,0.050,0.050],[0.700,0.270,0.060,0.050],[0.760,0.330,0.045,0.050],[0.660,0.360,0.035,0.035],
    [0.685,0.430,0.025,0.030],[0.760,0.470,0.030,0.025],[0.790,0.510,0.020,0.020],
    [0.850,0.660,0.045,0.035],[0.900,0.700,0.015,0.015]
  ];
  function insideLand(nx, ny) {
    for (var i = 0; i < CONTINENTS.length; i++) {
      var c = CONTINENTS[i];
      var dx = (nx - c[0]) / c[2], dy = (ny - c[1]) / c[3];
      if (dx * dx + dy * dy <= 1) return true;
    }
    return false;
  }

  var HUBS = {
    dubai:[0.600,0.400], shanghai:[0.790,0.340], rotterdam:[0.500,0.260],
    newyork:[0.260,0.310], singapore:[0.775,0.510], saopaulo:[0.310,0.640],
    sydney:[0.875,0.680], mumbai:[0.685,0.430], losangeles:[0.160,0.340],
    london:[0.485,0.250], hongkong:[0.770,0.400], frankfurt:[0.510,0.270]
  };
  var ROUTES = [
    ["dubai","shanghai"],["dubai","rotterdam"],["dubai","newyork"],["dubai","singapore"],["dubai","mumbai"],
    ["shanghai","losangeles"],["shanghai","singapore"],["shanghai","hongkong"],
    ["rotterdam","newyork"],["rotterdam","frankfurt"],["newyork","losangeles"],["newyork","saopaulo"],
    ["singapore","sydney"],["singapore","hongkong"],["london","frankfurt"],["mumbai","singapore"],["hongkong","sydney"]
  ];

  function fitVW(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h };
  }

  var mapCtx, MW, MH, dotLayer = null, hubPx = [], routePx = [];

  function buildMap() {
    var f = fitVW(mapCanvas); mapCtx = f.ctx; MW = f.w; MH = f.h;

    var off = document.createElement("canvas");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    off.width = Math.max(1, Math.floor(MW * dpr));
    off.height = Math.max(1, Math.floor(MH * dpr));
    var o = off.getContext("2d");
    o.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.clearRect(0, 0, MW, MH);

    var cols = Math.round(MW / 11), rows = Math.round(MH / 13);
    var stepX = MW / cols, stepY = MH / rows;
    var cx = MW / 2, cy = MH * 0.42, maxD = Math.hypot(cx, cy);

    for (var r = 0; r < rows; r++) {
      var offx = (r % 2) ? stepX / 2 : 0;
      for (var c = 0; c < cols; c++) {
        var x = c * stepX + stepX / 2 + offx, y = r * stepY + stepY / 2;
        if (!insideLand(x / MW, y / MH)) continue;
        var d = Math.hypot(x - cx, y - cy) / maxD;
        var a = 0.10 + (1 - d) * 0.16;
        o.beginPath(); o.arc(x, y, 1.05, 0, Math.PI * 2);
        o.fillStyle = "rgba(96,160,228," + a.toFixed(3) + ")";
        o.fill();
      }
    }
    dotLayer = off;

    hubPx = [];
    for (var k in HUBS) hubPx.push([HUBS[k][0] * MW, HUBS[k][1] * MH]);

    routePx = [];
    for (var i = 0; i < ROUTES.length; i++) {
      var a = HUBS[ROUTES[i][0]], b = HUBS[ROUTES[i][1]];
      var ax = a[0] * MW, ay = a[1] * MH, bx = b[0] * MW, by = b[1] * MH;
      var mx = (ax + bx) / 2, my = (ay + by) / 2;
      var dist = Math.hypot(bx - ax, by - ay);
      var lift = Math.min(dist * 0.35, MH * 0.16);
      routePx.push({
        p0: [ax, ay], p1: [mx, my - lift], p2: [bx, by],
        speed: 0.00035 + (i % 5) * 0.00006, phase: (i * 0.31) % 1
      });
    }
  }

  function quad(p0, p1, p2, t) {
    var mt = 1 - t;
    return [mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
            mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]];
  }

  var mapT0 = null;
  function drawMap(ts) {
    if (!mapCtx) return;
    if (mapT0 === null) mapT0 = ts;
    var elapsed = ts - mapT0;
    var g = mapCtx;
    g.clearRect(0, 0, MW, MH);

    if (dotLayer) g.drawImage(dotLayer, 0, 0, dotLayer.width, dotLayer.height, 0, 0, MW, MH);

    g.lineWidth = 1;
    for (var i = 0; i < routePx.length; i++) {
      var rr = routePx[i];
      g.beginPath();
      g.moveTo(rr.p0[0], rr.p0[1]);
      g.quadraticCurveTo(rr.p1[0], rr.p1[1], rr.p2[0], rr.p2[1]);
      g.strokeStyle = "rgba(80,150,220,0.10)";
      g.stroke();
    }

    for (var j = 0; j < routePx.length; j++) {
      var r2 = routePx[j];
      var t = (elapsed * r2.speed + r2.phase) % 1;
      var pt = quad(r2.p0, r2.p1, r2.p2, t);
      var orange = (j % 3 === 0);
      var glow = g.createRadialGradient(pt[0], pt[1], 0, pt[0], pt[1], 7);
      glow.addColorStop(0, orange ? "rgba(255,190,90,1)" : "rgba(150,205,255,1)");
      glow.addColorStop(0.4, orange ? "rgba(245,160,0,0.5)" : "rgba(90,160,230,0.5)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = glow;
      g.beginPath(); g.arc(pt[0], pt[1], 7, 0, Math.PI * 2); g.fill();
    }

    var dxb = HUBS.dubai[0] * MW, dyb = HUBS.dubai[1] * MH;
    for (var m = 0; m < hubPx.length; m++) {
      var h = hubPx[m];
      var isHQ = (h[0] === dxb && h[1] === dyb);
      g.beginPath(); g.arc(h[0], h[1], isHQ ? 2.6 : 1.8, 0, Math.PI * 2);
      g.fillStyle = isHQ ? "rgba(255,200,110,0.95)" : "rgba(150,205,255,0.7)";
      g.fill();
    }
    var ring = (Math.sin(elapsed * 0.002) + 1) / 2;
    g.beginPath(); g.arc(dxb, dyb, 5 + ring * 9, 0, Math.PI * 2);
    g.strokeStyle = "rgba(255,200,110," + (0.35 * (1 - ring)).toFixed(3) + ")";
    g.lineWidth = 1.2; g.stroke();
  }

  /* ------------------------------------------------------------------
     Canvas: floating particles
  ------------------------------------------------------------------ */
  var fxCanvas = document.getElementById("skyFxCanvas");
  var fxCtx, FW, FH, particles = [];

  function buildFx() {
    var f = fitVW(fxCanvas); fxCtx = f.ctx; FW = f.w; FH = f.h;
    var count = Math.min(90, Math.floor((FW * FH) / 26000));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * FW, y: Math.random() * FH,
        r: Math.random() * 1.5 + 0.4,
        vy: -(Math.random() * 0.25 + 0.06),
        vx: (Math.random() - 0.5) * 0.12,
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2,
        ts: 0.01 + Math.random() * 0.02
      });
    }
  }

  function drawFx() {
    if (!fxCtx) return;
    fxCtx.clearRect(0, 0, FW, FH);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y += p.vy; p.x += p.vx; p.tw += p.ts;
      if (p.y < -6) { p.y = FH + 6; p.x = Math.random() * FW; }
      if (p.x < -6) p.x = FW + 6;
      if (p.x > FW + 6) p.x = -6;
      var tw = (Math.sin(p.tw) + 1) / 2;
      var a = p.a * (0.4 + tw * 0.6);
      fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fxCtx.fillStyle = "rgba(170,205,245," + a.toFixed(3) + ")";
      fxCtx.fill();
    }
  }

  /* ------------------------------------------------------------------
     Effects loop + resize
  ------------------------------------------------------------------ */
  var fxRaf = null;
  function effectsLoop(ts) {
    drawMap(ts);
    if (!REDUCED) drawFx();
    fxRaf = requestAnimationFrame(effectsLoop);
  }

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      buildMap(); buildFx();
      if (REDUCED) drawMap(performance.now());
    }, 180);
  });

  /* ------------------------------------------------------------------
     Dismiss logic
  ------------------------------------------------------------------ */
  var start = performance.now();
  var loaded = (document.readyState === "complete");
  var reachedEnd = false;
  var done = false;

  function onWinLoad() { loaded = true; }
  if (document.readyState === "complete") { loaded = true; }
  else { window.addEventListener("load", onWinLoad); }

  function finish() {
    if (done) return;
    done = true;
    apply(100);
    setLoading("Welcome Aboard");
    if (fxRaf) cancelAnimationFrame(fxRaf);
    window.removeEventListener("load", onWinLoad);
    /* fade out, then remove from DOM and release the <html> background lock */
    root.classList.add("is-leaving");
    setTimeout(function () {
      if (root.parentNode) root.parentNode.removeChild(root);
      var h = document.documentElement;
      h.className = h.className.replace(/\s?sky-preloading/g, "");
    }, 620);
  }

  /* Hard fallback so a stalled asset can never trap the user. */
  setTimeout(function () { loaded = true; }, HARD_MAX);

  function progressFrame(ts) {
    var el = ts - start;
    if (!reachedEnd) {
      var p = Math.min(1, el / MIN_SHOW);
      apply(easeInOutCubic(p) * 100);
      if (p >= 1) { reachedEnd = true; setLoading("Ready"); }
    }
    if (reachedEnd && loaded) { finish(); return; }
    requestAnimationFrame(progressFrame);
  }

  /* ------------------------------------------------------------------
     Boot
  ------------------------------------------------------------------ */
  apply(0);
  buildMap();
  buildFx();
  if (REDUCED) {
    drawMap(performance.now());                 /* one static frame */
    requestAnimationFrame(progressFrame);       /* still drives the dismiss timer */
  } else {
    fxRaf = requestAnimationFrame(effectsLoop);
    requestAnimationFrame(progressFrame);
  }
})();
