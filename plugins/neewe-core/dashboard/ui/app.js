// NEEWE Dashboard v1.0 — vanilla JS, zero deps.
// Premium polish: stage tracker, cost sparkline, gates drilldown, i18n, a11y.

(function () {
  'use strict';

  // ── Token handling ──────────────────────────────────────────────────────
  let token = new URLSearchParams(location.search).get('token') || localStorage.getItem('neewe-token');
  if (token) {
    localStorage.setItem('neewe-token', token);
  } else {
    document.body.innerHTML = `
      <div style="padding:48px;max-width:560px;margin:80px auto;font-family:Inter,system-ui,sans-serif;color:#E5E9F0;background:#0E1014;border:1px solid #2A3140;border-radius:14px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#F5A623,#C97F18);border-radius:8px;display:grid;place-items:center;box-shadow:0 0 24px rgba(245,166,35,0.35)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#070A"><path d="M13 4l-7 9h4v7l7-9h-4z"/></svg>
          </div>
          <h1 style="font-size:20px;font-weight:600">NEEWE Dashboard</h1>
        </div>
        <p style="color:#9AA3B2;margin-bottom:16px">Token required. Run:</p>
        <pre style="background:#161A21;padding:16px;border-radius:8px;font-family:JetBrains Mono,monospace;color:#F5A623">neewe-dashboard token</pre>
        <p style="color:#9AA3B2;margin-top:16px;font-size:13px">Token is cached in localStorage after first use.</p>
      </div>`;
    return;
  }
  const authHeaders = { 'X-Token': token };

  // ── i18n (loaded from /api/i18n on init; fallback to inline EN) ─────────
  let STRINGS = { 'en-US': {} };
  let LOCALE = 'en-US';
  function t(key, vars) {
    const bag = STRINGS[LOCALE] || STRINGS['en-US'] || {};
    let s = bag[key];
    if (s == null) s = (STRINGS['en-US'] || {})[key] || key;
    if (vars && typeof s === 'string') {
      s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
    }
    return s;
  }

  function applyTranslations() {
    document.querySelectorAll('[data-key]').forEach((el) => {
      const k = el.getAttribute('data-key');
      const v = t(k);
      if (v && v !== k) el.textContent = v;
    });
  }

  // ── DOM helpers ─────────────────────────────────────────────────────────
  const el = (id) => document.getElementById(id);
  const conn = el('conn-status');
  const connText = el('conn-text');
  const localePill = el('locale-pill');
  const localeText = el('locale-text');

  // ── Renderers ───────────────────────────────────────────────────────────
  const STAGE_MAP = {
    init: 0, bootstrap: 0,
    discovery: 1,
    planning: 2,
    dispatch: 3, dispatching: 3,
    orchestration: 4, orchestrating: 4,
    execution: 5,
    verification: 6, review: 6, release: 6, retro: 6
  };

  function renderStageTracker(state) {
    const phase = String((state && state.phase) || '').toLowerCase();
    const activeIdx = STAGE_MAP[phase] ?? 0;
    document.querySelectorAll('#stages .stage').forEach((node, i) => {
      node.classList.remove('done', 'active');
      if (i < activeIdx) node.classList.add('done');
      if (i === activeIdx) node.classList.add('active');
    });
  }

  function renderState(s) {
    if (!s) return;
    el('state-phase').textContent = s.phase || '—';
    el('state-mode').textContent = s.mode || '—';
    el('state-goal').textContent = s.active_goal || '—';
    el('state-squad').textContent = s.active_squad || '—';
    el('state-perm').textContent = s.permission_mode || '—';
    el('state-style').textContent = s.output_style || '—';
    const r = s.model_routing || {};
    el('route-main').textContent = r.main || '—';
    el('route-sub').textContent = r.subagents || '—';
    if (s.locale && s.locale.user_language) {
      const next = s.locale.user_language;
      if (next !== LOCALE) {
        LOCALE = next;
        localeText.textContent = LOCALE;
        applyTranslations();
      }
    }
    renderStageTracker(s);
  }

  function renderCost(c) {
    if (!c) return;
    const spent = Number(c.spent_usd || 0);
    const cap = Number(c.cap_usd || 0);
    el('cost-spent').textContent = `$${spent.toFixed(2)}`;
    el('cost-cap').textContent = `$${cap.toFixed(2)}`;
    const pct = Number(c.utilization_pct || (cap > 0 ? (spent / cap) * 100 : 0));
    el('cost-util-val').textContent = `${pct.toFixed(1)}%`;
    const utilEl = el('cost-util');
    utilEl.classList.toggle('warn', pct >= 50 && pct < 80);
    utilEl.classList.toggle('crit', pct >= 80);
    const fill = el('cost-bar-fill');
    fill.style.width = Math.min(100, pct) + '%';
    fill.className = 'cost-bar-fill' + (pct >= 80 ? ' crit' : pct >= 50 ? ' warn' : '');
    renderCostTable('cost-by-tool', c.by_tool, 'tool');
    renderCostTable('cost-by-model', c.by_model, 'model');
    renderSparkline(c.history || []);
  }

  function renderCostTable(tableId, rows, keyField) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td style="color:var(--text-muted);font-style:italic">no data</td><td></td></tr>`;
      return;
    }
    for (const r of rows.slice(0, 6)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(r[keyField] || 'unknown')}</td><td>$${Number(r.amount_usd).toFixed(4)}</td>`;
      tbody.appendChild(tr);
    }
  }

  // ── Sparkline (Canvas) ──────────────────────────────────────────────────
  function renderSparkline(history) {
    const canvas = el('cost-sparkline');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (!Array.isArray(history) || history.length === 0) {
      ctx.fillStyle = '#5C6471';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('no cost data yet', w / 2, h / 2);
      return;
    }

    const max = Math.max(...history.map((p) => p.cumulative_usd || 0), 0.001);
    const padX = 8, padY = 8;
    const xs = (i) => padX + ((w - 2 * padX) * i) / Math.max(1, history.length - 1);
    const ys = (v) => h - padY - ((h - 2 * padY) * v) / max;

    // Filled area
    ctx.beginPath();
    ctx.moveTo(xs(0), h - padY);
    history.forEach((p, i) => ctx.lineTo(xs(i), ys(p.cumulative_usd || 0)));
    ctx.lineTo(xs(history.length - 1), h - padY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(245,166,35,0.4)');
    grad.addColorStop(1, 'rgba(245,166,35,0.02)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    history.forEach((p, i) => {
      const x = xs(i), y = ys(p.cumulative_usd || 0);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ── Gates ───────────────────────────────────────────────────────────────
  function verdictClass(v) {
    if (!v) return 'other';
    const passy = /^(PASS|APPROVE|ACCEPT|DONE|READY|RESOLVED)$/i.test(v);
    const faily = /^(FAIL|REJECT|CRITICAL|MISSING|UNPARSEABLE|NOT_READY|BLOCKED)$/i.test(v);
    return passy ? 'pass' : (faily ? 'fail' : 'other');
  }

  function renderGates(gates) {
    const container = el('gates-list');
    const phases = Object.keys(gates || {}).sort();
    if (phases.length === 0) {
      container.innerHTML = '<em style="color:var(--text-muted);font-style:italic">no gate runs yet</em>';
      return;
    }
    container.innerHTML = '';
    for (const phase of phases) {
      const g = gates[phase];
      const v = g.verdicts || {};
      const row = document.createElement('div');
      row.className = 'gate-row';
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      row.dataset.phase = phase;
      row.dataset.detail = JSON.stringify(g);
      row.innerHTML = `
        <span class="phase-label">${escapeHtml(phase)}</span>
        <span class="gate-badge ${verdictClass(v.qa)}"><span class="label">QA</span>${escapeHtml(v.qa || '—')}</span>
        <span class="gate-badge ${verdictClass(v.tech_lead)}"><span class="label">TL</span>${escapeHtml(v.tech_lead || '—')}</span>
        <span class="gate-badge ${verdictClass(v.po)}"><span class="label">PO</span>${escapeHtml(v.po || '—')}</span>
      `;
      row.addEventListener('click', () => openDrilldown(phase, g));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDrilldown(phase, g); }
      });
      container.appendChild(row);
    }
  }

  // ── Drilldown panel ─────────────────────────────────────────────────────
  function openDrilldown(phase, g) {
    const dd = el('drilldown');
    const body = el('drilldown-body');
    const v = g.verdicts || {};
    const dl = Object.entries(v).map(([k, val]) =>
      `<dt>${escapeHtml(k)}</dt><dd class="gate-badge ${verdictClass(val)}">${escapeHtml(val || '—')}</dd>`).join('');
    body.innerHTML = `
      <dl>
        <dt>Stage</dt><dd>${escapeHtml(phase)}</dd>
        <dt>Timestamp</dt><dd>${escapeHtml(g.timestamp || '—')}</dd>
      </dl>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin-bottom:8px">Verdicts</h3>
      <dl>${dl}</dl>
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-dim);margin:16px 0 8px">Log paths</h3>
      <pre>${escapeHtml(JSON.stringify(g.logs || {}, null, 2))}</pre>
    `;
    dd.classList.add('open');
  }

  el('drilldown-close').addEventListener('click', () => el('drilldown').classList.remove('open'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') el('drilldown').classList.remove('open');
  });

  // ── Events ──────────────────────────────────────────────────────────────
  let allEvents = [];
  function renderEvents(events) {
    allEvents = Array.isArray(events) ? events : [];
    drawEvents();
  }

  function drawEvents() {
    const ul = el('event-list');
    const filter = (el('event-filter').value || '').toLowerCase();
    ul.innerHTML = '';
    const filtered = allEvents.slice(-50).reverse().filter((e) =>
      !filter || (e.type || '').toLowerCase().includes(filter) ||
      (e.subject || '').toLowerCase().includes(filter) ||
      (e.ts || '').toLowerCase().includes(filter)
    );
    if (filtered.length === 0) {
      ul.innerHTML = '<li><em style="color:var(--text-muted)">no matching events</em></li>';
      return;
    }
    for (const ev of filtered) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="ev-ts">${escapeHtml(ev.ts || '')}</span>
        <span class="ev-type">${escapeHtml(ev.type || '')}</span>
        <span class="ev-subject">${escapeHtml(ev.subject || '')}</span>
      `;
      ul.appendChild(li);
    }
  }

  el('event-filter').addEventListener('input', drawEvents);

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ── Data loaders ────────────────────────────────────────────────────────
  async function fetchJson(url) {
    try {
      const r = await fetch(url, { headers: authHeaders });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      console.warn('[fetch]', url, err.message);
      return null;
    }
  }

  async function loadI18n() {
    const data = await fetchJson('/api/i18n');
    if (data && data.strings) {
      STRINGS = data.strings;
      LOCALE = data.locale || 'en-US';
      localeText.textContent = LOCALE;
      applyTranslations();
    }
  }

  async function loadAll() {
    const [state, cost, gates, eventsSnap] = await Promise.all([
      fetchJson('/api/state'),
      fetchJson('/api/cost'),
      fetchJson('/api/gates'),
      fetchJson('/api/events-snapshot'),
    ]);
    renderState(state);
    renderCost(cost);
    renderGates(gates);
    renderEvents(eventsSnap?.events || []);
  }

  // ── SSE ─────────────────────────────────────────────────────────────────
  function startSSE() {
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    es.onopen = () => {
      conn.classList.remove('error'); conn.classList.add('live');
      connText.textContent = 'live';
    };
    es.onerror = () => {
      conn.classList.remove('live'); conn.classList.add('error');
      connText.textContent = 'reconnecting…';
    };
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'snapshot') {
          renderState(msg.state);
          renderCost(msg.cost);
        }
      } catch (_) {}
    };
  }

  // ── Settings ────────────────────────────────────────────────────────────
  async function loadSettings() {
    const data = await fetchJson('/api/settings/safe');
    if (!data) return;
    const container = el('settings-fields');
    container.innerHTML = '';
    for (const [key, meta] of Object.entries(data.schema)) {
      const current = data.current[key];
      const wrap = document.createElement('div');
      wrap.className = 'settings-field';
      const label = document.createElement('label');
      label.htmlFor = `setting-${key}`;
      label.textContent = key;
      wrap.appendChild(label);

      let input;
      if (meta.type === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        if (current === true) input.checked = true;
      } else if (meta.type === 'enum') {
        input = document.createElement('select');
        for (const opt of meta.options) {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (current === opt) o.selected = true;
          input.appendChild(o);
        }
      } else {
        input = document.createElement('input');
        input.type = 'text';
        if (current != null) input.value = current;
        if (meta.placeholder) input.placeholder = meta.placeholder;
      }
      input.id = `setting-${key}`;
      input.name = key;
      input.dataset.type = meta.type;
      wrap.appendChild(input);
      container.appendChild(wrap);
    }
  }

  el('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = el('settings-status');
    const fields = document.querySelectorAll('#settings-fields input, #settings-fields select');
    const patch = {};
    for (const f of fields) {
      const tt = f.dataset.type;
      if (tt === 'boolean') patch[f.name] = f.checked;
      else if (tt === 'enum') patch[f.name] = f.value;
      else if (f.value !== '') patch[f.name] = f.value;
    }
    status.textContent = 'saving…';
    try {
      const r = await fetch('/api/settings/safe', {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const res = await r.json();
      if (r.ok) {
        status.style.color = 'var(--ok)';
        status.textContent = `saved → ${res.file}`;
        setTimeout(() => { status.textContent = ''; status.style.color = 'var(--text-dim)'; }, 4000);
      } else {
        status.style.color = 'var(--crit)';
        status.textContent = `error: ${res.error}${res.rejected ? ' (rejected: ' + res.rejected.join(',') + ')' : ''}`;
      }
    } catch (err) {
      status.style.color = 'var(--crit)';
      status.textContent = `network error: ${err.message}`;
    }
  });

  // ── Init ────────────────────────────────────────────────────────────────
  loadI18n().then(loadAll).then(() => {
    loadSettings();
    startSSE();
    setInterval(async () => {
      const [gates, eventsSnap] = await Promise.all([
        fetchJson('/api/gates'),
        fetchJson('/api/events-snapshot'),
      ]);
      renderGates(gates);
      renderEvents(eventsSnap?.events || []);
    }, 10000);
  });
})();
