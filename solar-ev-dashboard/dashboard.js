/**
 * dashboard.js — Solar & EV Fleet ROI Dashboard
 * ─────────────────────────────────────────────────────────────
 * Fetches savings_state.json, renders the solar chart,
 * calculates total savings, and wires the interactive EV inputs.
 *
 * ── ADJUSTABLE CONSTANTS (edit these when tariffs change) ─────
 */

const CONFIG = {
  // Path to JSON data file (relative to page URL)
  JSON_PATH: './assets/savings_state.json',

  // Total CapEx of the solar installation (INR)
  CAPEX_TOTAL: 1745000,

  // EV savings multipliers (INR per km driven)
  // Adjust these if petrol prices or electricity tariffs change significantly.
  TIAGO_INR_PER_KM:  7.00,   // Tiago.ev vs petrol hatchback baseline
  ATHER_INR_PER_KM:  2.50,   // Ather 450X vs petrol scooter baseline

  // Chart accent colours (must match style.css :root vars)
  COLOUR_SOLAR:      '#00ffaa',
  COLOUR_SOLAR_FILL: 'rgba(0, 255, 170, 0.12)',
  COLOUR_GRID:       'rgba(0, 212, 255, 0.07)',
  COLOUR_TICK:       '#607080',
};

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */

/**
 * Format a number as a compact Indian-locale currency string.
 * e.g.  123456  →  "₹1,23,456"
 */
function formatINR(value) {
  if (isNaN(value) || value === null) return '₹—';
  const abs = Math.abs(Math.round(value));
  // Indian number formatting: last 3 digits, then groups of 2
  const str = abs.toString();
  if (str.length <= 3) return (value < 0 ? '-' : '') + '₹' + str;
  const last3 = str.slice(-3);
  const rest  = str.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3;
  return (value < 0 ? '-' : '') + '₹' + formatted;
}

/** Format a plain number with commas */
function formatNum(n) {
  return Math.round(n).toLocaleString('en-IN');
}

/* ─────────────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────────────── */

let solarTotalSaved = 0;   // Sum of all solar.inr_saved from JSON
let solarTotalKwh   = 0;   // Sum of all solar.kwh_generated from JSON
let tiagoDrivenKm   = 36000;
let atherDrivenKm   = 15000;
let solarChart      = null;

/* ─────────────────────────────────────────────────────────────
   ROI ENGINE — called any time a value changes or data loads
───────────────────────────────────────────────────────────── */

function recalculate() {
  const tiagSavings  = tiagoDrivenKm * CONFIG.TIAGO_INR_PER_KM;
  const atherSavings = atherDrivenKm * CONFIG.ATHER_INR_PER_KM;
  const evTotal      = tiagSavings + atherSavings;
  const grandTotal   = solarTotalSaved + evTotal;
  const remaining    = CONFIG.CAPEX_TOTAL - grandTotal;
  const pct          = Math.min((grandTotal / CONFIG.CAPEX_TOTAL) * 100, 100);

  // ── 1. Update Zone 1 (Top Command Center) ─────────────────
  document.getElementById('stat-grand-total').textContent = formatINR(grandTotal);
  document.getElementById('stat-solar-total').textContent = formatINR(solarTotalSaved);
  document.getElementById('stat-solar-kwh').textContent   = `${formatNum(solarTotalKwh)} kWh generated`;

  const tiagoTop = document.getElementById('tiago-savings-top');
  if (tiagoTop) tiagoTop.textContent = formatINR(tiagSavings);

  const atherTop = document.getElementById('ather-savings-top');
  if (atherTop) atherTop.textContent = formatINR(atherSavings);

  // ── 2. Update Zone 3 (Lower EV Calculator Results) ────────
  document.getElementById('tiago-savings').textContent = formatINR(tiagSavings);
  document.getElementById('ather-savings').textContent = formatINR(atherSavings);

  // ── 3. Update Giant CapEx Progress Bar ────────────────────
  const bar = document.getElementById('capex-bar');
  if (bar) {
    bar.style.width = pct.toFixed(1) + '%';
    bar.parentElement.setAttribute('aria-valuenow', pct.toFixed(0));
  }

  const pctEl = document.getElementById('capex-pct');
  if (pctEl) pctEl.textContent = pct.toFixed(1) + '%';

  const remainingEl = document.getElementById('stat-remaining');
  if (remainingEl) {
    remainingEl.textContent = remaining <= 0 ? '✓ Recovered' : formatINR(remaining);
    remainingEl.classList.toggle('dash-stat-val--recovered', remaining <= 0);
    remainingEl.classList.toggle('dash-stat-val--amber', remaining > 0 && pct >= 75);
  }

  // ── 4. Update the 3 Mini Progress Bars ────────────────────
  const pctSolar = Math.min((solarTotalSaved / 385000) * 100, 100);
  const pctTiago = Math.min((tiagSavings / 1200000) * 100, 100);
  const pctAther = Math.min((atherSavings / 160000) * 100, 100);

  const progSolar = document.getElementById('prog-solar');
  if (progSolar) progSolar.style.width = pctSolar.toFixed(1) + '%';

  const progTiago = document.getElementById('prog-tiago');
  if (progTiago) progTiago.style.width = pctTiago.toFixed(1) + '%';

  const progAther = document.getElementById('prog-ather');
  if (progAther) progAther.style.width = pctAther.toFixed(1) + '%';
}

/* ─────────────────────────────────────────────────────────────
   CHART — Solar monthly INR savings
───────────────────────────────────────────────────────────── */

function buildChart(records) {
  const labels = records.map(r => r.period);
  const values = records.map(r => r.solar.inr_saved);

  const canvas = document.getElementById('solarChart');
  const ctx    = canvas.getContext('2d');

  // Gradient fill under the line
  const grad = ctx.createLinearGradient(0, 0, 0, 400);
  grad.addColorStop(0,   'rgba(0, 255, 170, 0.22)');
  grad.addColorStop(0.6, 'rgba(0, 255, 170, 0.05)');
  grad.addColorStop(1,   'rgba(0, 255, 170, 0.00)');

  solarChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Solar INR Saved',
        data: values,
        borderColor: CONFIG.COLOUR_SOLAR,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: CONFIG.COLOUR_SOLAR,
        pointBorderColor: '#080c14',
        pointBorderWidth: 1.5,
        fill: true,
        backgroundColor: grad,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: window.innerWidth < 640 ? 1.5 : 2.4,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0d1321',
          borderColor: 'rgba(0,212,255,0.25)',
          borderWidth: 1,
          titleColor: '#00ffaa',
          bodyColor: '#c8d6e5',
          titleFont: { family: "'IBM Plex Mono', monospace", size: 11 },
          bodyFont:  { family: "'IBM Plex Mono', monospace", size: 12 },
          padding: 10,
          callbacks: {
            title: (items) => {
              const d = new Date(items[0].label);
              return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
            },
            label: (item) => {
              const rec = records[item.dataIndex];
              return [
                ` Saved:    ${formatINR(item.raw)}`,
                ` Generated: ${formatNum(rec.solar.kwh_generated)} kWh`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'month',
            tooltipFormat: 'yyyy-MM-dd',
            displayFormats: { month: 'MMM yy' },
          },
          grid: { color: CONFIG.COLOUR_GRID },
          ticks: {
            color: CONFIG.COLOUR_TICK,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            maxTicksLimit: 12,
            maxRotation: 45,
          },
          border: { color: CONFIG.COLOUR_GRID },
        },
        y: {
          grid: { color: CONFIG.COLOUR_GRID },
          ticks: {
            color: CONFIG.COLOUR_TICK,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => '₹' + (v / 1000).toFixed(1) + 'k',
          },
          border: { color: CONFIG.COLOUR_GRID },
          beginAtZero: false,
        },
      },
    },
  });

  // Mark chart wrap as ready (hides skeleton)
  document.querySelector('.chart-wrap').classList.add('chart-ready');
}

/* ─────────────────────────────────────────────────────────────
   DATA TABLE
───────────────────────────────────────────────────────────── */

function buildTable(records) {
  const tbody = document.getElementById('data-table-body');
  const rows  = [...records].reverse().map(r => {
    const d    = new Date(r.period);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    return `<tr>
      <td class="mono">${label}</td>
      <td class="mono">${formatNum(r.solar.kwh_generated)} kWh</td>
      <td class="mono" style="color:var(--solar)">${formatINR(r.solar.inr_saved)}</td>
    </tr>`;
  });
  tbody.innerHTML = rows.join('');
}

/* ─────────────────────────────────────────────────────────────
   EV INPUT LISTENERS
───────────────────────────────────────────────────────────── */

function wireInputs() {
  const tiagEl  = document.getElementById('tiago-km');
  const atherEl = document.getElementById('ather-km');

  function onTiagoInput() {
    tiagoDrivenKm = parseFloat(tiagEl.value) || 0;
    recalculate();
  }
  function onAtherInput() {
    atherDrivenKm = parseFloat(atherEl.value) || 0;
    recalculate();
  }

  tiagEl.addEventListener('input',  onTiagoInput);
  tiagEl.addEventListener('change', onTiagoInput);
  atherEl.addEventListener('input',  onAtherInput);
  atherEl.addEventListener('change', onAtherInput);

  // --- NEW: Read the HTML defaults instantly on page load ---
  if (tiagEl) tiagoDrivenKm = parseFloat(tiagEl.value) || 0;
  if (atherEl) atherDrivenKm = parseFloat(atherEl.value) || 0;
}

/* ─────────────────────────────────────────────────────────────
   BOOT — fetch JSON → populate everything
───────────────────────────────────────────────────────────── */

async function init() {
  try {
    const res = await fetch(CONFIG.JSON_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${CONFIG.JSON_PATH}`);
    const records = await res.json();

    // Aggregate solar totals
    records.forEach(r => {
      solarTotalSaved += r.solar.inr_saved     || 0;
      solarTotalKwh   += r.solar.kwh_generated || 0;
    });

    // Render chart, table, stats
    buildChart(records);
    buildTable(records);
    wireInputs();
    recalculate();

    // Track successful load
    if (typeof trackEvent === 'function') {
      trackEvent('dashboard_loaded', {
        months: records.length,
        total_solar_inr: Math.round(solarTotalSaved),
      });
    }

  } catch (err) {
    console.error('[Dashboard] Failed to load data:', err);

    // Graceful degradation — show error inside chart wrap
    const wrap = document.querySelector('.chart-wrap');
    if (wrap) {
      wrap.innerHTML = `
        <div style="
          display:flex; flex-direction:column; align-items:center;
          justify-content:center; height:220px; gap:0.5rem;
          font-family:var(--mono); font-size:0.78rem; color:var(--text-dim);
          text-align:center; padding:1rem;">
          <span style="color:#ef4444; font-size:1.1rem;">⚠</span>
          Could not load data from<br>
          <code style="color:var(--cyan); font-size:0.7rem;">${CONFIG.JSON_PATH}</code><br>
          <span style="margin-top:0.5rem;">
            Ensure the JSON file is deployed at the correct path<br>
            and the page is served over HTTP (not file://).
          </span>
        </div>`;
    }

    // Still wire inputs so calculator works
    wireInputs();
    recalculate();
  }
}

// Kick off once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
// ── 5. Update The Hero Summary Card ───────────────────────
  // Calculate EV Energy Consumption (Estimates: Tiago ~120Wh/km, Ather ~35Wh/km)
  const tiagoKwhUsed = tiagoDrivenKm * 0.12;
  const atherKwhUsed = atherDrivenKm * 0.035;
  const totalEvKwhUsed = tiagoKwhUsed + atherKwhUsed;
  
  // Calculate what percentage of EV charging was covered by Solar
  let solarCoveragePct = 0;
  if (totalEvKwhUsed > 0) {
      solarCoveragePct = Math.min((solarTotalKwh / totalEvKwhUsed) * 100, 100);
  }

  // Push to the DOM
  const heroSolarGen = document.getElementById('hero-solar-gen');
  if (heroSolarGen) heroSolarGen.textContent = formatNum(solarTotalKwh) + ' kWh';

  const heroEvKwh = document.getElementById('hero-ev-kwh');
  if (heroEvKwh) heroEvKwh.textContent = formatNum(totalEvKwhUsed) + ' kWh';

  const heroNetSavings = document.getElementById('hero-net-savings');
  if (heroNetSavings) heroNetSavings.textContent = formatINR(grandTotal);

  const heroSolarCoverage = document.getElementById('hero-solar-coverage');
  if (heroSolarCoverage) heroSolarCoverage.textContent = '~' + solarCoveragePct.toFixed(0) + '% of EV usage';
