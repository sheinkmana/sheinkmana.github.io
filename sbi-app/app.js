'use strict';

const $ = (id) => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';

const text = (tag, value, className) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value == null ? '' : String(value);
  return element;
};

const svgEl = (tag, attrs = {}, textContent = null) => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) el.setAttribute(k, String(v));
  }
  if (textContent !== null) el.textContent = String(textContent);
  return el;
};

async function jsonRequest(url, options = {}) {
  const staticFiles = { '/api/status': './status.json', '/api/bundle': './bundle.json', '/api/study': './study.json' };
  const response = await fetch(staticFiles[url] || url, { cache: 'no-store', ...options });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`The local server returned an unreadable response (${response.status}).`);
  }
  if (!response.ok && !payload.message && !payload.error) {
    throw new Error(`The local server returned an error (${response.status}).`);
  }
  return payload;
}

function setState(id, label, tone) {
  const el = $(id);
  if (!el) return;
  el.textContent = label;
  el.className = `state${tone ? ` ${tone}` : ''}`;
}

function pct(value) {
  return `${(100 * value).toFixed(1)}%`;
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not reported';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

let preparedStudy = null;
let preparedBundle = null;
let latestCheck = null;
let latestAudit = null;
let activeFamilyFilter = 'all';
let activeChartMetric = 'beta_cov';
let activeBundleFile = 'README.md';

function tierClass(tier) {
  if (tier === 'sbi_neural' || tier === 'real_sbi_neural') return 'exec-real';
  if (tier === 'sbi_hybrid' || tier === 'hybrid_sbi_neural') return 'exec-hybrid';
  if (tier === 'python_surrogate' || tier === 'shared_bank_surrogate') return 'exec-surrogate';
  if (tier === 'external_repos_not_run' || tier === 'not_run_static_audit') return 'exec-notrun';
  return 'exec-live';
}

function syncSeedOptions() {
  const methodEl = $('method-select');
  const seedSelect = $('seed-select');
  if (!methodEl || !seedSelect) return;
  const method = methodEl.value;
  const multiSeed = method === 'FMPE' || method === 'NPE_NSF';
  for (const opt of seedSelect.options) {
    if (opt.value !== '711') opt.disabled = !multiSeed;
  }
  if (!multiSeed && seedSelect.value !== '711') seedSelect.value = '711';
}

function syncGlobalScenarioUI(scenario) {
  const scenSelect = $('scenario-select');
  if (scenSelect && scenSelect.value !== scenario) {
    scenSelect.value = scenario;
  }
  document.querySelectorAll('[data-global-scenario]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.globalScenario === scenario);
  });
  const banner = $('global-scenario-banner');
  if (banner) {
    banner.replaceChildren();
    if (scenario === 'shifted') {
      banner.append(
        document.createTextNode('Currently viewing '),
        text('strong', 'Shifted (25% reporting)'),
        document.createTextNode(': observed case counts use a 25% reporting rate (ρ = 0.25) relative to the 50% simulator training bank, creating a scale-vs-shape summary conflict.'),
      );
    } else {
      banner.append(
        document.createTextNode('Currently viewing '),
        text('strong', 'Matched (50% reporting)'),
        document.createTextNode(': the simulator’s reporting rate (ρ = 0.50) matches the true data-generating process.'),
      );
    }
  }
}

function wrapScrollableChart(svg, label) {
  const wrap = document.createElement('div');
  wrap.className = 'chart-scroll-wrap';
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', label || svg.getAttribute('aria-label') || 'Chart');
  wrap.tabIndex = 0;
  wrap.append(svg);
  return wrap;
}

function evaluateBundleDiscrepancy(bundle) {
  const files = Array.isArray(bundle?.files) ? bundle.files : [];
  const readmeFile = files.find((f) => typeof f.path === 'string' && f.path.endsWith('README.md'));
  let captionPct = null;
  let readmeAlertLine = 7;
  if (readmeFile && Array.isArray(readmeFile.content)) {
    readmeFile.content.forEach((line, idx) => {
      const m = line.match(/assumes\s+(\d+(?:\.\d+)?)%\s+reporting/i);
      if (m) {
        captionPct = Number(m[1]);
        readmeAlertLine = idx + 1;
      }
    });
  }
  const rawFrac = bundle?.config?.reporting_fraction ?? bundle?.manifest?.reporting_fraction ?? null;
  const configPct = typeof rawFrac === 'number' && Number.isFinite(rawFrac) ? Math.round(rawFrac * 100) : null;

  if (captionPct == null || configPct == null) {
    return {
      hasDiscrepancy: false,
      captionPct,
      configPct,
      rawFrac,
      readmePath: readmeFile?.path || 'README.md',
      readmeAlertLine,
      summary: 'INCONCLUSIVE (BUNDLE METADATA)',
      tone: 'warning',
    };
  }
  const hasDiscrepancy = Math.abs(captionPct - configPct) > 0.1;
  return {
    hasDiscrepancy,
    captionPct,
    configPct,
    rawFrac,
    readmePath: readmeFile?.path || 'README.md',
    readmeAlertLine,
    summary: hasDiscrepancy
      ? `DISCREPANCY FLAGGED (${captionPct}% vs ${configPct}%)`
      : `CONSISTENT (${captionPct}% vs ${configPct}%)`,
    tone: hasDiscrepancy ? 'warning' : 'active',
  };
}

/* ============================================================================
   STAGE 4B: BUNDLE STATUS, INTERACTIVE FILE VIEWER & LIVE REPLAY HISTOGRAM
   ============================================================================ */
function renderBundleFileViewer(filePath) {
  const viewer = $('bundle-file-viewer');
  if (!viewer || !preparedBundle || !Array.isArray(preparedBundle.files)) return;
  const fileObj =
    preparedBundle.files.find((f) => f.path === filePath) ||
    (filePath === 'README.md' ? preparedBundle.files.find((f) => f.path.endsWith('README.md')) : null) ||
    preparedBundle.files[0];
  if (!fileObj || !Array.isArray(fileObj.content)) {
    viewer.hidden = true;
    return;
  }
  activeBundleFile = fileObj.path;
  document.querySelectorAll('#file-list .file-row').forEach((row) => {
    row.classList.toggle('active-file', row.dataset.path === activeBundleFile);
  });

  viewer.replaceChildren();
  viewer.hidden = false;

  const head = document.createElement('div');
  head.className = 'file-viewer-head';
  const left = document.createElement('div');
  left.append(
    text('strong', `Source Inspector · ${fileObj.path}`),
    text('span', ` (${fileObj.lines} lines)`, 'muted'),
  );
  const closeBtn = text('button', 'Hide source ×', 'metric-chip');
  closeBtn.type = 'button';
  closeBtn.addEventListener('click', () => {
    viewer.hidden = true;
  });
  head.append(left, closeBtn);
  viewer.append(head);

  const linesBox = document.createElement('div');
  linesBox.className = 'file-viewer-lines';
  const disc = evaluateBundleDiscrepancy(preparedBundle);
  const alertLineMap = disc.hasDiscrepancy
    ? {
        [disc.readmePath]: [disc.readmeAlertLine],
        'config.json': [7],
        'run_manifest.json': [10],
      }
    : {};
  const alerts = alertLineMap[fileObj.path] || [];

  fileObj.content.forEach((lineStr, idx) => {
    const lineNo = idx + 1;
    const row = document.createElement('div');
    const isAlert = alerts.includes(lineNo);
    row.className = `file-line${isAlert ? ' file-line-alert' : ''}`;
    row.append(
      text('span', String(lineNo), 'file-line-num'),
      text('span', lineStr, 'file-line-code'),
    );
    linesBox.append(row);
  });
  viewer.append(linesBox);
}

function drawReplayComparisonSvg(data) {
  if (!Array.isArray(data.baseline_samples) || !Array.isArray(data.replay_samples)) return null;
  const base = data.baseline_samples;
  const rep = data.replay_samples;
  const prior = Array.isArray(data.prior_range) ? data.prior_range : [0.1, 0.6];
  const minX = prior[0];
  const maxX = prior[1];
  const binsCount = 18;
  const binWidth = (maxX - minX) / binsCount;
  const baseBins = new Array(binsCount).fill(0);
  const repBins = new Array(binsCount).fill(0);
  for (const v of base) {
    const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((v - minX) / binWidth)));
    baseBins[idx] += 1;
  }
  for (const v of rep) {
    const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((v - minX) / binWidth)));
    repBins[idx] += 1;
  }
  const maxBin = Math.max(4, ...baseBins, ...repBins);

  const wrap = document.createElement('div');
  wrap.className = 'predict-grid-two';

  const card1 = document.createElement('div');
  card1.className = 'predict-card';
  card1.append(text('div', 'Posterior β Density: Saved Baseline vs Live Checkpoint Replay (128 draws)', 'calib-subhead'));
  const svg1 = svgEl('svg', { viewBox: '0 0 440 165', role: 'img', 'aria-label': 'Histogram comparing saved baseline posterior samples and replayed posterior samples' });
  const px = (val) => 38 + ((val - minX) / (maxX - minX)) * 380;
  const py = (cnt) => 136 - (cnt / maxBin) * 112;

  for (let i = 0; i < binsCount; i++) {
    const x0 = px(minX + i * binWidth);
    const w = Math.max(4, 380 / binsCount - 2);
    const bh = 136 - py(baseBins[i]);
    if (bh > 0) {
      svg1.append(svgEl('rect', { x: x0.toFixed(1), y: py(baseBins[i]).toFixed(1), width: w.toFixed(1), height: bh.toFixed(1), fill: 'rgba(30, 98, 72, 0.35)', stroke: '#1e6248', 'stroke-width': '1' }));
    }
    const rh = 136 - py(repBins[i]);
    if (rh > 0) {
      svg1.append(svgEl('rect', { x: (x0 + 2).toFixed(1), y: py(repBins[i]).toFixed(1), width: Math.max(2, w - 4).toFixed(1), height: rh.toFixed(1), fill: 'none', stroke: '#255b8a', 'stroke-width': '1.6', 'stroke-dasharray': '2 2' }));
    }
  }
  if (Number.isFinite(data.true_beta)) {
    const tx = px(data.true_beta);
    svg1.append(svgEl('line', { x1: tx, y1: 16, x2: tx, y2: 136, stroke: '#b84c27', 'stroke-width': '2', 'stroke-dasharray': '4 3' }));
    svg1.append(svgEl('text', { x: tx + 5, y: 26, fill: '#b84c27', 'font-size': '10', 'font-weight': '700' }, `True β = ${data.true_beta}`));
  }
  svg1.append(
    svgEl('line', { x1: 38, y1: 136, x2: 418, y2: 136, stroke: '#b8c7bb', 'stroke-width': '1' }),
    svgEl('text', { x: 38, y: 152, fill: '#4e6156', 'font-size': '10.5' }, `β = ${minX.toFixed(2)}`),
    svgEl('text', { x: 210, y: 152, fill: '#4e6156', 'font-size': '10.5', 'text-anchor': 'middle' }, 'Transmission rate β (day⁻¹)'),
    svgEl('text', { x: 418, y: 152, fill: '#4e6156', 'font-size': '10.5', 'text-anchor': 'end' }, `β = ${maxX.toFixed(2)}`),
  );
  card1.append(wrapScrollableChart(svg1, 'Posterior β density histogram'));
  wrap.append(card1);

  if (Array.isArray(data.observed_counts) && data.observed_counts.length > 1) {
    const card2 = document.createElement('div');
    card2.className = 'predict-card';
    card2.append(text('div', `Conditioning Observation (observed_cases.csv · ${data.observed_counts.length} days · ρ=0.50)`, 'calib-subhead'));
    const svg2 = svgEl('svg', { viewBox: '0 0 440 165', role: 'img', 'aria-label': 'Observed daily case counts in the 21-day bundle' });
    const counts = data.observed_counts;
    const maxC = Math.max(10, ...counts) * 1.1;
    const cx = (i) => 38 + (i / (counts.length - 1)) * 380;
    const cy = (v) => 136 - (v / maxC) * 112;
    const pts = counts.map((v, i) => `${cx(i).toFixed(1)},${cy(v).toFixed(1)}`).join(' ');
    svg2.append(svgEl('polyline', { points: pts, fill: 'none', stroke: '#1e6248', 'stroke-width': '2.4' }));
    counts.forEach((v, i) => {
      svg2.append(svgEl('circle', { cx: cx(i).toFixed(1), cy: cy(v).toFixed(1), r: '2.8', fill: '#1e6248' }));
    });
    svg2.append(
      svgEl('line', { x1: 38, y1: 136, x2: 418, y2: 136, stroke: '#b8c7bb', 'stroke-width': '1' }),
      svgEl('text', { x: 38, y: 152, fill: '#4e6156', 'font-size': '10.5' }, 'Day 0'),
      svgEl('text', { x: 228, y: 152, fill: '#4e6156', 'font-size': '10.5', 'text-anchor': 'middle' }, `Total reported: ${counts.reduce((a, b) => a + b, 0)} cases`),
      svgEl('text', { x: 418, y: 152, fill: '#4e6156', 'font-size': '10.5', 'text-anchor': 'end' }, `Day ${counts.length - 1}`),
    );
    card2.append(wrapScrollableChart(svg2, 'Conditioning observed cases chart'));
    wrap.append(card2);
  }
  return wrap;
}

function renderReplay(data) {
  const result = $('replay-result');
  result.replaceChildren();
  result.hidden = false;
  const outcome = ['match', 'mismatch', 'inconclusive'].includes(data.status) ? data.status : 'inconclusive';
  result.className = `replay-result${outcome === 'match' ? '' : ' warning'}`;
  const label = data.check_type ? `${displayValue(data.check_type).replaceAll('_', ' ')} · ` : '';
  result.append(text('strong', `${label}${outcome.toUpperCase()}`));
  if (data.details) result.append(text('div', displayValue(data.details)));
  if (data.message) result.append(text('div', data.message));
  const list = document.createElement('dl');
  [
    ['Seed', data.seed],
    ['Tolerance', data.tolerance],
    ['Max |Δ sample|', data.max_abs_diff != null ? data.max_abs_diff.toExponential(2) : null],
    ['Elapsed', data.duration_seconds == null ? null : `${data.duration_seconds} s`],
  ].forEach(([name, value]) => {
    if (value == null) return;
    list.append(text('dt', name), text('dd', displayValue(value)));
  });
  if (list.children.length) result.append(list);

  const chart = drawReplayComparisonSvg(data);
  if (chart) result.append(chart);

  if (data.limitations) {
    result.append(text('div', Array.isArray(data.limitations) ? data.limitations.join(' ') : displayValue(data.limitations), 'study-warnings'));
  }
  const inputReplay = /simulat|preprocess|input/i.test(String(data.check_type || ''));
  const checked = inputReplay ? 'INPUT CHECK' : 'REPLAY';
  setState(
    'repro-state',
    outcome === 'match' ? `${checked} MATCHED` : outcome === 'mismatch' ? `${checked} MISMATCHED` : 'INCONCLUSIVE',
    outcome === 'match' ? 'active' : 'warning',
  );
}

async function loadStatus() {
  try {
    const status = await jsonRequest('/api/status');
    const descriptions = {
      mismatch: 'The data and experiment are synthetic; a documentation inconsistency was intentionally introduced. The posterior and its baseline are prepared in advance.',
      altered: 'This synthetic test variant contains an intentionally altered documentation claim. The posterior and its baseline are prepared in advance.',
      consistent: 'This synthetic test variant uses documentation consistent with the recorded run. The posterior and its baseline are prepared in advance.',
    };
    if (Object.hasOwn(descriptions, status.variant)) {
      $('demo-description').textContent = descriptions[status.variant];
    }
    const el = $('connection');
    el.className = `system-status ${status.bundleReady ? 'ready' : 'offline'}`;
    el.replaceChildren(
      document.createElement('i'),
      document.createTextNode(status.bundleReady ? 'Prepared results ready' : 'Bundle not ready'),
    );
  } catch {
    const el = $('connection');
    el.className = 'system-status offline';
    el.replaceChildren(document.createElement('i'), document.createTextNode('Server unavailable'));
  }
}

async function loadBundle() {
  const list = $('file-list');
  try {
    const bundle = await jsonRequest('/api/bundle');
    preparedBundle = bundle;
    const disc = evaluateBundleDiscrepancy(bundle);
    setState('trace-state', disc.summary, disc.tone);

    const leadEl = $('bundle-discrepancy-lead');
    if (leadEl && disc.captionPct != null && disc.configPct != null) {
      leadEl.replaceChildren(
        document.createTextNode('Click any file in the bundle on the right to inspect its exact lines. '),
        text('code', disc.readmePath),
        document.createTextNode(` line ${disc.readmeAlertLine} claims `),
        text('strong', `${disc.captionPct}% reporting`),
        document.createTextNode(disc.hasDiscrepancy ? ' while ' : ' and '),
        text('code', 'config.json'),
        document.createTextNode(' line 7 / '),
        text('code', 'run_manifest.json'),
        document.createTextNode(' line 10 record '),
        text('strong', `${disc.rawFrac} (${disc.configPct}% reporting)`),
        document.createTextNode(disc.hasDiscrepancy ? ' — a documentation discrepancy.' : ' — consistent with the caption.'),
      );
    }
    const footEl = $('bundle-caption-foot');
    if (footEl && disc.captionPct != null && disc.configPct != null) {
      footEl.textContent = `Caption claims ${disc.captionPct}% reporting · Manifest records ${disc.configPct}% (${disc.rawFrac})`;
    }

    list.replaceChildren();
    const files = Array.isArray(bundle.files) ? bundle.files : [];
    if (!files.length) {
      list.append(text('div', bundle.message || 'No prepared evidence files found.', 'file-row muted'));
    }
    for (const file of files) {
      const row = document.createElement('div');
      row.className = `file-row${file.path === activeBundleFile ? ' active-file' : ''}`;
      row.dataset.path = file.path;
      row.tabIndex = 0;
      row.setAttribute('role', 'button');
      const hasDiscrepancy =
        disc.hasDiscrepancy && [disc.readmePath, 'config.json', 'run_manifest.json'].includes(file.path);
      row.append(text('span', `${file.path}${hasDiscrepancy ? ' ⚠' : ''}`));
      const count = Array.isArray(file.lines) ? file.lines.length : Number.isInteger(file.lines) ? file.lines : null;
      row.append(text('span', count == null ? 'SOURCE' : `${count} LINES`));
      const openFile = () => renderBundleFileViewer(file.path);
      row.addEventListener('click', openFile);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFile();
        }
      });
      list.append(row);
    }
    if (files.length) {
      renderBundleFileViewer(disc.readmePath);
    }
    if (bundle.figure) {
      const figure = $('posterior-figure');
      figure.onload = () => {
        figure.hidden = false;
        $('figure-placeholder').hidden = true;
      };
      figure.onerror = () => {
        figure.hidden = true;
        $('figure-placeholder').hidden = false;
      };
      figure.src = `${bundle.figure}${bundle.figure.includes('?') ? '&' : '?'}t=${Date.now()}`;
    }
  } catch (error) {
    setState('trace-state', 'BUNDLE UNAVAILABLE', 'warning');
    list.replaceChildren(text('div', error.message || 'Bundle unavailable.', 'file-row muted'));
  }
}

/* ============================================================================
   STAGE 1: SIR DYNAMICS, PRIOR PREDICTIVE FAN & SUMMARY SHIFT CHARTS
   ============================================================================ */
function drawSirExampleCharts(ex) {
  const wrap = document.createElement('div');
  wrap.className = 'sir-charts-grid';
  const ode = ex.deterministic_ode || ex.ode || {};
  const stoch = ex.stochastic || {};
  const repM = stoch.reported_matched_50 || ex.observed_matched_50pct || [];
  const repS = stoch.reported_shifted_25 || ex.observed_shifted_25pct || [];

  // Chart 1: Latent S(t), I(t), R(t) compartments (Stochastic solid vs ODE dashed)
  const col1 = document.createElement('div');
  col1.className = 'sir-chart-card';
  col1.append(
    text(
      'div',
      `Latent SIR Compartments S(t), I(t), R(t) · Outbreak #0 (β=${ex.beta.toFixed(3)}, γ=${ex.gamma.toFixed(3)}, R₀=${ex.r0.toFixed(2)})`,
      'calib-subhead',
    ),
  );
  const svg1 = svgEl('svg', {
    viewBox: '0 0 540 215',
    role: 'img',
    'aria-label': 'Susceptible, Infectious, and Recovered compartments comparing stochastic chain-binomial SIR and deterministic ODE SIR',
  });
  const maxN = ex.population || 500;
  const x1 = (i) => 42 + (i / 27) * 478;
  const y1 = (v) => 182 - (v / maxN) * 158;

  for (const gv of [0, 125, 250, 375, 500]) {
    svg1.append(svgEl('line', { x1: x1(0), y1: y1(gv), x2: x1(27), y2: y1(gv), stroke: '#e8eee7', 'stroke-width': '1' }));
  }

  if (Number.isFinite(ex.herd_immunity_threshold_s) && ex.herd_immunity_threshold_s < maxN) {
    const sy = y1(ex.herd_immunity_threshold_s);
    svg1.append(
      svgEl('line', { x1: x1(0), y1: sy, x2: x1(27), y2: sy, stroke: '#54477d', 'stroke-dasharray': '4 3', 'stroke-width': '1.4' }),
      svgEl(
        'text',
        { x: x1(27) - 4, y: sy - 5, 'text-anchor': 'end', fill: '#54477d', 'font-size': '10', 'font-weight': '700' },
        `Herd threshold S* = N/R₀ = ${ex.herd_immunity_threshold_s.toFixed(0)}`,
      ),
    );
  }

  const series1 = [
    [ode.S, '#255b8a', true],
    [ode.I, '#b84c27', true],
    [ode.R, '#1e6248', true],
    [stoch.S, '#255b8a', false],
    [stoch.I, '#b84c27', false],
    [stoch.R, '#1e6248', false],
  ];
  for (const [arr, color, dashed] of series1) {
    if (!Array.isArray(arr)) continue;
    svg1.append(
      svgEl('polyline', {
        points: arr.map((v, i) => `${x1(i).toFixed(1)},${y1(v).toFixed(1)}`).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': dashed ? '1.6' : '2.6',
        ...(dashed ? { 'stroke-dasharray': '5 3' } : {}),
      }),
    );
  }
  for (const [lbl, lx, ly] of [
    ['500', 8, 28],
    ['250', 8, 106],
    ['0', 18, 185],
    ['Day 1', 42, 202],
    ['Day 14', 270, 202],
    ['Day 28', 485, 202],
  ]) {
    svg1.append(svgEl('text', { x: lx, y: ly, fill: '#4e6156', 'font-size': '11', 'font-weight': '600' }, lbl));
  }
  col1.append(wrapScrollableChart(svg1, 'Latent SIR compartments S(t), I(t), R(t) over 28 days'));
  const leg1 = document.createElement('div');
  leg1.className = 'sir-legend';
  [
    ['S(t) Susceptible', '#255b8a'],
    ['I(t) Infectious', '#b84c27'],
    ['R(t) Recovered', '#1e6248'],
    ['Solid = Stochastic · Dashed = ODE', '#4e6156'],
  ].forEach(([lbl, col]) => {
    const sp = text('span', lbl);
    sp.style.setProperty('--swatch', col);
    leg1.append(sp);
  });
  col1.append(leg1);

  // Chart 2: Daily New Infections ΔI_t vs Reported Cases Y_t (50% matched vs 25% shifted)
  const col2 = document.createElement('div');
  col2.className = 'sir-chart-card';
  col2.append(
    text('div', 'Daily Latent Infections ΔI_t vs Reported Cases Y_t ~ Binomial(ΔI_t, ρ)', 'calib-subhead'),
  );
  const svg2 = svgEl('svg', {
    viewBox: '0 0 540 215',
    role: 'img',
    'aria-label': 'Daily latent new infections versus 50 percent matched and 25 percent shifted Binomial reported counts',
  });
  const allInc = [...(stoch.new_infections || []), ...(ode.new_infections || []), ...repM, ...repS];
  const maxInc = Math.max(10, ...allInc) * 1.12;
  const x2 = (i) => 42 + (i / 27) * 478;
  const y2 = (v) => 182 - (v / maxInc) * 158;

  for (const frac of [0, 0.5, 1]) {
    const gy = y2(maxInc * frac);
    svg2.append(svgEl('line', { x1: x2(0), y1: gy, x2: x2(27), y2: gy, stroke: '#e8eee7', 'stroke-width': '1' }));
  }

  const series2 = [
    [ode.new_infections, '#54477d', true],
    [stoch.new_infections, '#1b2a23', false],
    [repM, '#1e6248', false],
    [repS, '#b84c27', false],
  ];
  for (const [arr, color, dashed] of series2) {
    if (!Array.isArray(arr)) continue;
    svg2.append(
      svgEl('polyline', {
        points: arr.map((v, i) => `${x2(i).toFixed(1)},${y2(v).toFixed(1)}`).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': dashed ? '1.6' : '2.5',
        ...(dashed ? { 'stroke-dasharray': '4 3' } : {}),
      }),
    );
  }
  for (const [lbl, lx, ly] of [
    [String(Math.round(maxInc)), 10, 28],
    [String(Math.round(maxInc / 2)), 10, 106],
    ['0', 18, 185],
    ['Day 1', 42, 202],
    ['Day 14', 270, 202],
    ['Day 28', 485, 202],
  ]) {
    svg2.append(svgEl('text', { x: lx, y: ly, fill: '#4e6156', 'font-size': '11', 'font-weight': '600' }, lbl));
  }
  col2.append(wrapScrollableChart(svg2, 'Daily latent infections vs reported cases under 50% and 25% reporting'));
  const leg2 = document.createElement('div');
  leg2.className = 'sir-legend';
  [
    [`Latent ΔI_t (total ${(stoch.new_infections || []).reduce((a, b) => a + b, 0)})`, '#1b2a23'],
    ['ODE -ΔS(t) (dashed)', '#54477d'],
    [`Matched Y_t (ρ=50%, total ${repM.reduce((a, b) => a + b, 0)})`, '#1e6248'],
    [`Shifted Y_t (ρ=25%, total ${repS.reduce((a, b) => a + b, 0)})`, '#b84c27'],
  ].forEach(([lbl, col]) => {
    const sp = text('span', lbl);
    sp.style.setProperty('--swatch', col);
    leg2.append(sp);
  });
  col2.append(leg2);

  wrap.append(col1, col2);
  return wrap;
}

function renderSirModelGuide(report) {
  const box = $('sir-model-box');
  const litBox = $('sir-literature-box');
  const guide = report?.sir_model_guide;
  if (!box || !guide) return;
  box.replaceChildren();
  if (litBox) litBox.replaceChildren();

  box.append(text('p', guide.overview, 'sir-overview-lead'));

  if (Array.isArray(guide.compartments)) {
    const flow = document.createElement('div');
    flow.className = 'sir-compartment-flow';
    guide.compartments.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'sir-comp-card';
      const head = document.createElement('div');
      head.className = 'sir-comp-head';
      head.append(text('span', c.symbol, 'sir-symbol'), text('strong', c.name), text('small', c.initial));
      card.append(head, text('p', c.role));
      if (c.equation) card.append(text('code', c.equation, 'sir-eq-code'));
      flow.append(card);
      if (idx < guide.compartments.length - 1) {
        flow.append(text('span', idx === 2 ? '⇢' : '→', 'sir-flow-arrow'));
      }
    });
    box.append(flow);
  }

  if (Array.isArray(guide.parameters)) {
    const pGrid = document.createElement('div');
    pGrid.className = 'sir-param-grid';
    for (const p of guide.parameters) {
      const item = document.createElement('div');
      item.className = 'sir-param-card';
      item.append(
        text('strong', `${p.symbol} · ${p.name}`),
        text('span', `Prior / Range: ${p.prior}`, 'sir-param-prior'),
        text('p', p.meaning),
      );
      pGrid.append(item);
    }
    box.append(pGrid);
  }

  const ex = report?.prior_predictive?.sir_example_0;
  if (ex) {
    box.append(drawSirExampleCharts(ex));
  }

  const targetLit = litBox || box;
  const formulations = guide.formulations_in_papers || guide.paper_formulations;
  if (Array.isArray(formulations)) {
    targetLit.append(
      text('div', 'Three Canonical SIR Formulations Across the SBI Literature & How Each Is Used Here', 'calib-subhead sir-section-subhead'),
    );
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const tbl = document.createElement('table');
    tbl.className = 'results-table compact-table sir-wrap-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['SIR Variant', 'Papers Using It', 'State & Transition Equations', 'How Used in This Repository'].forEach((col) => {
      const th = text('th', col);
      th.scope = 'col';
      hrow.append(th);
    });
    thead.append(hrow);
    const tbody = document.createElement('tbody');
    for (const f of formulations) {
      const tr = document.createElement('tr');
      const tdEq = document.createElement('td');
      tdEq.append(text('code', f.equations || f.dynamics || '', 'sir-eq-code'));
      tr.append(
        text('th', f.name || f.title),
        text('td', f.papers),
        tdEq,
        text('td', f.how_used_here || f.where_in_repo || ''),
      );
      tbody.append(tr);
    }
    tbl.append(thead, tbody);
    wrap.append(tbl);
    targetLit.append(wrap);
  }

  if (Array.isArray(guide.summary_equations)) {
    targetLit.append(
      text('div', 'Six Epidemiological Summary Statistics f(Y) = [S₁, …, S₆] Computed from 28-Day Counts', 'calib-subhead sir-section-subhead'),
    );
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const tbl = document.createElement('table');
    tbl.className = 'results-table compact-table sir-wrap-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['Summary', 'Type under Under-Reporting', 'Exact Formula', 'Epidemiological Role'].forEach((col) => {
      const th = text('th', col);
      th.scope = 'col';
      hrow.append(th);
    });
    thead.append(hrow);
    const tbody = document.createElement('tbody');
    for (const s of guide.summary_equations) {
      const tr = document.createElement('tr');
      const isScale = s.type.toLowerCase().includes('scale-sensitive');
      const tdType = document.createElement('td');
      tdType.append(text('span', s.type, `kind-pill ${isScale ? 'kind-scale' : 'kind-shape'}`));
      const tdFormula = document.createElement('td');
      tdFormula.append(text('code', s.formula, 'sir-eq-code'));
      tr.append(text('th', s.name), tdType, tdFormula, text('td', s.epidemiological_meaning));
      tbody.append(tr);
    }
    tbl.append(thead, tbody);
    wrap.append(tbl);
    targetLit.append(wrap);
  }
}

function renderExecutionAudit(audit) {
  const box = $('execution-audit-box');
  if (!box || !audit || !Array.isArray(audit.tiers)) return;
  box.replaceChildren();
  box.append(text('p', audit.summary, 'sir-overview-lead'));
  const list = document.createElement('div');
  list.className = 'exec-tier-list';
  for (const tier of audit.tiers) {
    const card = document.createElement('div');
    card.className = 'exec-tier-card';
    const head = document.createElement('div');
    head.className = 'exec-tier-head';
    head.append(
      text('strong', tier.badge || tier.title),
      text('span', tier.was_run || tier.badge, `exec-pill ${tierClass(tier.tier_id)}`),
    );
    card.append(head);
    if (Array.isArray(tier.methods) && tier.methods.length) {
      const mRow = document.createElement('div');
      mRow.className = 'rnpe-pills';
      mRow.style.marginBottom = '6px';
      tier.methods.forEach((m) => mRow.append(text('span', m)));
      card.append(mRow);
    }
    card.append(text('p', tier.how_run || tier.description, 'exec-tier-desc'));
    list.append(card);
  }
  box.append(list);
}

function drawPriorPredictiveVisuals(pp) {
  const wrap = document.createElement('div');
  wrap.className = 'sir-charts-grid';
  const dq = pp.daily_quantiles_p05_p25_p50_p75_p95;

  // Left: Prior Predictive Daily Incidence Fan Chart
  if (Array.isArray(dq) && dq.length === 5) {
    const [p05, p25, p50, p75, p95] = dq;
    const mEx = pp.matched_example_0 || [];
    const sEx = pp.shifted_example_0 || [];
    const card1 = document.createElement('div');
    card1.className = 'sir-chart-card';
    card1.append(text('div', 'Prior Predictive Daily Cases Envelope (2,048 sims) vs Outbreak #0', 'calib-subhead'));
    const svg = svgEl('svg', {
      viewBox: '0 0 540 215',
      role: 'img',
      'aria-label': 'Prior predictive 90 percent and 50 percent fan chart compared with matched and shifted outbreak trajectories',
    });
    const maxV = Math.max(15, ...p95, ...mEx, ...sEx) * 1.08;
    const px = (i) => 40 + (i / 27) * 480;
    const py = (v) => 182 - (v / maxV) * 158;
    const polyPts = (hi, lo) =>
      `${hi.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')} ${lo
        .map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`)
        .reverse()
        .join(' ')}`;

    svg.append(
      svgEl('polygon', { points: polyPts(p95, p05), fill: '#dbece1' }),
      svgEl('polygon', { points: polyPts(p75, p25), fill: '#a9d3b8' }),
      svgEl('polyline', {
        points: p50.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' '),
        fill: 'none',
        stroke: '#2b5e46',
        'stroke-width': '1.8',
        'stroke-dasharray': '4 3',
      }),
    );
    if (mEx.length === 28) {
      svg.append(
        svgEl('polyline', {
          points: mEx.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' '),
          fill: 'none',
          stroke: '#1e6248',
          'stroke-width': '2.6',
        }),
      );
    }
    if (sEx.length === 28) {
      svg.append(
        svgEl('polyline', {
          points: sEx.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' '),
          fill: 'none',
          stroke: '#b84c27',
          'stroke-width': '2.6',
        }),
      );
    }
    for (const [lbl, lx, ly] of [
      [String(Math.round(maxV)), 8, 28],
      ['0', 18, 185],
      ['Day 1', 40, 202],
      ['Day 14', 270, 202],
      ['Day 28', 485, 202],
    ]) {
      svg.append(svgEl('text', { x: lx, y: ly, fill: '#4e6156', 'font-size': '11', 'font-weight': '600' }, lbl));
    }
    card1.append(wrapScrollableChart(svg, 'Prior predictive daily cases envelope vs Outbreak #0'));
    const leg = document.createElement('div');
    leg.className = 'sir-legend';
    [
      ['Prior 50% / 90% Fan', '#7ab896'],
      ['Matched #0 (ρ=50%)', '#1e6248'],
      ['Shifted #0 (ρ=25%)', '#b84c27'],
    ].forEach(([l, c]) => {
      const sp = text('span', l);
      sp.style.setProperty('--swatch', c);
      leg.append(sp);
    });
    card1.append(leg);
    wrap.append(card1);
  }

  // Right: Diverging Bar Chart of Standardized Shift Δz across the 6 Summaries
  if (Array.isArray(pp.summaries) && pp.summaries.length) {
    const card2 = document.createElement('div');
    card2.className = 'sir-chart-card';
    card2.append(text('div', 'Summary Shift Under 25% Reporting vs 50% Model (Δz in Prior SDs)', 'calib-subhead'));
    const svg = svgEl('svg', {
      viewBox: '0 0 540 215',
      role: 'img',
      'aria-label': 'Diverging horizontal bar chart of standardized summary shifts showing large negative shifts on scale-sensitive summaries',
    });
    const zeroX = 335;
    const scalePx = 155; // 1 SD = 155px
    svg.append(
      svgEl('line', { x1: zeroX, y1: 18, x2: zeroX, y2: 182, stroke: '#4e6156', 'stroke-width': '1.4' }),
      svgEl('line', { x1: zeroX - 0.5 * scalePx, y1: 18, x2: zeroX - 0.5 * scalePx, y2: 182, stroke: '#d6e0d5', 'stroke-dasharray': '3 3' }),
      svgEl('line', { x1: zeroX - 1.0 * scalePx, y1: 18, x2: zeroX - 1.0 * scalePx, y2: 182, stroke: '#b84c27', 'stroke-dasharray': '4 3' }),
    );
    pp.summaries.forEach((s, idx) => {
      const y = 26 + idx * 25;
      const isScale = ['attack_rate', 'peak_incidence', 'early_incidence'].includes(s.name);
      const dz = s.standardized_shift_sd;
      const barW = Math.abs(dz) * scalePx;
      const barX = dz < 0 ? zeroX - barW : zeroX;
      const fill = isScale ? '#b84c27' : '#1e6248';
      svg.append(
        svgEl('text', { x: 10, y: y + 12, fill: '#1b2a23', 'font-size': '11', 'font-weight': '600' }, s.label.replace(/ \(.*\)/, '')),
        svgEl('rect', { x: barX.toFixed(1), y, width: Math.max(3, barW).toFixed(1), height: 15, rx: 3, fill }),
        svgEl(
          'text',
          {
            x: dz < 0 ? (barX - 5).toFixed(1) : (barX + barW + 5).toFixed(1),
            y: y + 12,
            'text-anchor': dz < 0 ? 'end' : 'start',
            fill,
            'font-size': '10.5',
            'font-weight': '700',
          },
          `${dz >= 0 ? '+' : ''}${dz.toFixed(2)} SD`,
        ),
      );
    });
    svg.append(
      svgEl('text', { x: zeroX, y: 202, 'text-anchor': 'middle', fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' }, '0 SD (No shift)'),
      svgEl('text', { x: zeroX - scalePx, y: 202, 'text-anchor': 'middle', fill: '#b84c27', 'font-size': '10.5', 'font-weight': '700' }, '-1.0 SD (Severe downward shift)'),
    );
    card2.append(wrapScrollableChart(svg, 'Summary shift under 25% reporting in prior standard deviations'));
    const leg2 = document.createElement('div');
    leg2.className = 'sir-legend';
    [
      ['Scale-sensitive summary (halved by 25% reporting)', '#b84c27'],
      ['Timing / shape summary (invariant to reporting rate)', '#1e6248'],
    ].forEach(([l, c]) => {
      const sp = text('span', l);
      sp.style.setProperty('--swatch', c);
      leg2.append(sp);
    });
    card2.append(leg2);
    wrap.append(card2);
  }
  return wrap;
}

function renderPriorPredictive(pp) {
  const box = $('prior-predictive-box');
  if (!box || !pp) return;
  box.replaceChildren();
  const metrics = document.createElement('div');
  metrics.className = 'prior-metrics-bar';
  const mmd = pp.mmd_summary_space || {};
  const conflict = pp.scale_vs_shape_conflict_z || {};
  const maxConflictM = Array.isArray(conflict.matched_median_z) ? Math.max(...conflict.matched_median_z.map(Math.abs)) : 0;
  const maxConflictS = Array.isArray(conflict.shifted_median_z) ? Math.max(...conflict.shifted_median_z.map(Math.abs)) : 0;
  [
    `Summary MMD (Matched 50%): ${(mmd.matched_stat ?? 0).toFixed(4)} (p = ${(mmd.matched_p_value ?? 1).toFixed(2)} · compatible)`,
    `Summary MMD (Shifted 25%): ${(mmd.shifted_stat ?? 0).toFixed(4)} (p = ${(mmd.shifted_p_value ?? 0).toFixed(2)} · shift detected)`,
    `Scale-vs-Shape Conflict |z| (Matched): ${maxConflictM.toFixed(2)}σ`,
    `Scale-vs-Shape Conflict |z| (Shifted): ${maxConflictS.toFixed(2)}σ`,
  ].forEach((item) => metrics.append(text('span', item)));
  box.append(metrics);

  box.append(drawPriorPredictiveVisuals(pp));

  if (Array.isArray(pp.summaries) && pp.summaries.length) {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    const tbl = document.createElement('table');
    tbl.className = 'results-table compact-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['Summary statistic', 'Behavior under Under-Reporting', 'Prior 5th–95th (median)', 'Matched (50%) median', 'Shifted (25%) median', 'Shift Δz (SD)'].forEach((col) => {
      const th = text('th', col);
      th.scope = 'col';
      hrow.append(th);
    });
    thead.append(hrow);
    const tbody = document.createElement('tbody');
    for (const s of pp.summaries) {
      const tr = document.createElement('tr');
      const isScale = ['attack_rate', 'peak_incidence', 'early_incidence'].includes(s.name);
      const kindBadge = text('span', isScale ? 'scale-sensitive' : 'scale-invariant', `kind-pill ${isScale ? 'kind-scale' : 'kind-shape'}`);
      const tdKind = document.createElement('td');
      tdKind.append(kindBadge);
      const dz = s.standardized_shift_sd;
      const tdDz = text('td', `${dz >= 0 ? '+' : ''}${dz.toFixed(3)} SD`, Math.abs(dz) > 0.35 ? 'dz-alert' : '');
      tr.append(
        text('th', s.label),
        tdKind,
        text('td', `${s.prior_p05.toFixed(2)}–${s.prior_p95.toFixed(2)} (${s.prior_p50.toFixed(2)})`),
        text('td', s.matched_median.toFixed(2)),
        text('td', s.shifted_median.toFixed(2)),
        tdDz,
      );
      tbody.append(tr);
    }
    tbl.append(thead, tbody);
    wrap.append(tbl);
    box.append(wrap);
  }
}

/* ============================================================================
   STAGE 2: 14-METHOD VISUAL FOREST / DUMBBELL CHART & BENCHMARK TABLE
   ============================================================================ */
function selectEstimatorAndRun(method, seed) {
  $('method-select').value = method;
  syncSeedOptions();
  $('seed-select').value = String(seed);
  renderMethodComparisonChart();
  renderStudyRows();
  renderRanks();
  runPredictiveCheck();
}

function renderMethodComparisonChart() {
  const panel = $('method-comparison-chart');
  if (!panel || !preparedStudy) return;
  panel.replaceChildren();

  const selectedMethod = $('method-select').value;
  const selectedSeed = Number($('seed-select').value);

  const filtered = preparedStudy.report.results.filter((r) => {
    if (activeFamilyFilter === 'all') return true;
    if (activeFamilyFilter === 'multiseed') return r.method === 'FMPE' || r.method === 'NPE_NSF';
    return r.family === activeFamilyFilter;
  });

  const metricCfg = {
    beta_cov: {
      title: 'Transmission Rate β · Empirical 90% Interval Coverage (Matched 50% vs Shifted 25%)',
      min: 0,
      max: 1.0,
      target: 0.9,
      targetLabel: 'Nominal 90% Target',
      format: (v) => pct(v),
      getM: (r) => r.matched.transmission_rate.coverage,
      getS: (r) => r.shifted.transmission_rate.coverage,
    },
    r0_cov: {
      title: 'Basic Reproduction Number R₀ = β/γ · Empirical 90% Interval Coverage (Matched vs Shifted)',
      min: 0,
      max: 1.0,
      target: 0.9,
      targetLabel: 'Nominal 90% Target',
      format: (v) => pct(v),
      getM: (r) => (r.matched_r0 || r.diagnostics?.matched_r0)?.coverage ?? 0,
      getS: (r) => (r.shifted_r0 || r.diagnostics?.shifted_r0)?.coverage ?? 0,
    },
    beta_mae: {
      title: 'Transmission Rate β · Median Absolute Error (Lower is Better)',
      min: 0,
      max: 0.14,
      target: null,
      targetLabel: '',
      format: (v) => v.toFixed(3),
      getM: (r) => r.matched.transmission_rate.median_absolute_error,
      getS: (r) => r.shifted.transmission_rate.median_absolute_error,
    },
    tarp_iace: {
      title: 'Joint 2D TARP Integrated Absolute Coverage Error (IACE → 0 is Ideal Calibration)',
      min: 0,
      max: 0.25,
      target: 0.03,
      targetLabel: 'Well-calibrated (<0.03)',
      format: (v) => v.toFixed(3),
      getM: (r) => r.diagnostics?.matched_tarp?.iace ?? 0,
      getS: (r) => r.diagnostics?.shifted_tarp?.iace ?? 0,
    },
  }[activeChartMetric];

  const head = document.createElement('div');
  head.style.display = 'flex';
  head.style.justifyContent = 'space-between';
  head.style.alignItems = 'center';
  head.style.flexWrap = 'wrap';
  head.style.gap = '10px';
  head.style.marginBottom = '6px';
  head.append(text('div', metricCfg.title, 'calib-subhead'));
  const leg = document.createElement('div');
  leg.className = 'sir-legend';
  [
    ['Matched (50% reporting)', '#1e6248'],
    ['Shifted (25% reporting)', '#b84c27'],
  ].forEach(([l, c]) => {
    const sp = text('span', l);
    sp.style.setProperty('--swatch', c);
    leg.append(sp);
  });
  head.append(leg);
  panel.append(head);

  const rowH = 26;
  const topPad = 24;
  const botPad = 26;
  const svgH = topPad + filtered.length * rowH + botPad;
  const leftX = 225;
  const rightX = 805;
  const plotW = rightX - leftX;

  // Compute domain dynamically from the data so no values are silently clamped
  const dataVals = filtered
    .flatMap((r) => [metricCfg.getM(r), metricCfg.getS(r)])
    .filter((v) => Number.isFinite(v));
  if (Number.isFinite(metricCfg.target)) dataVals.push(metricCfg.target);
  const domMin = dataVals.length ? Math.min(metricCfg.min, ...dataVals) : metricCfg.min;
  const maxData = dataVals.length ? Math.max(...dataVals) : metricCfg.max;
  const domMax = maxData > metricCfg.max ? maxData * 1.08 : metricCfg.max;
  const domSpan = Math.max(1e-9, domMax - domMin);
  const xPos = (v) => leftX + ((v - domMin) / domSpan) * plotW;

  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', `${metricCfg.title} interactive chart`);

  const svg = svgEl('svg', {
    viewBox: `0 0 920 ${svgH}`,
    role: 'group',
    'aria-label': `${metricCfg.title}. Tab through method rows and press Enter or Space to inspect in Stage 3.`,
  });

  // Gridlines
  for (let frac = 0; frac <= 1.001; frac += 0.25) {
    const val = domMin + frac * domSpan;
    const gx = xPos(val);
    svg.append(
      svgEl('line', { x1: gx, y1: topPad - 6, x2: gx, y2: svgH - botPad, stroke: '#e8eee7', 'stroke-width': '1' }),
      svgEl('text', { x: gx, y: svgH - 8, 'text-anchor': 'middle', fill: '#4e6156', 'font-size': '11', 'font-weight': '600' }, metricCfg.format(val)),
    );
  }

  // Target reference line
  if (metricCfg.target != null) {
    const tx = xPos(metricCfg.target);
    svg.append(
      svgEl('line', { x1: tx, y1: topPad - 8, x2: tx, y2: svgH - botPad, stroke: '#1b2a23', 'stroke-width': '1.8', 'stroke-dasharray': '4 3' }),
      svgEl('text', { x: tx, y: 14, 'text-anchor': 'middle', fill: '#1b2a23', 'font-size': '11', 'font-weight': '800' }, metricCfg.targetLabel),
    );
  }

  filtered.forEach((r, idx) => {
    const cy = topPad + idx * rowH + rowH / 2;
    const isSel = r.method === selectedMethod && r.training_seed === selectedSeed;
    const valM = metricCfg.getM(r);
    const valS = metricCfg.getS(r);
    const xm = xPos(valM);
    const xs = xPos(valS);

    const lbl = `${r.label || r.method}${r.training_seed !== 711 ? ` (${r.training_seed})` : ''}`;
    const rowSummary = `${lbl}: Matched (50% reporting) ${metricCfg.format(valM)}, Shifted (25% reporting) ${metricCfg.format(valS)}`;

    const g = svgEl('g', {
      class: 'method-chart-row',
      tabindex: '0',
      role: 'button',
      'aria-pressed': String(isSel),
      'aria-label': `${rowSummary}. Press Enter or Space to inspect in Stage 3.`,
    });
    g.append(svgEl('title', {}, rowSummary));
    const activateRow = () => selectEstimatorAndRun(r.method, r.training_seed);
    g.addEventListener('click', activateRow);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateRow();
      }
    });

    g.append(
      svgEl('rect', {
        class: 'method-row-bg',
        x: 4,
        y: cy - rowH / 2 + 1,
        width: 912,
        height: rowH - 2,
        rx: 5,
        fill: isSel ? '#e3f0e7' : idx % 2 === 0 ? '#fafcfa' : '#ffffff',
        stroke: isSel ? '#1e6248' : 'none',
        'stroke-width': isSel ? '1.3' : '0',
      }),
    );

    g.append(
      svgEl(
        'text',
        {
          x: 12,
          y: cy + 4,
          fill: isSel ? '#154b36' : '#1b2a23',
          'font-size': '12',
          'font-weight': isSel ? '800' : '600',
        },
        lbl.length > 29 ? `${lbl.slice(0, 28)}…` : lbl,
      ),
    );

    // Connecting dumbbell line between Matched and Shifted
    g.append(
      svgEl('line', {
        x1: Math.min(xm, xs),
        y1: cy,
        x2: Math.max(xm, xs),
        y2: cy,
        stroke: '#9ab0a0',
        'stroke-width': '2.4',
      }),
      svgEl('circle', { cx: xs, cy, r: '5.5', fill: '#b84c27', stroke: '#fff', 'stroke-width': '1.2' }),
      svgEl('circle', { cx: xm, cy, r: '5.5', fill: '#1e6248', stroke: '#fff', 'stroke-width': '1.2' }),
      svgEl(
        'text',
        { x: 820, y: cy + 4, fill: '#1b2a23', 'font-size': '11', 'font-weight': '700' },
        `${metricCfg.format(valM)} → ${metricCfg.format(valS)}`,
      ),
    );

    svg.append(g);
  });

  panel.append(svg);
}

function coverageBarCell(score, tone) {
  const cell = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.className = 'cov-bar-wrap';
  const track = document.createElement('div');
  track.className = 'cov-bar-track';
  const fill = document.createElement('div');
  fill.className = 'cov-bar-fill';
  fill.style.width = `${Math.min(100, Math.max(2, score.coverage * 100)).toFixed(1)}%`;
  fill.style.background = tone === 'shifted' && score.coverage < 0.7 ? '#b84c27' : '#1e6248';
  const target = document.createElement('div');
  target.className = 'cov-bar-target';
  target.title = '90% nominal coverage target';
  track.append(fill, target);
  wrap.append(track, text('strong', pct(score.coverage)));
  cell.append(wrap);
  cell.append(
    text(
      'small',
      `${score.coverage_count}/${score.datasets} · MAE ${score.median_absolute_error.toFixed(3)}`,
    ),
  );
  return cell;
}

function renderStudyRows() {
  if (!preparedStudy) return;
  const rows = $('study-rows');
  rows.replaceChildren();
  const selectedMethod = $('method-select').value;
  const selectedSeed = Number($('seed-select').value);

  const filtered = preparedStudy.report.results.filter((r) => {
    if (activeFamilyFilter === 'all') return true;
    if (activeFamilyFilter === 'multiseed') return r.method === 'FMPE' || r.method === 'NPE_NSF';
    return r.family === activeFamilyFilter;
  });

  for (const result of filtered) {
    const isSel = result.method === selectedMethod && result.training_seed === selectedSeed;
    const row = document.createElement('tr');
    row.className = `clickable-row${isSel ? ' selected-row' : ''}`;
    const activateRow = () => selectEstimatorAndRun(result.method, result.training_seed);
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      activateRow();
    });

    const name = document.createElement('th');
    name.scope = 'row';
    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'row-select-btn';
    selectBtn.setAttribute('aria-pressed', String(isSel));
    selectBtn.setAttribute(
      'aria-label',
      `Inspect ${result.label || result.method} (seed ${result.training_seed}): Matched β coverage ${pct(result.matched.transmission_rate.coverage)}, Shifted β coverage ${pct(result.shifted.transmission_rate.coverage)}`,
    );
    selectBtn.textContent = `${result.label || result.method} · ${result.training_seed}`;
    selectBtn.addEventListener('click', activateRow);
    name.append(selectBtn);
    name.append(text('small', `${result.family || 'Neural'} · train ${result.training_seconds}s · eval ${result.evaluation_seconds}s`));

    const amortCell = document.createElement('td');
    const pillWrap = document.createElement('div');
    pillWrap.className = 'row-pill-wrap';
    if (result.execution_badge) {
      pillWrap.append(text('span', result.execution_badge, `exec-pill ${tierClass(result.execution_tier)}`));
    }
    pillWrap.append(text('span', `Amort: ${result.amortised || 'yes'}`, `amort-pill amort-${result.amortised || 'yes'}`));
    amortCell.append(pillWrap);
    amortCell.append(text('small', `${result.study_budget || 1024} sims (Table 1: ${result.guide_budget || '10⁴–10⁶'})`));

    const gammaCell = document.createElement('td');
    gammaCell.append(
      text('span', `${pct(result.matched.recovery_rate.coverage)} (M) / ${pct(result.shifted.recovery_rate.coverage)} (S)`),
      text('small', `MAE ${result.matched.recovery_rate.median_absolute_error.toFixed(3)} / ${result.shifted.recovery_rate.median_absolute_error.toFixed(3)}`),
    );

    const r0Cell = document.createElement('td');
    const r0M = result.matched_r0 || result.diagnostics?.matched_r0;
    const r0S = result.shifted_r0 || result.diagnostics?.shifted_r0;
    if (r0M && r0S) {
      r0Cell.append(text('span', `${pct(r0M.coverage)} (M) / ${pct(r0S.coverage)} (S)`));
      r0Cell.append(text('small', `R₀ MAE ${r0M.median_absolute_error.toFixed(2)} (M) · ${r0S.median_absolute_error.toFixed(2)} (S)`));
    } else {
      r0Cell.append(text('span', 'n/a'));
    }

    const diagCell = document.createElement('td');
    const tarpM = result.diagnostics?.matched_tarp;
    const tarpS = result.diagnostics?.shifted_tarp;
    const shiftBetaCov = result.shifted.transmission_rate.coverage;
    let verdictText = 'Shift-sensitive';
    let verdictCls = 'verdict-drop';
    if (shiftBetaCov >= 0.8) {
      verdictText = 'Shift-robust (~85–90%)';
      verdictCls = 'verdict-good';
    } else if (shiftBetaCov >= 0.68) {
      verdictText = 'Broad / conservative';
      verdictCls = 'verdict-warn';
    }
    diagCell.append(text('span', verdictText, `verdict-badge ${verdictCls}`));
    if (tarpM && tarpS) {
      diagCell.append(
        text('small', `TARP IACE: ${tarpM.iace.toFixed(3)} (M) → ${tarpS.iace.toFixed(3)} (S)`),
      );
    }

    row.append(
      name,
      amortCell,
      coverageBarCell(result.matched.transmission_rate, 'matched'),
      coverageBarCell(result.shifted.transmission_rate, 'shifted'),
      gammaCell,
      r0Cell,
      diagCell,
    );
    rows.append(row);
  }
}

/* ============================================================================
   STAGE 3: METHOD GUIDE, SVG SBC HISTOGRAMS, TARP & 2D JOINT POSTERIOR
   ============================================================================ */
function renderMethodGuideCard(result) {
  const card = $('method-guide-card');
  if (!card || !result) return;
  card.replaceChildren();
  const head = document.createElement('div');
  head.className = 'guide-card-head';
  const titleWrap = document.createElement('div');
  titleWrap.append(
    text('span', `${result.family || 'Method'} · Section ${result.section_ref || '3'}`, 'guide-kicker'),
    text('h4', `${result.label || result.method} (seed ${result.training_seed})`),
  );
  const badges = document.createElement('div');
  badges.className = 'guide-badges';
  if (result.execution_badge) {
    badges.append(text('span', result.execution_badge, `exec-pill ${tierClass(result.execution_tier)}`));
  }
  badges.append(
    text('span', `Amortised: ${result.amortised || 'yes'}`, `amort-pill amort-${result.amortised || 'yes'}`),
    text('span', `Guide budget: ${result.guide_budget || '10⁴–10⁶'}`, 'amort-pill'),
    text('span', `Study budget: ${result.study_budget || 1024} sims`, 'amort-pill'),
  );
  head.append(titleWrap, badges);
  card.append(head);

  if (result.how_run || result.code_entry || result.artifact_note) {
    const execStrip = document.createElement('div');
    execStrip.className = 'method-exec-strip';
    const metaRow = document.createElement('div');
    metaRow.className = 'method-exec-meta';
    if (result.code_entry) {
      const codeEl = document.createElement('span');
      codeEl.append(text('strong', 'Code entry: '), text('code', result.code_entry, 'sir-eq-code'));
      metaRow.append(codeEl);
    }
    if (result.artifact_note) {
      const artEl = document.createElement('span');
      artEl.append(text('strong', 'Artifact: '), text('code', result.artifact_note, 'sir-eq-code'));
      metaRow.append(artEl);
    }
    execStrip.append(metaRow);
    if (result.how_run) {
      execStrip.append(text('p', `How it was run: ${result.how_run}`));
    }
    card.append(execStrip);
  }

  const grid = document.createElement('div');
  grid.className = 'guide-meta-grid';
  for (const [label, val] of [
    ['Best suited to (Table 1)', result.best_suited],
    ['Main limitations (Table 1)', result.limitations],
    ['Data representation & refs', `${result.representation || ''} · Refs: ${result.key_refs || ''}`],
  ]) {
    if (!val) continue;
    const item = document.createElement('div');
    item.append(text('strong', label), text('p', val));
    grid.append(item);
  }
  card.append(grid);

  const misspec = result.diagnostics?.summary_misspecification_probs;
  if (misspec && Array.isArray(misspec.summary_names)) {
    const mBox = document.createElement('div');
    mBox.className = 'rnpe-misspec-strip';
    mBox.append(text('strong', 'RNPE spike-and-slab posterior summary misspecification probabilities P(slab | x_obs):'));
    const pills = document.createElement('div');
    pills.className = 'rnpe-pills';
    misspec.summary_names.forEach((name, idx) => {
      const pM = misspec.matched_mean_prob[idx];
      const pS = misspec.shifted_mean_prob[idx];
      pills.append(
        text('span', `${name}: ${(100 * pM).toFixed(0)}% matched → ${(100 * pS).toFixed(0)}% shifted`, pS > 0.23 ? 'misspec-high' : ''),
      );
    });
    mBox.append(pills);
    card.append(mBox);
  }
}

function drawSbcHistogramSvg(countsM, countsS, paramLabel, ksM, ksS) {
  const maxCount = Math.max(28, ...(countsM || []), ...(countsS || []));
  const svg = svgEl('svg', {
    viewBox: '0 0 460 118',
    role: 'img',
    'aria-label': `SBC rank histogram for ${paramLabel} comparing Matched 50 percent and Shifted 25 percent`,
  });
  const left = 36;
  const right = 444;
  const top = 22;
  const bot = 96;
  const h = bot - top;
  const yPos = (c) => bot - (c / maxCount) * h;

  // 95% Binomial interval for 128 datasets across 8 bins: [9, 24], mean = 16
  const yLow = yPos(9);
  const yHigh = yPos(24);
  const yTarget = yPos(16);
  svg.append(
    svgEl('rect', {
      x: left,
      y: yHigh.toFixed(1),
      width: right - left,
      height: (yLow - yHigh).toFixed(1),
      fill: '#e7f1ea',
    }),
    svgEl('line', {
      x1: left,
      y1: yTarget.toFixed(1),
      x2: right,
      y2: yTarget.toFixed(1),
      stroke: '#1b2a23',
      'stroke-dasharray': '4 3',
      'stroke-width': '1.3',
    }),
    svgEl(
      'text',
      { x: left, y: 14, fill: '#1b2a23', 'font-size': '11', 'font-weight': '700' },
      `${paramLabel} · Target = 16/bin (95% band: 9–24)`,
    ),
    svgEl(
      'text',
      { x: right, y: 14, 'text-anchor': 'end', fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' },
      `KS p: ${(ksM ?? 0).toFixed(2)} (M) / ${(ksS ?? 0).toFixed(2)} (S)`,
    ),
  );

  const binSlot = (right - left) / 8;
  for (let i = 0; i < 8; i++) {
    const x0 = left + i * binSlot + 5;
    const w = (binSlot - 12) / 2;
    const cm = countsM?.[i] ?? 0;
    const cs = countsS?.[i] ?? 0;
    const ym = yPos(cm);
    const ys = yPos(cs);
    svg.append(
      svgEl('rect', {
        x: x0.toFixed(1),
        y: ym.toFixed(1),
        width: w.toFixed(1),
        height: Math.max(1.5, bot - ym).toFixed(1),
        rx: 2,
        fill: '#1e6248',
      }),
      svgEl('rect', {
        x: (x0 + w + 2).toFixed(1),
        y: ys.toFixed(1),
        width: w.toFixed(1),
        height: Math.max(1.5, bot - ys).toFixed(1),
        rx: 2,
        fill: '#b84c27',
      }),
      svgEl('text', { x: (x0 + w / 2).toFixed(1), y: Math.max(20, ym - 2).toFixed(1), 'text-anchor': 'middle', fill: '#1e6248', 'font-size': '9.5', 'font-weight': '700' }, String(cm)),
      svgEl('text', { x: (x0 + 1.5 * w + 2).toFixed(1), y: Math.max(20, ys - 2).toFixed(1), 'text-anchor': 'middle', fill: '#b84c27', 'font-size': '9.5', 'font-weight': '700' }, String(cs)),
      svgEl('text', { x: (left + (i + 0.5) * binSlot).toFixed(1), y: 110, 'text-anchor': 'middle', fill: '#4e6156', 'font-size': '10' }, `Bin ${i + 1}`),
    );
  }
  svg.append(svgEl('line', { x1: left, y1: bot, x2: right, y2: bot, stroke: '#9ab0a0', 'stroke-width': '1' }));
  return wrapScrollableChart(svg, `SBC rank histogram for ${paramLabel}`);
}

function drawTarpChart(tarpM, tarpS) {
  const svg = svgEl('svg', {
    viewBox: '0 0 320 215',
    role: 'img',
    'aria-label': 'Joint TARP expected coverage probability versus credibility level alpha',
  });
  const px = (a) => 42 + a * 252;
  const py = (e) => 182 - e * 158;

  // Shaded ±0.06 calibration corridor around diagonal
  const bandPts = [
    `${px(0)},${py(0.06)}`,
    `${px(0.94)},${py(1.0)}`,
    `${px(1.0)},${py(1.0)}`,
    `${px(1.0)},${py(0.94)}`,
    `${px(0.06)},${py(0.0)}`,
    `${px(0.0)},${py(0.0)}`,
  ].join(' ');
  svg.append(
    svgEl('polygon', { points: bandPts, fill: '#e7f1ea' }),
    svgEl('line', {
      x1: px(0),
      y1: py(0),
      x2: px(1),
      y2: py(1),
      stroke: '#1b2a23',
      'stroke-dasharray': '4 3',
      'stroke-width': '1.5',
    }),
    svgEl('text', { x: px(0.28), y: py(0.75), fill: '#4e6156', 'font-size': '9.5' }, 'Conservative (under-confident)'),
    svgEl('text', { x: px(0.45), y: py(0.18), fill: '#b84c27', 'font-size': '9.5' }, 'Over-confident / biased'),
  );

  for (const [tarp, color] of [
    [tarpM, '#1e6248'],
    [tarpS, '#b84c27'],
  ]) {
    if (!tarp || !Array.isArray(tarp.alpha) || !Array.isArray(tarp.ecp)) continue;
    const pts = tarp.alpha.map((a, i) => `${px(a).toFixed(1)},${py(tarp.ecp[i]).toFixed(1)}`).join(' ');
    svg.append(svgEl('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': '2.6' }));
  }
  for (const [txt, x, y] of [
    ['1.0', 12, 28],
    ['0.5', 12, 106],
    ['0.0', 12, 184],
    ['α = 0', 42, 200],
    ['α = 0.5', 155, 200],
    ['α = 1.0', 262, 200],
  ]) {
    svg.append(svgEl('text', { x, y, fill: '#4e6156', 'font-size': '10', 'font-weight': '600' }, txt));
  }
  return svg;
}

function renderRanks() {
  if (!preparedStudy) return;
  syncSeedOptions();
  const result = preparedStudy.report.results.find(
    (r) => r.method === $('method-select').value && r.training_seed === Number($('seed-select').value),
  );
  const container = $('sbc-ranks');
  container.replaceChildren();
  const tarpPanel = $('tarp-panel');
  if (tarpPanel) tarpPanel.replaceChildren();
  if (!result) {
    container.textContent = 'Ranks unavailable for this selection.';
    return;
  }

  renderMethodGuideCard(result);

  const tarpM = result.diagnostics?.matched_tarp;
  const tarpS = result.diagnostics?.shifted_tarp;
  const lcM = result.diagnostics?.matched_lc2st;
  const lcS = result.diagnostics?.shifted_lc2st;

  container.append(
    text('div', `Marginal SBC Rank Histograms · ${result.label || result.method} (Matched vs Shifted)`, 'calib-subhead'),
    drawSbcHistogramSvg(
      result.matched.transmission_rate.rank_histogram,
      result.shifted.transmission_rate.rank_histogram,
      'Transmission β',
      tarpM?.sbc_ks_pval?.transmission_rate,
      tarpS?.sbc_ks_pval?.transmission_rate,
    ),
    drawSbcHistogramSvg(
      result.matched.recovery_rate.rank_histogram,
      result.shifted.recovery_rate.rank_histogram,
      'Recovery γ',
      tarpM?.sbc_ks_pval?.recovery_rate,
      tarpS?.sbc_ks_pval?.recovery_rate,
    ),
  );
  const sbcLeg = document.createElement('div');
  sbcLeg.className = 'sir-legend';
  [
    ['Matched (50%) ranks', '#1e6248'],
    ['Shifted (25%) ranks', '#b84c27'],
    ['95% uniform band [9, 24]', '#7ab896'],
  ].forEach(([l, c]) => {
    const sp = text('span', l);
    sp.style.setProperty('--swatch', c);
    sbcLeg.append(sp);
  });
  container.append(sbcLeg);

  if (tarpPanel && tarpM && tarpS) {
    tarpPanel.append(text('div', 'Joint 2D TARP Coverage Curve (Matched vs Shifted)', 'calib-subhead'));
    tarpPanel.append(drawTarpChart(tarpM, tarpS));
    const meta = document.createElement('div');
    meta.className = 'tarp-meta';
    meta.append(
      text(
        'span',
        `Matched (50%): IACE = ${tarpM.iace.toFixed(3)}, ATC = ${tarpM.atc >= 0 ? '+' : ''}${tarpM.atc.toFixed(2)}, KS p = ${tarpM.ks_pval.toFixed(2)}`,
      ),
      text(
        'span',
        `Shifted (25%): IACE = ${tarpS.iace.toFixed(3)}, ATC = ${tarpS.atc >= 0 ? '+' : ''}${tarpS.atc.toFixed(2)}, KS p = ${tarpS.ks_pval.toFixed(2)}`,
      ),
    );
    if (lcM && lcS) {
      meta.append(
        text(
          'span',
          `Local C2ST at x_obs[0]: Matched p = ${lcM.p_value.toFixed(2)} · Shifted p = ${lcS.p_value.toFixed(2)}`,
        ),
      );
    }
    tarpPanel.append(meta);
  }

  // Update Scorecard Item 3 (Statistical Adequacy)
  const activeScen = $('scenario-select').value;
  const betaCov = activeScen === 'shifted' ? result.shifted.transmission_rate.coverage : result.matched.transmission_rate.coverage;
  setState(
    'adeq-state',
    `${result.method} (${activeScen.toUpperCase()}): ${pct(betaCov)} β COV`,
    betaCov >= 0.78 ? 'active' : 'warning',
  );
}

function computeEllipsePath(draws, px, py) {
  if (!Array.isArray(draws) || draws.length < 5) return null;
  const n = draws.length;
  let mx = 0;
  let my = 0;
  for (const [b, g] of draws) {
    mx += b;
    my += g;
  }
  mx /= n;
  my /= n;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [b, g] of draws) {
    const dx = b - mx;
    const dy = g - my;
    sxx += dx * dx;
    syy += dy * dy;
    sxy += dx * dy;
  }
  sxx /= n - 1;
  syy /= n - 1;
  sxy /= n - 1;
  const trace = sxx + syy;
  const det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (trace * trace) / 4 - det));
  const l1 = Math.max(1e-6, trace / 2 + disc);
  const l2 = Math.max(1e-6, trace / 2 - disc);
  const angle = sxy === 0 && sxx >= syy ? 0 : Math.atan2(l1 - sxx, sxy);
  const chi2_90_sq = 4.605; // 90% 2D Gaussian chi-square contour (df=2)
  const chi2_90 = Math.sqrt(chi2_90_sq);
  const pts = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * 2 * Math.PI;
    const ex = chi2_90 * Math.sqrt(l1) * Math.cos(t);
    const ey = chi2_90 * Math.sqrt(l2) * Math.sin(t);
    const bx = mx + ex * Math.cos(angle) - ey * Math.sin(angle);
    const gy = my + ex * Math.sin(angle) + ey * Math.cos(angle);
    pts.push(`${px(bx).toFixed(1)},${py(gy).toFixed(1)}`);
  }
  let inside = 0;
  const safeDet = Math.max(1e-12, det);
  for (const [b, g] of draws) {
    const dx = b - mx;
    const dy = g - my;
    const mahaSq = (syy * dx * dx - 2 * sxy * dx * dy + sxx * dy * dy) / safeDet;
    if (mahaSq <= chi2_90_sq) inside += 1;
  }
  return { points: pts.join(' '), empiricalCoverage: inside / n };
}

function draw2DPosteriorAndR0Panel(data) {
  if (!Array.isArray(data.posterior_draws_2d) || !data.posterior_draws_2d.length) return null;
  const wrap = document.createElement('div');
  wrap.className = 'predict-grid-two';

  const priorLow = data.prior_low || [0.15, 0.08];
  const priorHigh = data.prior_high || [0.55, 0.25];
  const [bPriorMin, gPriorMin] = priorLow;
  const [bPriorMax, gPriorMax] = priorHigh;
  const [trueB, trueG] = data.generating_parameters || [0.357, 0.135];

  const isShiftedActive = data.scenario === 'shifted';
  const matchedDraws = isShiftedActive ? data.counterpart_draws_2d || [] : data.posterior_draws_2d;
  const shiftedDraws = isShiftedActive ? data.posterior_draws_2d : data.counterpart_draws_2d || [];

  // Dynamically compute 2D domain from prior bounds AND all posterior draws so no draws are clipped
  const allB = [bPriorMin, bPriorMax, trueB, ...matchedDraws.map((d) => d[0]), ...shiftedDraws.map((d) => d[0])].filter(Number.isFinite);
  const allG = [gPriorMin, gPriorMax, trueG, ...matchedDraws.map((d) => d[1]), ...shiftedDraws.map((d) => d[1])].filter(Number.isFinite);
  const bMin = Math.min(...allB);
  const bMax = Math.max(...allB);
  const gMin = Math.min(...allG);
  const gMax = Math.max(...allG);
  const px = (b) => 44 + ((b - bMin) / Math.max(1e-6, bMax - bMin)) * 450;
  const py = (g) => 195 - ((g - gMin) / Math.max(1e-6, gMax - gMin)) * 168;

  // Card 1: 2D Joint Posterior (β, γ) Scatter + 90% Gaussian Covariance Ellipses (Approx.) + Iso-R₀ Lines
  const card1 = document.createElement('div');
  card1.className = 'predict-card';
  card1.append(
    text('div', '2D Joint Posterior (β, γ) Cloud, 90% Gaussian Covariance Ellipses (Approx.) & Iso-R₀ Contours', 'calib-subhead'),
  );
  const svg1 = svgEl('svg', {
    viewBox: '0 0 520 225',
    role: 'img',
    'aria-label': 'Two-dimensional joint posterior draws for transmission beta and recovery gamma with 90 percent Gaussian covariance approximation ellipses and iso-R0 contours',
  });

  svg1.append(svgEl('rect', { x: 44, y: 27, width: 450, height: 168, fill: '#fafcfa', stroke: '#d6e0d5' }));

  // Iso-R₀ lines: γ = β / R₀
  for (const r0Val of [1.5, 2.0, 3.0, 4.0]) {
    const pts = [];
    for (let step = 0; step <= 20; step++) {
      const b = bMin + (step / 20) * (bMax - bMin);
      const g = b / r0Val;
      if (g >= gMin && g <= gMax) pts.push(`${px(b).toFixed(1)},${py(g).toFixed(1)}`);
    }
    if (pts.length >= 2) {
      svg1.append(svgEl('polyline', { points: pts.join(' '), fill: 'none', stroke: '#cbd8cd', 'stroke-dasharray': '3 3', 'stroke-width': '1.2' }));
      const [lx, ly] = pts[pts.length - 1].split(',').map(Number);
      svg1.append(svgEl('text', { x: Math.min(485, lx - 4), y: Math.max(38, ly - 4), fill: '#5b7263', 'font-size': '10', 'font-weight': '600' }, `R₀=${r0Val}`));
    }
  }

  // Counterpart draws (semi-transparent) + active draws (prominent)
  const drawGroups = isShiftedActive
    ? [
        [matchedDraws, '#1e6248', 0.35, 'matched'],
        [shiftedDraws, '#b84c27', 0.82, 'shifted'],
      ]
    : [
        [shiftedDraws, '#b84c27', 0.35, 'shifted'],
        [matchedDraws, '#1e6248', 0.82, 'matched'],
      ];

  const empiricalCovByKey = {};
  for (const [draws, col, alpha, key] of drawGroups) {
    const ell = computeEllipsePath(draws, px, py);
    if (ell) {
      empiricalCovByKey[key] = ell.empiricalCoverage;
      svg1.append(
        svgEl('polygon', {
          points: ell.points,
          fill: col,
          'fill-opacity': String(alpha * 0.14),
          stroke: col,
          'stroke-width': alpha > 0.5 ? '2' : '1.3',
          'stroke-dasharray': alpha > 0.5 ? 'none' : '4 3',
        }),
      );
    }
    for (const [b, g] of draws) {
      if (!Number.isFinite(b) || !Number.isFinite(g)) continue;
      svg1.append(
        svgEl('circle', {
          cx: px(b).toFixed(1),
          cy: py(g).toFixed(1),
          r: alpha > 0.5 ? '2.8' : '2.1',
          fill: col,
          'fill-opacity': String(alpha),
        }),
      );
    }
  }

  // True (β, γ) crosshair star
  const tx = px(trueB);
  const ty = py(trueG);
  svg1.append(
    svgEl('line', { x1: tx - 9, y1: ty, x2: tx + 9, y2: ty, stroke: '#1b2a23', 'stroke-width': '2.2' }),
    svgEl('line', { x1: tx, y1: ty - 9, x2: tx, y2: ty + 9, stroke: '#1b2a23', 'stroke-width': '2.2' }),
    svgEl('circle', { cx: tx, cy: ty, r: '4.5', fill: '#fff', stroke: '#1b2a23', 'stroke-width': '2.2' }),
    svgEl('text', { x: tx + 8, y: ty - 6, fill: '#1b2a23', 'font-size': '10.5', 'font-weight': '800' }, `True (β=${trueB.toFixed(2)}, γ=${trueG.toFixed(2)})`),
  );

  // Axis labels
  svg1.append(
    svgEl('text', { x: 44, y: 214, fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' }, `β=${bMin.toFixed(2)}`),
    svgEl('text', { x: 269, y: 214, 'text-anchor': 'middle', fill: '#1b2a23', 'font-size': '11', 'font-weight': '700' }, 'Transmission rate β (day⁻¹)'),
    svg1.appendChild(svgEl('text', { x: 494, y: 214, 'text-anchor': 'end', fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' }, `β=${bMax.toFixed(2)}`)),
    svgEl('text', { x: 6, y: 34, fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' }, `γ=${gMax.toFixed(2)}`),
    svgEl('text', { x: 6, y: 194, fill: '#4e6156', 'font-size': '10.5', 'font-weight': '600' }, `γ=${gMin.toFixed(2)}`),
  );
  card1.append(wrapScrollableChart(svg1, '2D joint posterior draws and 90% Gaussian covariance ellipses'));
  const leg1 = document.createElement('div');
  leg1.className = 'sir-legend';
  const mEmp = empiricalCovByKey.matched != null ? ` (${pct(empiricalCovByKey.matched)} empirical draws)` : '';
  const sEmp = empiricalCovByKey.shifted != null ? ` (${pct(empiricalCovByKey.shifted)} empirical draws)` : '';
  [
    [`Matched (50% reporting) cloud & 90% Gaussian cov. approx.${mEmp}`, '#1e6248'],
    [`Shifted (25% reporting) cloud & 90% Gaussian cov. approx.${sEmp}`, '#b84c27'],
    ['True generating (β, γ)', '#1b2a23'],
  ].forEach(([l, c]) => {
    const sp = text('span', l);
    sp.style.setProperty('--swatch', c);
    leg1.append(sp);
  });
  card1.append(leg1);
  wrap.append(card1);

  // Card 2: 1D Posterior R₀ = β/γ & Marginal Parameter Comparison (Matched vs Shifted)
  const card2 = document.createElement('div');
  card2.className = 'predict-card';
  card2.append(text('div', 'Posterior R₀ = β/γ & Parameter Shift Comparison (Outbreak #0)', 'calib-subhead'));
  const svg2 = svgEl('svg', {
    viewBox: '0 0 520 225',
    role: 'img',
    'aria-label': 'Comparison of posterior R0 and transmission beta distributions under matched and shifted reporting',
  });

  const quant = (arr, q) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const pos = (s.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return s[base + 1] !== undefined ? s[base] + rest * (s[base + 1] - s[base]) : s[base];
  };

  const mR0 = matchedDraws.map(([b, g]) => b / Math.max(g, 1e-4));
  const sR0 = shiftedDraws.map(([b, g]) => b / Math.max(g, 1e-4));
  const mBeta = matchedDraws.map(([b]) => b);
  const sBeta = shiftedDraws.map(([b]) => b);
  const trueR0 = data.r0_summary?.true_r0 ?? trueB / trueG;

  // Dynamic R₀ domain computed from data quantiles + trueR0 (no silent clamping)
  const r0Candidates = [
    0.8,
    4.5,
    trueR0,
    ...(mR0.length ? [quant(mR0, 0.05), quant(mR0, 0.95)] : []),
    ...(sR0.length ? [quant(sR0, 0.05), quant(sR0, 0.95)] : []),
  ].filter(Number.isFinite);
  const r0RawMin = Math.min(...r0Candidates);
  const r0RawMax = Math.max(...r0Candidates);
  const r0Pad = 0.05 * Math.max(1e-3, r0RawMax - r0RawMin);
  const r0Min = Math.max(0, r0RawMin - r0Pad);
  const r0Max = r0RawMax + r0Pad;
  const rx = (v) => 115 + ((v - r0Min) / Math.max(1e-6, r0Max - r0Min)) * 375;

  svg2.append(
    svgEl('text', { x: 14, y: 24, fill: '#1b2a23', 'font-size': '11', 'font-weight': '800' }, `Basic Reproduction Number R₀ = β/γ (scale ${r0Min.toFixed(1)}–${r0Max.toFixed(1)})`),
    svgEl('line', { x1: rx(trueR0), y1: 32, x2: rx(trueR0), y2: 102, stroke: '#1b2a23', 'stroke-width': '2', 'stroke-dasharray': '4 3' }),
    svgEl('text', { x: rx(trueR0) + 5, y: 42, fill: '#1b2a23', 'font-size': '10.5', 'font-weight': '700' }, `True R₀ = ${trueR0.toFixed(2)}`),
  );
  [
    ['Matched (50%)', mR0, 58, '#1e6248'],
    ['Shifted (25%)', sR0, 86, '#b84c27'],
  ].forEach(([lbl, vals, y, col]) => {
    if (!vals.length) return;
    const q05 = quant(vals, 0.05);
    const q25 = quant(vals, 0.25);
    const q50 = quant(vals, 0.5);
    const q75 = quant(vals, 0.75);
    const q95 = quant(vals, 0.95);
    svg2.append(
      svgEl('text', { x: 14, y: y + 4, fill: col, 'font-size': '10.5', 'font-weight': '700' }, lbl),
      svgEl('line', { x1: rx(q05), y1: y, x2: rx(q95), y2: y, stroke: col, 'stroke-width': '2.2' }),
      svgEl('rect', { x: rx(q25), y: y - 5, width: Math.max(3, rx(q75) - rx(q25)), height: 10, rx: 3, fill: col, 'fill-opacity': '0.35' }),
      svgEl('circle', { cx: rx(q50), cy: y, r: '5', fill: col, stroke: '#fff', 'stroke-width': '1.2' }),
      svgEl('text', { x: Math.min(430, rx(q95) + 6), y: y + 4, fill: col, 'font-size': '10', 'font-weight': '700' }, `${q50.toFixed(2)} (${q05.toFixed(2)}–${q95.toFixed(2)})`),
    );
  });

  // Dynamic Transmission β domain computed from data quantiles + prior bounds (no silent clamping)
  const betaCandidates = [
    bPriorMin,
    bPriorMax,
    trueB,
    ...(mBeta.length ? [quant(mBeta, 0.05), quant(mBeta, 0.95)] : []),
    ...(sBeta.length ? [quant(sBeta, 0.05), quant(sBeta, 0.95)] : []),
  ].filter(Number.isFinite);
  const betaMin = Math.min(...betaCandidates);
  const betaMax = Math.max(...betaCandidates);
  const bx = (v) => 115 + ((v - betaMin) / Math.max(1e-6, betaMax - betaMin)) * 375;

  svg2.append(
    svgEl('line', { x1: 14, y1: 118, x2: 500, y2: 118, stroke: '#e4ebe2', 'stroke-width': '1' }),
    svgEl('text', { x: 14, y: 138, fill: '#1b2a23', 'font-size': '11', 'font-weight': '800' }, `Transmission Rate β (day⁻¹ · scale ${betaMin.toFixed(2)}–${betaMax.toFixed(2)})`),
    svgEl('line', { x1: bx(trueB), y1: 146, x2: bx(trueB), y2: 212, stroke: '#1b2a23', 'stroke-width': '2', 'stroke-dasharray': '4 3' }),
    svgEl('text', { x: bx(trueB) + 5, y: 156, fill: '#1b2a23', 'font-size': '10.5', 'font-weight': '700' }, `True β = ${trueB.toFixed(3)}`),
  );
  [
    ['Matched (50%)', mBeta, 172, '#1e6248'],
    ['Shifted (25%)', sBeta, 200, '#b84c27'],
  ].forEach(([lbl, vals, y, col]) => {
    if (!vals.length) return;
    const q05 = quant(vals, 0.05);
    const q25 = quant(vals, 0.25);
    const q50 = quant(vals, 0.5);
    const q75 = quant(vals, 0.75);
    const q95 = quant(vals, 0.95);
    svg2.append(
      svgEl('text', { x: 14, y: y + 4, fill: col, 'font-size': '10.5', 'font-weight': '700' }, lbl),
      svgEl('line', { x1: bx(q05), y1: y, x2: bx(q95), y2: y, stroke: col, 'stroke-width': '2.2' }),
      svgEl('rect', { x: bx(q25), y: y - 5, width: Math.max(3, bx(q75) - bx(q25)), height: 10, rx: 3, fill: col, 'fill-opacity': '0.35' }),
      svgEl('circle', { cx: bx(q50), cy: y, r: '5', fill: col, stroke: '#fff', 'stroke-width': '1.2' }),
      svgEl('text', { x: Math.min(425, bx(q95) + 6), y: y + 4, fill: col, 'font-size': '10', 'font-weight': '700' }, `${q50.toFixed(3)} (${q05.toFixed(2)}–${q95.toFixed(2)})`),
    );
  });

  card2.append(wrapScrollableChart(svg2, 'Posterior R0 and transmission beta interval comparison'));
  const leg2 = document.createElement('div');
  leg2.className = 'sir-legend';
  [
    ['Dot = Posterior Median · Box = 50% IQR · Whiskers = 90% CrI (dynamic domain)', '#4e6156'],
  ].forEach(([l, c]) => {
    const sp = text('span', l);
    sp.style.setProperty('--swatch', c);
    leg2.append(sp);
  });
  card2.append(leg2);
  wrap.append(card2);

  return wrap;
}

function drawPredictiveChart(data) {
  const values = [data.observed, data.predictive_05, data.predictive_50, data.predictive_95];
  if (values.some((v) => !Array.isArray(v) || v.length !== 28 || v.some((n) => !Number.isFinite(n) || n < 0))) {
    throw new Error('Invalid trajectory values.');
  }
  const svg = svgEl('svg', {
    viewBox: '0 0 600 225',
    role: 'img',
    'aria-label': 'Daily observed cases and posterior predictive 50 percent and 90 percent pointwise intervals',
  });
  const max = Math.max(1, ...values.flat()) * 1.1;
  const x = (i) => 42 + (i * 538) / 27;
  const y = (v) => 195 - (v * 172) / max;
  const points = (a) => a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  for (const frac of [0, 0.5, 1]) {
    const gy = y(max * frac);
    svg.append(svgEl('line', { x1: x(0), y1: gy, x2: x(27), y2: gy, stroke: '#e8eee7', 'stroke-width': '1' }));
  }

  // 90% fan band
  svg.append(
    svgEl('polygon', {
      points: `${points(data.predictive_95)} ${data.predictive_05
        .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        .reverse()
        .join(' ')}`,
      fill: '#cde4d5',
    }),
  );

  // 50% interquartile fan band (if present)
  if (Array.isArray(data.predictive_25) && Array.isArray(data.predictive_75)) {
    svg.append(
      svgEl('polygon', {
        points: `${points(data.predictive_75)} ${data.predictive_25
          .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
          .reverse()
          .join(' ')}`,
        fill: '#8fc4a5',
      }),
    );
  }

  for (const [arr, color] of [
    [data.predictive_50, '#1e6248'],
    [data.observed, '#b84c27'],
  ]) {
    svg.append(svgEl('polyline', { points: points(arr), fill: 'none', stroke: color, 'stroke-width': '2.6' }));
  }
  for (const [value, px, py] of [
    ['0', 16, 198],
    [String(Math.round(max / 2)), 8, 112],
    [String(Math.round(max)), 8, 26],
    ['Day 1', 42, 214],
    ['Day 14', 300, 214],
    ['Day 28', 545, 214],
  ]) {
    svg.append(svgEl('text', { x: px, y: py, fill: '#4e6156', 'font-size': '10', 'font-weight': '600' }, value));
  }
  return svg;
}

function drawSirCompartmentsPredictiveChart(comp) {
  const sBand = comp?.predictive_S_05_50_95;
  const iBand = comp?.predictive_I_05_50_95;
  const rBand = comp?.predictive_R_05_50_95;
  if (!comp || !Array.isArray(sBand) || !Array.isArray(iBand) || !Array.isArray(rBand)) return null;
  const svg = svgEl('svg', {
    viewBox: '0 0 600 225',
    role: 'img',
    'aria-label': 'Reconstructed posterior predictive Susceptible, Infectious, and Recovered compartment trajectories versus true SIR outbreak',
  });
  const maxN = comp.population || 500;
  const x = (i) => 42 + (i / 27) * 538;
  const y = (v) => 195 - (v / maxN) * 172;
  const pts = (a) => a.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  const bands = [
    [sBand[0], sBand[2], 'rgba(37, 91, 138, 0.16)'],
    [iBand[0], iBand[2], 'rgba(184, 76, 39, 0.18)'],
    [rBand[0], rBand[2], 'rgba(30, 98, 72, 0.16)'],
  ];
  for (const [low, high, fill] of bands) {
    if (!Array.isArray(low) || !Array.isArray(high)) continue;
    svg.append(
      svgEl('polygon', {
        points: `${pts(high)} ${low
          .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
          .reverse()
          .join(' ')}`,
        fill,
      }),
    );
  }

  const lines = [
    [comp.true_stochastic?.S, '#255b8a', true],
    [comp.true_stochastic?.I, '#b84c27', true],
    [comp.true_stochastic?.R, '#1e6248', true],
    [sBand[1], '#255b8a', false],
    [iBand[1], '#b84c27', false],
    [rBand[1], '#1e6248', false],
  ];
  for (const [arr, color, dashed] of lines) {
    if (!Array.isArray(arr)) continue;
    svg.append(
      svgEl('polyline', {
        points: pts(arr),
        fill: 'none',
        stroke: color,
        'stroke-width': dashed ? '1.6' : '2.4',
        ...(dashed ? { 'stroke-dasharray': '4 3' } : {}),
      }),
    );
  }
  for (const [value, px, py] of [
    ['0', 16, 198],
    ['250', 8, 112],
    [String(maxN), 8, 26],
    ['Day 1', 42, 214],
    ['Day 14', 300, 214],
    ['Day 28', 545, 214],
  ]) {
    svg.append(svgEl('text', { x: px, y: py, fill: '#4e6156', 'font-size': '10', 'font-weight': '600' }, value));
  }
  return svg;
}

function renderPredictive(data) {
  const box = $('predict-result');
  box.replaceChildren();
  box.hidden = false;
  if (data.status !== 'complete') {
    box.className = 'predict-result warning';
    box.append(text('h3', 'Check inconclusive'), text('p', data.details || data.message || 'No result produced.'));
    return;
  }
  box.className = 'predict-result';
  box.append(
    text(
      'h3',
      `Step (iv) · Live 2D Posterior & Predictive Trajectory Check · ${data.method_label || data.method} (${data.scenario === 'shifted' ? '25% Shifted' : '50% Matched'} reporting)`,
    ),
  );

  if (data.execution_info) {
    const execBar = document.createElement('div');
    execBar.className = 'method-exec-strip';
    const meta = document.createElement('div');
    meta.className = 'method-exec-meta';
    meta.append(
      text('span', data.execution_info.execution_badge || 'WAS RUN', `exec-pill ${tierClass(data.execution_info.execution_tier)}`),
      text('code', data.execution_info.code_entry || '', 'sir-eq-code'),
    );
    execBar.append(meta, text('p', `${data.execution_info.how_run || ''} · Live predictive checks are available in the local version.`));
    box.append(execBar);
  }

  if (data.r0_summary) {
    const r0 = data.r0_summary;
    const gen = Array.isArray(data.generating_parameters) ? data.generating_parameters : [0, 0];
    const r0Bar = document.createElement('div');
    r0Bar.className = 'prior-metrics-bar';
    r0Bar.append(
      text('span', `True β=${Number(gen[0]).toFixed(3)}, γ=${Number(gen[1]).toFixed(3)} (D=1/γ=${r0.true_infectious_period_days.toFixed(1)}d)`),
      text('span', `True R₀ = β/γ = ${r0.true_r0.toFixed(2)} (Herd S* = ${r0.herd_immunity_threshold_s.toFixed(0)})`),
      text(
        'span',
        `Posterior R₀ median ${r0.posterior_r0_median.toFixed(2)} (90% CrI ${r0.posterior_r0_q05.toFixed(2)}–${r0.posterior_r0_q95.toFixed(2)} · ${
          r0.true_in_90_interval ? '✓ covers true R₀' : '⚠ misses true R₀'
        })`,
      ),
    );
    box.append(r0Bar);
  }

  // NEW: 2D Joint Posterior (β, γ) Scatter + 1D R₀ Credible Interval Panel
  const post2d = draw2DPosteriorAndR0Panel(data);
  if (post2d) box.append(post2d);

  // Side-by-side Trajectory Fan Chart + Latent S,I,R Reconstruction
  const trajGrid = document.createElement('div');
  trajGrid.className = 'predict-grid-two';

  const trajCard1 = document.createElement('div');
  trajCard1.className = 'predict-card';
  trajCard1.append(
    text(
      'div',
      `Daily Reported Cases Y_t (Observed total: ${data.observed_total} · Predictive 90% CrI: ${data.predictive_total_05_50_95[0].toFixed(0)}–${data.predictive_total_05_50_95[2].toFixed(0)})`,
      'calib-subhead',
    ),
    wrapScrollableChart(drawPredictiveChart(data), 'Posterior predictive daily reported cases vs observed cases'),
  );
  const key = document.createElement('div');
  key.className = 'chart-key';
  ['Observed Y_t', 'Predictive median Y_t', '50% IQR fan', '90% CrI fan'].forEach((label) => key.append(text('span', label)));
  trajCard1.append(key);
  trajGrid.append(trajCard1);

  if (data.sir_compartments) {
    const compSvg = drawSirCompartmentsPredictiveChart(data.sir_compartments);
    if (compSvg) {
      const trajCard2 = document.createElement('div');
      trajCard2.className = 'predict-card';
      trajCard2.append(
        text('div', 'Reconstructed Latent SIR Compartments S(t), I(t), R(t) (90% Bands vs True Dashed)', 'calib-subhead'),
        wrapScrollableChart(compSvg, 'Reconstructed latent SIR compartments 90% bands vs true trajectory'),
      );
      const compKey = document.createElement('div');
      compKey.className = 'sir-legend';
      [
        ['S(t) Susceptible', '#255b8a'],
        ['I(t) Infectious', '#b84c27'],
        ['R(t) Recovered', '#1e6248'],
      ].forEach(([lbl, col]) => {
        const sp = text('span', lbl);
        sp.style.setProperty('--swatch', col);
        compKey.append(sp);
      });
      trajCard2.append(compKey);
      trajGrid.append(trajCard2);
    }
  }
  box.append(trajGrid);

  if (Array.isArray(data.summary_checks) && data.summary_checks.length) {
    const wf = data.workflow_diagnostics;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    wrap.style.marginTop = '12px';
    const tbl = document.createElement('table');
    tbl.className = 'results-table compact-table';
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    const hasRnpe = Boolean(wf?.summary_misspecification_probs);
    [
      'Summary statistic',
      'Observed value',
      'Predictive 5th–95th (median)',
      'Two-sided PPC p-value',
      ...(hasRnpe ? ['RNPE P(slab | x_obs)'] : []),
    ].forEach((c) => {
      const th = text('th', c);
      th.scope = 'col';
      hrow.append(th);
    });
    thead.append(hrow);
    const tbody = document.createElement('tbody');
    data.summary_checks.forEach((sc, idx) => {
      const tr = document.createElement('tr');
      tr.append(
        text('th', sc.label),
        text('td', sc.observed.toFixed(2)),
        text('td', `${sc.predictive_05.toFixed(2)}–${sc.predictive_95.toFixed(2)} (${sc.predictive_50.toFixed(2)})`),
        text('td', `${sc.ppp_value.toFixed(2)}${sc.ppp_value < 0.05 ? ' ⚠ tail mismatch' : ''}`, sc.ppp_value < 0.05 ? 'dz-alert' : ''),
      );
      if (hasRnpe) {
        const probs =
          data.scenario === 'shifted'
            ? wf.summary_misspecification_probs.shifted_example_0_prob
            : wf.summary_misspecification_probs.matched_example_0_prob;
        const pVal = Array.isArray(probs) ? probs[idx] : null;
        tr.append(text('td', pVal != null ? `${(100 * pVal).toFixed(1)}%` : 'n/a', pVal > 0.25 ? 'dz-alert' : ''));
      }
      tbody.append(tr);
    });
    tbl.append(thead, tbody);
    wrap.append(tbl);
    box.append(wrap);
  }

  box.append(
    text(
      'p',
      `Data reporting: ${(data.observation_reporting_fraction * 100).toFixed(0)}%. Fitted model: ${(data.fitted_reporting_fraction * 100).toFixed(0)}%. ${data.posterior_draws} prepared posterior draws; fresh trajectory simulation ran locally in ${data.duration_seconds}s.`,
    ),
    text('p', data.limitations, 'study-warnings'),
  );
}

async function runPredictiveCheck() {
  return { ok: false, status: 'unavailable' };
}
async function unusedLivePredictiveCheck() {
  const button = $('predict-button');
  if (!button) return { ok: false, status: 'unavailable' };
  button.disabled = true;
  button.textContent = 'Simulating…';
  try {
    syncSeedOptions();
    const body = {
      method: $('method-select').value,
      seed: Number($('seed-select').value),
      scenario: $('scenario-select').value,
    };
    const result = await jsonRequest('/api/predictive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    renderPredictive(result);
    if (result.status === 'complete') latestCheck = result;
    return { ok: result.status === 'complete', status: result.status || 'inconclusive', result };
  } catch (error) {
    renderPredictive({ status: 'inconclusive', details: error.message });
    return { ok: false, status: 'inconclusive', error: error.message };
  } finally {
    button.disabled = false;
    button.replaceChildren(document.createTextNode('Run predictive check '), text('span', '→'));
  }
}

/* ============================================================================
   STAGE 4A: PAPER AST SOURCE AUDIT VISUALIZATION
   ============================================================================ */
function renderSourceAuditResult(result) {
  const box = $('audit-result');
  if (!box) return;
  box.replaceChildren();
  box.hidden = false;
  if (result.status !== 'complete') {
    box.className = 'predict-result warning';
    box.append(text('h3', 'Source check inconclusive'), text('p', result.details || result.message || 'No result was produced.'));
    return;
  }
  latestAudit = result;
  box.className = 'predict-result';
  box.append(text('h3', 'AST Source Audit Finding: S/I drift is uncoupled from R₀(t) in rsnl_sir.py'), text('p', result.interpretation));

  // Visual Coupling Comparison Diagram
  const grid = document.createElement('div');
  grid.className = 'predict-grid-two';

  const card1 = document.createElement('div');
  card1.className = 'predict-card';
  card1.append(text('div', 'rsnl_sir.py (Lines 36–39) · Evaluated Drift at R₀ = 0.5 vs R₀ = 2.0', 'calib-subhead'));
  for (const item of result.comparisons || []) {
    const line = document.createElement('div');
    line.style.padding = '6px 8px';
    line.style.marginBottom = '6px';
    line.style.background = '#f4f8f4';
    line.style.borderRadius = '6px';
    line.style.fontFamily = 'var(--mono)';
    line.style.fontSize = '12px';
    line.textContent = `R₀ = ${item.R0.toFixed(1)}  →  dS/dt = ${item.ds_dt.toFixed(4)},  dI/dt = ${item.di_dt.toFixed(4)},  dR₀/dt = ${item.dr0_dt.toFixed(4)}`;
    card1.append(line);
  }
  card1.append(
    text('code', 'dS/dt = -λ·S·I/N   (uses fixed λ, ignores R₀!)', 'sir-eq-code'),
  );
  grid.append(card1);

  const card2 = document.createElement('div');
  card2.className = 'predict-card';
  card2.append(text('div', 'Paper-to-Code Correspondence: RSNL vs RNPE Reference', 'calib-subhead'));
  if (result.rnpe_reference) {
    card2.append(
      text('p', 'In Ward et al. (RNPE, rnpe_sir.jl), β and γ directly govern discrete infection/recovery transitions with R₀ = β/γ.'),
      text('code', `Infection prob = ${result.rnpe_reference.infection_probability} · Recovery prob = ${result.rnpe_reference.recovery_probability}`, 'sir-eq-code'),
    );
  }
  for (const source of result.sources || []) {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = `${source.name} · lines ${source.lines.join('–')} ↗`;
    const p = document.createElement('p');
    p.style.margin = '8px 0 0';
    p.append(link);
    card2.append(p);
  }
  grid.append(card2);
  box.append(grid);

  box.append(text('p', result.limitations, 'study-warnings'));
}

async function runSourceAuditCheck() {
  return { ok: false, status: 'unavailable' };
}
async function unusedLiveSourceAuditCheck() {
  const button = $('audit-button');
  if (!button) return { ok: false, status: 'unavailable' };
  button.disabled = true;
  button.textContent = 'Checking source…';
  try {
    const result = await jsonRequest('/api/source-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    renderSourceAuditResult(result);
    return { ok: result.status === 'complete', status: result.status || 'inconclusive', result };
  } catch (error) {
    renderSourceAuditResult({ status: 'inconclusive', details: error.message });
    return { ok: false, status: 'inconclusive', error: error.message };
  } finally {
    button.disabled = false;
    button.textContent = 'Run source check →';
  }
}

async function runReplayCheck() {
  return { ok: false, status: 'unavailable' };
}
async function unusedLiveReplayCheck() {
  const button = $('replay-button');
  if (!button) return { ok: false, status: 'unavailable' };
  button.disabled = true;
  button.textContent = 'Running check…';
  try {
    const data = await jsonRequest('/api/replay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    renderReplay(data);
    return { ok: data.status === 'match', status: data.status || 'inconclusive', data };
  } catch (error) {
    renderReplay({ status: 'inconclusive', message: error.message || 'The check did not complete.' });
    return { ok: false, status: 'inconclusive', error: error.message };
  } finally {
    button.disabled = false;
    button.replaceChildren(document.createTextNode('Approve & run '), text('span', '→'));
  }
}

/* ============================================================================
   STUDY INITIALIZATION & INTERACTIVE EVENT WIRING
   ============================================================================ */
async function loadStudy() {
  try {
    const study = await jsonRequest('/api/study');
    if (!study.report || !Array.isArray(study.report.results)) throw new Error('Prepared results are unavailable.');
    preparedStudy = study;
    const spec = study.report.spec;
    const numMethods = study.report.method_catalog ? Object.keys(study.report.method_catalog).length : 14;
    $('study-stats').replaceChildren(
      ...[
        `${numMethods} SBI method families (${study.report.results.length} prepared runs)`,
        `${spec.training_simulations.toLocaleString()} shared training simulations`,
        `${spec.validation_datasets} independent validation datasets`,
        `${spec.posterior_draws_per_dataset} draws per dataset`,
        'SIR (S→I→R→Y) + Execution Audit + SBC/TARP/L-C2ST/PPC',
      ].map((value) => text('span', value)),
    );
    const provenance = $('study-provenance');
    provenance.replaceChildren(
      text(
        'p',
        `Uniform prior: β ${spec.prior_low[0]}–${spec.prior_high[0]}, γ ${spec.prior_low[1]}–${spec.prior_high[1]} per day. Population ${spec.population}; ${spec.days} daily observations; initial infections ${spec.initial_infectious}.`,
      ),
    );
    provenance.append(
      text(
        'p',
        `Training bank seed ${spec.training_bank_seed}; evaluation bank seed ${spec.validation_bank_seed}. Preparation ${study.report.duration_seconds}s. Python ${study.manifest.versions.python}, sbi ${study.manifest.versions.sbi}, PyTorch ${study.manifest.versions.torch}.`,
      ),
    );
    if (Array.isArray(study.report.interpretation)) {
      const ul = document.createElement('ul');
      ul.className = 'provenance-notes';
      study.report.interpretation.forEach((line) => ul.append(text('li', line)));
      provenance.append(ul);
    }
    provenance.append(
      text('p', `Source SHA-256: ${study.manifest.source_sha256}. Manifest SHA-256: ${study.manifest_sha256}.`, 'hash-line'),
    );

    renderSirModelGuide(study.report);
    renderExecutionAudit(study.report.execution_audit);
    renderPriorPredictive(study.report.prior_predictive);
    syncSeedOptions();
    renderMethodComparisonChart();
    renderStudyRows();
    $('study-loading').hidden = true;
    $('study-content').hidden = false;
    renderRanks();

    // Auto-run fast local checks on startup so every stage is populated immediately
    runPredictiveCheck();
    runSourceAuditCheck();
  } catch (error) {
    $('study-loading').textContent = `Prepared study unavailable: ${error.message || 'check the local run and manifest'}. The original replay remains available below.`;
  }
}

// Global Scenario Switcher buttons in Hero
document.querySelectorAll('[data-global-scenario]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const scen = btn.dataset.globalScenario;
    syncGlobalScenarioUI(scen);
    renderRanks();
    runPredictiveCheck();
  });
});

// 4-Stage Pipeline Stepper Tabs
document.querySelectorAll('[data-stage-view]').forEach((tab) => {
  tab.addEventListener('click', () => {
    const view = tab.dataset.stageView;
    document.querySelectorAll('[data-stage-view]').forEach((t) => {
      const active = t === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.pipeline-section').forEach((sec) => {
      sec.hidden = view !== 'all' && sec.dataset.stage !== view;
    });
  });
});

// Topbar "Run Full Pipeline" Button
if ($('run-all-checks-btn')) {
  $('run-all-checks-btn').addEventListener('click', async () => {
    const btn = $('run-all-checks-btn');
    btn.disabled = true;
    btn.textContent = '⏳ Running all checks…';
    let finalLabel = '⚠ Check Inconclusive / Failed';
    try {
      const [predRes, auditRes, replayRes] = await Promise.all([
        runPredictiveCheck(),
        runSourceAuditCheck(),
        runReplayCheck(),
      ]);
      if (preparedBundle) {
        const disc = evaluateBundleDiscrepancy(preparedBundle);
        setState('trace-state', disc.summary, disc.tone);
      } else {
        setState('trace-state', 'BUNDLE UNAVAILABLE', 'warning');
      }
      const allChecksSucceeded = Boolean(predRes?.ok && auditRes?.ok && replayRes?.ok && preparedBundle);
      const anyInconclusive = [predRes?.status, auditRes?.status, replayRes?.status].some(
        (s) => !s || s === 'inconclusive' || s === 'error' || s === 'unavailable',
      );
      if (allChecksSucceeded) {
        finalLabel = '✓ All Checks Passed';
      } else if (anyInconclusive) {
        finalLabel = '⚠ Check Inconclusive / Failed';
      } else {
        finalLabel = '⚠ Checks Completed (Mismatch Flagged)';
      }
    } finally {
      btn.disabled = false;
      btn.textContent = finalLabel;
      setTimeout(() => {
        btn.textContent = '▶ Run Full Pipeline';
      }, 3600);
    }
  });
}

// Stage 2 Family Filter & Metric Switcher
if ($('family-filter')) {
  $('family-filter').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-filter]');
    if (!btn) return;
    activeFamilyFilter = btn.dataset.filter;
    for (const chip of $('family-filter').querySelectorAll('.filter-chip')) {
      chip.classList.toggle('active', chip === btn);
    }
    renderMethodComparisonChart();
    renderStudyRows();
  });
}

document.querySelectorAll('.metric-chip[data-metric]').forEach((chip) => {
  chip.addEventListener('click', () => {
    activeChartMetric = chip.dataset.metric;
    document.querySelectorAll('.metric-chip[data-metric]').forEach((c) => {
      c.classList.toggle('active', c === chip);
    });
    renderMethodComparisonChart();
  });
});

// Stage 3 Controls
$('predict-button').addEventListener('click', runPredictiveCheck);

for (const id of ['method-select', 'seed-select', 'scenario-select']) {
  $(id).addEventListener('change', () => {
    syncSeedOptions();
    if (id === 'scenario-select') {
      syncGlobalScenarioUI($('scenario-select').value);
    }
    renderMethodComparisonChart();
    renderStudyRows();
    renderRanks();
    runPredictiveCheck();
  });
}

$('export-button').addEventListener('click', () => {
  if (!preparedStudy) return;
  const report = {
    exported_at: new Date().toISOString(),
    prepared_study: preparedStudy,
    live_predictive_check: latestCheck,
    source_audit: latestAudit,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sbi-evidence-report.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Stage 4 Buttons
$('audit-button').addEventListener('click', runSourceAuditCheck);
$('replay-button').addEventListener('click', runReplayCheck);

// Kick off initial data load
loadStatus();
loadBundle();
loadStudy();
