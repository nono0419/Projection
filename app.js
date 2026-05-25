/* =========================================================
 * Projections F&B - Stade FC Sion
 * Modèle de calcul + UI interactive
 * ========================================================= */

const COGS_RATIO = { A: 0.30, B: 0.32, C: 0.35, D: 0.22, Merch: 0.50 };

// Saisonnalité (Super League : pause hivernale décembre/janvier réduite)
const MONTHLY_DIST = {
  Aug: 0.10, Sep: 0.13, Oct: 0.13, Nov: 0.13, Dec: 0.05,
  Jan: 0.03, Fev: 0.10, Mar: 0.13, Avr: 0.10, Mai: 0.10
};
const MONTH_LABELS = ["Août","Sept","Oct","Nov","Déc","Jan","Fév","Mars","Avr","Mai"];
const MONTH_KEYS = Object.keys(MONTHLY_DIST);

const fmt = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 0 });
const fmt2 = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 2 });
const fmtPct = new Intl.NumberFormat("fr-CH", { maximumFractionDigits: 1, style: "percent" });

/* ---------- État global ---------- */
const state = {
  hyp: {
    capacite: 15000,
    remplissage: 0.75,
    matchs: 17,
    staffPct: 0.18,
    chargesFixes: 650000,
    marketingPct: 0.03,
  },
  captures: {},          // id -> taux (0..1)
  filter: "ALL",
  charts: {},
};

/* ---------- Init capture par défaut ---------- */
OUTLETS_DATA.outlets.forEach(o => {
  state.captures[o.id] = CAPTURE_DEFAULT[o.id] ?? 0.03;
});

/* ---------- Helpers ---------- */
function panierMoyen(outlet) {
  if (outlet.categorie === "Merch") return PANIER_DEFAULT_MERCH;
  const prix = outlet.items.map(i => i.prix).filter(p => typeof p === "number" && p > 0);
  if (!prix.length) return 0;
  return prix.reduce((s, p) => s + p, 0) / prix.length;
}

function spectateursParMatch() {
  return state.hyp.capacite * state.hyp.remplissage;
}

function computeOutletMetrics(o) {
  const spectMatch = spectateursParMatch();
  const capture = state.captures[o.id] ?? 0;
  const panier = panierMoyen(o);
  const actesMatch = spectMatch * capture;
  const caMatch = actesMatch * panier;
  const caSaison = caMatch * state.hyp.matchs;
  const cogs = caSaison * (COGS_RATIO[o.categorie] ?? 0.30);
  const margeBrute = caSaison - cogs;
  return { capture, panier, actesMatch, caMatch, caSaison, cogs, margeBrute };
}

function computeAll() {
  const rows = OUTLETS_DATA.outlets.map(o => {
    const m = computeOutletMetrics(o);
    return { outlet: o, ...m };
  });

  const totals = {
    caSaison: 0, cogs: 0, margeBrute: 0, actesMatch: 0,
    parCategorie: { A: 0, B: 0, C: 0, D: 0, Merch: 0 },
    margeParCategorie: { A: 0, B: 0, C: 0, D: 0, Merch: 0 },
  };
  rows.forEach(r => {
    totals.caSaison += r.caSaison;
    totals.cogs += r.cogs;
    totals.margeBrute += r.margeBrute;
    totals.actesMatch += r.actesMatch;
    totals.parCategorie[r.outlet.categorie] += r.caSaison;
    totals.margeParCategorie[r.outlet.categorie] += r.margeBrute;
  });

  const staff = totals.caSaison * state.hyp.staffPct;
  const marketing = totals.caSaison * state.hyp.marketingPct;
  const chargesFixes = state.hyp.chargesFixes;
  const ebitda = totals.margeBrute - staff - marketing - chargesFixes;

  return { rows, totals, staff, marketing, chargesFixes, ebitda };
}

/* ---------- Rendu KPIs ---------- */
function renderKPIs(model) {
  const { totals, ebitda } = model;
  const caMatch = state.hyp.matchs ? totals.caSaison / state.hyp.matchs : 0;
  const spectMatch = spectateursParMatch();
  const panierPond = totals.actesMatch ? caMatch / totals.actesMatch : 0;

  document.getElementById("kpi-ca").textContent = fmt.format(totals.caSaison) + " CHF";
  document.getElementById("kpi-ca-match").textContent = fmt.format(caMatch) + " CHF / match";

  document.getElementById("kpi-mb").textContent = fmt.format(totals.margeBrute) + " CHF";
  document.getElementById("kpi-mb-pct").textContent =
    (totals.caSaison ? fmtPct.format(totals.margeBrute / totals.caSaison) : "—") + " du CA";

  const ebitdaEl = document.getElementById("kpi-ebitda");
  ebitdaEl.textContent = fmt.format(ebitda) + " CHF";
  ebitdaEl.parentElement.classList.toggle("good", ebitda >= 0);
  ebitdaEl.parentElement.classList.toggle("bad", ebitda < 0);
  document.getElementById("kpi-ebitda-pct").textContent =
    (totals.caSaison ? fmtPct.format(ebitda / totals.caSaison) : "—") + " du CA";

  document.getElementById("kpi-panier").textContent = fmt2.format(panierPond) + " CHF";
  document.getElementById("kpi-spec-actifs").textContent =
    fmt.format(totals.actesMatch) + " actes d'achat / match";

  document.getElementById("kpi-ca-spec").textContent =
    (spectMatch ? fmt2.format(caMatch / spectMatch) : "—") + " CHF";
}

/* ---------- Rendu filtres catégorie ---------- */
function renderFilters() {
  const wrap = document.getElementById("filters");
  const cats = [["ALL", "Tous", null], ...Object.entries(CATEGORIES).map(([k,v]) => [k, v.label, v.color])];
  wrap.innerHTML = cats.map(([k, label, color]) => `
    <span class="chip ${state.filter === k ? "active" : ""}" data-cat="${k}">
      ${color ? `<span class="dot" style="background:${color}"></span>` : ""}
      ${label}
    </span>
  `).join("");
  wrap.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.cat;
      renderAll();
    });
  });
}

/* ---------- Rendu table outlets ---------- */
function renderOutletsTable(model) {
  const tbody = document.getElementById("outlets-tbody");
  const visible = model.rows.filter(r => state.filter === "ALL" || r.outlet.categorie === state.filter);

  tbody.innerHTML = visible.map(r => {
    const cat = CATEGORIES[r.outlet.categorie];
    return `
      <tr>
        <td>
          <div class="outlet-name">${r.outlet.nom}</div>
          <div class="outlet-niveau">${r.outlet.niveau}</div>
        </td>
        <td>
          <span class="cat-tag" style="background:${cat.color}">${r.outlet.categorie}</span>
        </td>
        <td class="num">${fmt2.format(r.panier)}</td>
        <td class="num">
          <input type="number" class="capture-input" step="0.1" min="0" max="100"
                 data-id="${r.outlet.id}" value="${(r.capture * 100).toFixed(1)}" />
        </td>
        <td class="num">${fmt.format(r.actesMatch)}</td>
        <td class="num">${fmt.format(r.caMatch)}</td>
        <td class="num"><strong>${fmt.format(r.caSaison)}</strong></td>
        <td class="num">${fmt.format(r.margeBrute)}</td>
      </tr>
    `;
  }).join("");

  // Totaux visibles
  const tCA = visible.reduce((s, r) => s + r.caSaison, 0);
  const tMB = visible.reduce((s, r) => s + r.margeBrute, 0);
  const tActes = visible.reduce((s, r) => s + r.actesMatch, 0);
  const tCAMatch = visible.reduce((s, r) => s + r.caMatch, 0);
  document.getElementById("outlets-tfoot").innerHTML = `
    <tr class="totals-row">
      <td><div class="lbl">TOTAL</div>${state.filter === "ALL" ? "Tous outlets" : CATEGORIES[state.filter].label}</td>
      <td></td>
      <td></td>
      <td></td>
      <td class="num">${fmt.format(tActes)}</td>
      <td class="num">${fmt.format(tCAMatch)}</td>
      <td class="num">${fmt.format(tCA)}</td>
      <td class="num">${fmt.format(tMB)}</td>
    </tr>
  `;

  // Listeners capture
  tbody.querySelectorAll(".capture-input").forEach(input => {
    input.addEventListener("input", e => {
      const id = e.target.dataset.id;
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        state.captures[id] = val / 100;
        renderAll({ skipTableRows: true });
      }
    });
  });
}

/* ---------- Rendu P&L ---------- */
function renderPnL(model) {
  const { totals, staff, marketing, chargesFixes, ebitda } = model;
  const ca = totals.caSaison;
  const p = (v) => ca ? fmtPct.format(v / ca) : "—";
  const html = `
    <tbody>
      <tr><td class="lbl">Chiffre d'affaires - Bars &amp; boissons</td>
          <td class="val">${fmt.format(totals.parCategorie.D)}</td>
          <td class="pct">${p(totals.parCategorie.D)}</td></tr>
      <tr><td class="lbl">Chiffre d'affaires - Standards populaires</td>
          <td class="val">${fmt.format(totals.parCategorie.A)}</td>
          <td class="pct">${p(totals.parCategorie.A)}</td></tr>
      <tr><td class="lbl">Chiffre d'affaires - Saveurs internationales</td>
          <td class="val">${fmt.format(totals.parCategorie.B)}</td>
          <td class="pct">${p(totals.parCategorie.B)}</td></tr>
      <tr><td class="lbl">Chiffre d'affaires - Identité valaisanne</td>
          <td class="val">${fmt.format(totals.parCategorie.C)}</td>
          <td class="pct">${p(totals.parCategorie.C)}</td></tr>
      <tr><td class="lbl">Chiffre d'affaires - Merchandising</td>
          <td class="val">${fmt.format(totals.parCategorie.Merch)}</td>
          <td class="pct">${p(totals.parCategorie.Merch)}</td></tr>
      <tr class="subtotal"><td>Total chiffre d'affaires</td>
          <td class="val">${fmt.format(ca)}</td>
          <td class="pct">100%</td></tr>
      <tr><td class="lbl">Coût des marchandises (COGS)</td>
          <td class="val">- ${fmt.format(totals.cogs)}</td>
          <td class="pct">${p(totals.cogs)}</td></tr>
      <tr class="subtotal"><td>Marge brute</td>
          <td class="val">${fmt.format(totals.margeBrute)}</td>
          <td class="pct">${p(totals.margeBrute)}</td></tr>
      <tr><td class="lbl">Masse salariale</td>
          <td class="val">- ${fmt.format(staff)}</td>
          <td class="pct">${p(staff)}</td></tr>
      <tr><td class="lbl">Marketing &amp; communication</td>
          <td class="val">- ${fmt.format(marketing)}</td>
          <td class="pct">${p(marketing)}</td></tr>
      <tr><td class="lbl">Charges fixes (concession, énergie, maintenance)</td>
          <td class="val">- ${fmt.format(chargesFixes)}</td>
          <td class="pct">${p(chargesFixes)}</td></tr>
      <tr class="total"><td>EBITDA</td>
          <td class="val">${fmt.format(ebitda)}</td>
          <td class="pct">${p(ebitda)}</td></tr>
    </tbody>
  `;
  document.getElementById("pnl-table").innerHTML = html;
}

/* ---------- Graphiques ---------- */
function destroyChart(key) {
  if (state.charts[key]) {
    state.charts[key].destroy();
    delete state.charts[key];
  }
}

function renderCharts(model) {
  // 1. Donut par catégorie
  destroyChart("cat");
  const catLabels = Object.keys(CATEGORIES);
  const catData = catLabels.map(c => model.totals.parCategorie[c] || 0);
  const catColors = catLabels.map(c => CATEGORIES[c].color);
  state.charts.cat = new Chart(document.getElementById("chart-cat"), {
    type: "doughnut",
    data: {
      labels: catLabels.map(c => CATEGORIES[c].label),
      datasets: [{ data: catData, backgroundColor: catColors, borderWidth: 2, borderColor: "#fff" }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${fmt.format(ctx.parsed)} CHF (${fmtPct.format(ctx.parsed / model.totals.caSaison)})`
          }
        }
      }
    }
  });

  // 2. Marge par catégorie (bar)
  destroyChart("margin");
  state.charts.margin = new Chart(document.getElementById("chart-margin"), {
    type: "bar",
    data: {
      labels: catLabels.map(c => CATEGORIES[c].label),
      datasets: [{
        label: "Marge brute",
        data: catLabels.map(c => model.totals.margeParCategorie[c] || 0),
        backgroundColor: catColors,
        borderRadius: 6,
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (ctx) => fmt.format(ctx.parsed.y) + " CHF" }
      }},
      scales: {
        y: { ticks: { callback: (v) => fmt.format(v) + " CHF" } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  });

  // 3. Top outlets (bar horizontal)
  destroyChart("top");
  const top = [...model.rows].sort((a, b) => b.caSaison - a.caSaison).slice(0, 15);
  state.charts.top = new Chart(document.getElementById("chart-top"), {
    type: "bar",
    data: {
      labels: top.map(r => r.outlet.nom),
      datasets: [{
        label: "CA saison",
        data: top.map(r => r.caSaison),
        backgroundColor: top.map(r => CATEGORIES[r.outlet.categorie].color),
        borderRadius: 5,
      }]
    },
    options: {
      indexAxis: "y",
      maintainAspectRatio: false,
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => fmt.format(ctx.parsed.x) + " CHF" } }
      },
      scales: {
        x: { ticks: { callback: (v) => fmt.format(v) } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });

  // 4. Évolution mensuelle (line + area)
  destroyChart("monthly");
  const ca = model.totals.caSaison;
  const monthlyCA = MONTH_KEYS.map(k => ca * MONTHLY_DIST[k]);
  const monthlyMB = monthlyCA.map(v => v * (ca ? model.totals.margeBrute / ca : 0));
  state.charts.monthly = new Chart(document.getElementById("chart-monthly"), {
    type: "line",
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Chiffre d'affaires",
          data: monthlyCA,
          borderColor: "#c8102e",
          backgroundColor: "rgba(200, 16, 46, 0.12)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#c8102e",
          pointRadius: 4,
        },
        {
          label: "Marge brute",
          data: monthlyMB,
          borderColor: "#2C4960",
          backgroundColor: "rgba(44, 73, 96, 0.06)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#2C4960",
          pointRadius: 4,
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt.format(ctx.parsed.y)} CHF` } }
      },
      scales: {
        y: { ticks: { callback: (v) => fmt.format(v) + " CHF" }, beginAtZero: true }
      }
    }
  });
}

/* ---------- Render orchestrator ---------- */
function renderAll(opts = {}) {
  const model = computeAll();
  renderKPIs(model);
  renderPnL(model);
  renderCharts(model);
  if (!opts.skipTableRows) {
    renderFilters();
    renderOutletsTable(model);
  } else {
    // recalc totals row only without re-rendering inputs (preserves focus)
    const tCA = model.rows
      .filter(r => state.filter === "ALL" || r.outlet.categorie === state.filter)
      .reduce((s, r) => s + r.caSaison, 0);
    const tMB = model.rows
      .filter(r => state.filter === "ALL" || r.outlet.categorie === state.filter)
      .reduce((s, r) => s + r.margeBrute, 0);
    const tActes = model.rows
      .filter(r => state.filter === "ALL" || r.outlet.categorie === state.filter)
      .reduce((s, r) => s + r.actesMatch, 0);
    const tCAMatch = model.rows
      .filter(r => state.filter === "ALL" || r.outlet.categorie === state.filter)
      .reduce((s, r) => s + r.caMatch, 0);
    document.getElementById("outlets-tfoot").innerHTML = `
      <tr class="totals-row">
        <td><div class="lbl">TOTAL</div>${state.filter === "ALL" ? "Tous outlets" : CATEGORIES[state.filter].label}</td>
        <td></td><td></td><td></td>
        <td class="num">${fmt.format(tActes)}</td>
        <td class="num">${fmt.format(tCAMatch)}</td>
        <td class="num">${fmt.format(tCA)}</td>
        <td class="num">${fmt.format(tMB)}</td>
      </tr>
    `;
    // Update read-only cells of each row (CA match / saison / marge / actes) without touching the input
    document.querySelectorAll("#outlets-tbody tr").forEach((tr, i) => {
      const id = tr.querySelector(".capture-input")?.dataset.id;
      if (!id) return;
      const row = model.rows.find(r => r.outlet.id === id);
      if (!row) return;
      const cells = tr.querySelectorAll("td");
      cells[4].textContent = fmt.format(row.actesMatch);
      cells[5].textContent = fmt.format(row.caMatch);
      cells[6].innerHTML = `<strong>${fmt.format(row.caSaison)}</strong>`;
      cells[7].textContent = fmt.format(row.margeBrute);
    });
  }
}

/* ---------- Bind hypothèses ---------- */
function bindHypotheses() {
  const map = [
    ["hyp-capacite", "capacite", v => v],
    ["hyp-remplissage", "remplissage", v => v / 100],
    ["hyp-matchs", "matchs", v => v],
    ["hyp-staff", "staffPct", v => v / 100],
    ["hyp-charges", "chargesFixes", v => v],
    ["hyp-marketing", "marketingPct", v => v / 100],
  ];
  map.forEach(([elId, key, conv]) => {
    document.getElementById(elId).addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v >= 0) {
        state.hyp[key] = conv(v);
        renderAll();
      }
    });
  });
}

/* ---------- Actions ---------- */
function bindActions() {
  document.getElementById("btn-reset").addEventListener("click", () => {
    OUTLETS_DATA.outlets.forEach(o => {
      state.captures[o.id] = CAPTURE_DEFAULT[o.id] ?? 0.03;
    });
    renderAll();
  });

  document.getElementById("btn-export").addEventListener("click", () => {
    const model = computeAll();
    const headers = ["Outlet","Categorie","Niveau","PanierMoyen","Capture%","ActesMatch","CAMatch","CASaison","COGS","MargeBrute"];
    const lines = [headers.join(";")];
    model.rows.forEach(r => {
      lines.push([
        `"${r.outlet.nom}"`,
        r.outlet.categorie,
        `"${r.outlet.niveau}"`,
        r.panier.toFixed(2),
        (r.capture * 100).toFixed(2),
        r.actesMatch.toFixed(0),
        r.caMatch.toFixed(0),
        r.caSaison.toFixed(0),
        r.cogs.toFixed(0),
        r.margeBrute.toFixed(0),
      ].join(";"));
    });
    const csv = "﻿" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "projections-fb-stade-fc-sion.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  bindHypotheses();
  bindActions();
  renderAll();
});
