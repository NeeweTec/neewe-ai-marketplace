// NEEWE Dashboard — vanilla JS client (zero deps; ~150 lines)

(function () {
  'use strict';

  // ── Token handling ───────────────────────────────────────────────────────
  let token = new URLSearchParams(location.search).get('token') || localStorage.getItem('neewe-token');
  if (token) {
    localStorage.setItem('neewe-token', token);
  } else {
    document.body.innerHTML = `
      <div style="padding:40px;font-family:sans-serif;color:#c9d1d9;background:#0e1117;min-height:100vh">
        <h1>NEEWE Dashboard — Token Required</h1>
        <p>The server requires an auth token. Run:</p>
        <pre style="background:#161b22;padding:12px;border-radius:6px">neewe-dashboard token</pre>
        <p>Then open: <code style="background:#161b22;padding:4px 8px">http://127.0.0.1:7878/?token=&lt;token&gt;</code></p>
        <p>The token is stored in localStorage after first use; subsequent visits to / will work without the query param.</p>
      </div>`;
    return;
  }
  const authHeaders = { 'X-Token': token };

  // ── DOM refs ─────────────────────────────────────────────────────────────
  const el = id => document.getElementById(id);
  const conn = el('conn-status');

  // ── Renderers ────────────────────────────────────────────────────────────
  function renderState(s) {
    if (!s) return;
    el('state-phase').textContent = s.phase || '—';
    el('state-mode').textContent = s.mode || '—';
    el('state-goal').textContent = s.active_goal || '—';
    el('state-squad').textContent = s.active_squad || '—';
    el('state-perm').textContent = s.permission_mode || '—';
    el('state-style').textContent = s.output_style || '—';
    el('state-hooks').textContent = s.hook_profile || '—';
    el('state-caveman').textContent = s.caveman_mode || '—';
    const r = s.model_routing || {};
    el('route-main').textContent = r.main || '—';
    el('route-sub').textContent = r.subagents || '—';
    el('route-bg').textContent = r.background || '—';
    el('route-effort').textContent = s.effort || '—';
  }

  function renderCost(c) {
    if (!c) return;
    const spent = Number(c.spent_usd || 0).toFixed(2);
    const cap = Number(c.cap_usd || 0).toFixed(2);
    el('cost-big').textContent = `$${spent} / $${cap}`;
    const pct = Number(c.utilization_pct || 0);
    el('cost-util-val').textContent = `${pct.toFixed(1)}%`;
    const fill = el('cost-bar-fill');
    fill.style.width = Math.min(100, pct) + '%';
    fill.className = 'cost-bar-fill' + (pct >= 80 ? ' crit' : pct >= 50 ? ' warn' : '');
    renderCostTable('cost-by-tool', c.by_tool, 'tool');
    renderCostTable('cost-by-model', c.by_model, 'model');
  }

  function renderCostTable(tableId, rows, keyField) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = '';
    if (!Array.isArray(rows) || rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" style="color:var(--text-dim);font-style:italic">no data</td></tr>`;
      return;
    }
    for (const r of rows.slice(0, 6)) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${r[keyField] || 'unknown'}</td><td>$${Number(r.amount_usd).toFixed(4)}</td>`;
      tbody.appendChild(tr);
    }
  }

  function renderGates(gates) {
    const container = el('gates-content');
    const phases = Object.keys(gates || {}).sort();
    if (phases.length === 0) {
      container.innerHTML = '<em>no gate runs yet</em>';
      return;
    }
    container.innerHTML = '';
    for (const phase of phases) {
      const g = gates[phase];
      const v = g.verdicts || {};
      const row = document.createElement('div');
      row.className = 'gate-row';
      row.innerHTML = `
        <div><strong>${phase}</strong></div>
        <div>QA: <span class="${verdictClass(v.qa)}">${v.qa || '—'}</span></div>
        <div>TL: <span class="${verdictClass(v.tech_lead)}">${v.tech_lead || '—'}</span></div>
        <div>PO: <span class="${verdictClass(v.po)}">${v.po || '—'}</span></div>
      `;
      container.appendChild(row);
    }
  }

  function verdictClass(v) {
    if (!v) return 'verdict-other';
    const passy = /^(PASS|APPROVE|ACCEPT|DONE|READY|RESOLVED)$/.test(v);
    const faily = /^(FAIL|REJECT|CRITICAL|MISSING|UNPARSEABLE|NOT_READY|BLOCKED)$/.test(v);
    return passy ? 'verdict-pass' : (faily ? 'verdict-fail' : 'verdict-other');
  }

  function renderEvents(events) {
    const ul = el('event-list');
    ul.innerHTML = '';
    if (!Array.isArray(events) || events.length === 0) {
      ul.innerHTML = '<li><em>no events yet</em></li>';
      return;
    }
    for (const ev of events.slice(-30).reverse()) {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="ev-ts">${ev.ts}</span>
        <span class="ev-type">${ev.type}</span>
        <span class="ev-subject">${ev.subject || ''}</span>
      `;
      ul.appendChild(li);
    }
  }

  // ── Data loaders ─────────────────────────────────────────────────────────
  async function fetchJson(url) {
    try {
      const r = await fetch(url, { headers: authHeaders });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (err) {
      console.warn('[fetch fail]', url, err.message);
      return null;
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

  // ── SSE for live snapshots ───────────────────────────────────────────────
  function startSSE() {
    const es = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
    es.onopen = () => { conn.textContent = '● live'; conn.className = 'conn live'; };
    es.onerror = () => {
      conn.textContent = '⚠ reconnecting…';
      conn.className = 'conn error';
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

  // ── Settings panel (EP-OPUS-13 Settings PATCH) ───────────────────────────
  async function loadSettings() {
    const data = await fetchJson('/api/settings/safe');
    if (!data) return;
    const container = el('settings-fields');
    container.innerHTML = '';
    for (const [key, meta] of Object.entries(data.schema)) {
      const current = data.current[key];
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:grid;grid-template-columns:200px 1fr;gap:8px;align-items:center;margin-bottom:6px';
      const label = document.createElement('label');
      label.textContent = key;
      label.style.cssText = 'font-family:var(--mono);font-size:12px;color:var(--text-dim)';
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
      input.name = key;
      input.dataset.type = meta.type;
      input.style.cssText = 'background:var(--bg-elevated);color:var(--text);border:1px solid var(--border);padding:6px 10px;border-radius:4px;font:inherit;font-family:var(--mono)';
      wrap.appendChild(input);
      container.appendChild(wrap);
    }
    const note = document.createElement('div');
    note.style.cssText = 'margin-top:10px;color:var(--text-dim);font-size:11px';
    note.innerHTML = `<strong>File:</strong> <code>${data.file}</code><br><em>${data.note}</em>`;
    container.appendChild(note);
  }

  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const status = document.getElementById('settings-status');
    const fields = document.querySelectorAll('#settings-fields input, #settings-fields select');
    const patch = {};
    for (const f of fields) {
      const t = f.dataset.type;
      if (t === 'boolean') patch[f.name] = f.checked;
      else if (t === 'enum') patch[f.name] = f.value;
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
        status.style.color = 'var(--good)';
        status.textContent = `saved → ${res.file}`;
        setTimeout(() => { status.textContent = ''; status.style.color = 'var(--text-dim)'; }, 4000);
      } else {
        status.style.color = 'var(--bad)';
        status.textContent = `error: ${res.error}${res.rejected ? ' (rejected: ' + res.rejected.join(',') + ')' : ''}`;
      }
    } catch (err) {
      status.style.color = 'var(--bad)';
      status.textContent = `network error: ${err.message}`;
    }
  });

  // ── Init ─────────────────────────────────────────────────────────────────
  loadAll();
  loadSettings();
  startSSE();
  // Refresh gates + events every 10s (lower-frequency than SSE).
  setInterval(async () => {
    const [gates, eventsSnap] = await Promise.all([
      fetchJson('/api/gates'),
      fetchJson('/api/events-snapshot'),
    ]);
    renderGates(gates);
    renderEvents(eventsSnap?.events || []);
  }, 10000);
})();
