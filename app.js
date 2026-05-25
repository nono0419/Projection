/* =========================================================
 * Projections F&B - Stade FC Sion
 * Modèle de calcul + UI interactive
 * ========================================================= */

const COGS_RATIO = { A: 0.32, B: 0.35, C: 0.38, D: 0.25 };

// Fourchettes de référence du rapport de conseil Cervin Coliseum
const REF = {
  matchday:    { min: 1_150_000, max: 2_200_000, label: "1,15 - 2,20 M" },
  hospitality: { min:   700_000, max:   750_000, label: "0,70 - 0,75 M" },
  concerts:    { min:   860_000, max: 1_800_000, label: "0,86 - 1,80 M" },
  rentals:     { min:   950_000, max: 1_850_000, label: "0,95 - 1,85 M" },
  totalCA:     { min: 3_660_000, max: 6_600_000, label: "3,66 - 6,60 M" },
  caPerSpec:   { min: 21,        max: 26,        label: "21 - 26 CHF" },
  marge:       { min: 0.32,      max: 0.40,      label: "32 - 40 %" },
};

// Scénarios pré-calibrés (les chiffres tombent dans les fourchettes REF ci-dessus)
const SCENARIOS = {
  conservative: {
    label: "Conservateur",
    hyp: {
      capPopulaire: 14743, capVIP: 1931, capVVIP: 1080,
      remplissageGA: 0.55, remplissagePremium: 0.60,
      matchs: 22,
      panierVIP: 14, panierVVIP: 26,
      restauCouverts: 180, restauPanier: 95, restauRemplissage: 0.55,
      nbConcerts: 5, concertJauge: 17000, concertPanier: 11,
      nbEventsCorpo: 175, panierEventCorpo: 6000,
      staffPct: 0.18, marketingPct: 0.03, chargesFixes: 650000,
    },
    captureMultiplier: 1.0,
  },
  ambitious: {
    label: "Ambitieux",
    hyp: {
      capPopulaire: 14743, capVIP: 1931, capVVIP: 1080,
      remplissageGA: 0.68, remplissagePremium: 0.75,
      matchs: 25,
      panierVIP: 10, panierVVIP: 19,
      restauCouverts: 180, restauPanier: 95, restauRemplissage: 0.55,
      nbConcerts: 8, concertJauge: 21000, concertPanier: 10,
      nbEventsCorpo: 200, panierEventCorpo: 9250,
      staffPct: 0.15, marketingPct: 0.045, chargesFixes: 700000,
    },
    captureMultiplier: 1.0,
  },
};

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
    capPopulaire: 14743,
    capVIP: 1931,
    capVVIP: 1080,
    remplissageGA: 0.55,        // ~8 100 spectateurs GA (cible rapport: 7 820-9 500)
    remplissagePremium: 0.60,   // taux d'occupation moyen des loges premium
    matchs: 22,
    staffPct: 0.18,
    chargesFixes: 650000,
    marketingPct: 0.03,
    // Hospitality (forfaits F&B add-on par place occupée)
    panierVIP: 14,
    panierVVIP: 26,
    // Restaurant gastro Niv. 6 (compté dans matchday)
    restauCouverts: 180,
    restauPanier: 95,
    restauRemplissage: 0.55,
    // Concerts (5-8 / an, 0,86-1,80 M)
    nbConcerts: 5,
    concertJauge: 17000,
    concertPanier: 11,
    // Rentals + C&E (175-200 events / an, 0,95-1,85 M)
    nbEventsCorpo: 175,
    panierEventCorpo: 6000,
  },
  captures: {},
  filter: "ALL",
  charts: {},
  scenario: "conservative",
};

let isApplyingScenario = false;

const COGS_ANNEXES = { vip: 0.30, vvip: 0.30, restau: 0.32, concerts: 0.28, corpo: 0.28 };

/* ---------- Init capture par défaut ---------- */
OUTLETS_DATA.outlets.forEach(o => {
  state.captures[o.id] = CAPTURE_DEFAULT[o.id] ?? 0.03;
});

/* ---------- Helpers ---------- */
function panierMoyen(outlet) {
  const prix = outlet.items.map(i => i.prix).filter(p => typeof p === "number" && p > 0);
  if (!prix.length) return 0;
  return prix.reduce((s, p) => s + p, 0) / prix.length;
}

function spectateursParMatch() {
  return state.hyp.capPopulaire * state.hyp.remplissageGA;
}

function compareRef(value, ref) {
  if (!ref) return { status: "neutral", icon: "" };
  if (value >= ref.min && value <= ref.max) return { status: "ok", icon: "✓" };
  if (value < ref.min) return { status: "low", icon: "↓" };
  return { status: "high", icon: "↑" };
}

function computeAnnexes() {
  const h = state.hyp;
  // Hospitality : forfaits F&B add-on par place occupée (en sus du pack saison)
  const caVIP = h.capVIP * h.remplissagePremium * h.panierVIP * h.matchs;
  const caVVIP = h.capVVIP * h.remplissagePremium * h.panierVVIP * h.matchs;
  // Restaurant gastro Niv. 6 : couverts servis × ticket × matchs
  const caRestau = h.restauCouverts * h.restauRemplissage * h.restauPanier * h.matchs;
  // Concerts
  const caConcerts = h.nbConcerts * h.concertJauge * h.concertPanier;
  // Rentals + C&E (séminaires, mariages, conférences, journées corporate)
  const caCorpo = h.nbEventsCorpo * h.panierEventCorpo;

  const cogsVIP = caVIP * COGS_ANNEXES.vip;
  const cogsVVIP = caVVIP * COGS_ANNEXES.vvip;
  const cogsRestau = caRestau * COGS_ANNEXES.restau;
  const cogsConcerts = caConcerts * COGS_ANNEXES.concerts;
  const cogsCorpo = caCorpo * COGS_ANNEXES.corpo;

  const totalCA = caVIP + caVVIP + caRestau + caConcerts + caCorpo;
  const totalCOGS = cogsVIP + cogsVVIP + cogsRestau + cogsConcerts + cogsCorpo;
  return {
    items: [
      { key: "vip",      label: "Hospitality VIP (Niv. 1-2)",      ca: caVIP,      cogs: cogsVIP },
      { key: "vvip",     label: "Hospitality VVIP (Niv. 3-5)",     ca: caVVIP,     cogs: cogsVVIP },
      { key: "restau",   label: "Restaurant gastro Niv. 6 (matchday)", ca: caRestau, cogs: cogsRestau },
      { key: "concerts", label: `Concerts (${h.nbConcerts} événements)`, ca: caConcerts, cogs: cogsConcerts },
      { key: "corpo",    label: `Rentals & C&E (${h.nbEventsCorpo} events)`, ca: caCorpo,   cogs: cogsCorpo },
    ],
    caVIP, caVVIP, caHospitality: caVIP + caVVIP,
    caRestau, caConcerts, caCorpo,
    totalCA, totalCOGS, margeBrute: totalCA - totalCOGS,
  };
}

function computeOutletMetrics(o) {
  const spectMatch = spectateursParMatch();
  const capture = state.captures[o.id] ?? 0;
  const panier = panierMoyen(o);
  const actesMatch = spectMatch * capture;
  const caMatch = actesMatch * panier;
  const caSaison = caMatch * state.hyp.matchs;
  const cogs = caSaison * (COGS_RATIO[o.categorie] ?? 0.32);
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
    parCategorie: { A: 0, B: 0, C: 0, D: 0 },
    margeParCategorie: { A: 0, B: 0, C: 0, D: 0 },
  };
  rows.forEach(r => {
    totals.caSaison += r.caSaison;
    totals.cogs += r.cogs;
    totals.margeBrute += r.margeBrute;
    totals.actesMatch += r.actesMatch;
    if (totals.parCategorie[r.outlet.categorie] !== undefined) {
      totals.parCategorie[r.outlet.categorie] += r.caSaison;
      totals.margeParCategorie[r.outlet.categorie] += r.margeBrute;
    }
  });

  const annexes = computeAnnexes();

  // Regroupements alignés sur les lignes du rapport Cervin Coliseum
  const caMatchday = totals.caSaison + annexes.caRestau;  // outlets + restau matchday
  const caHospitality = annexes.caHospitality;
  const caConcerts = annexes.caConcerts;
  const caCorpo = annexes.caCorpo;

  const caGlobal = totals.caSaison + annexes.totalCA;
  const cogsGlobal = totals.cogs + annexes.totalCOGS;
  const margeBruteGlobale = totals.margeBrute + annexes.margeBrute;

  const staff = caGlobal * state.hyp.staffPct;
  const marketing = caGlobal * state.hyp.marketingPct;
  const chargesFixes = state.hyp.chargesFixes;
  const ebitda = margeBruteGlobale - staff - marketing - chargesFixes;

  // CA F&B par spectateur GA (référence rapport: 21-26 CHF)
  const gaSpectateurMatchs = spectateursParMatch() * state.hyp.matchs;
  const caPerSpec = gaSpectateurMatchs ? caGlobal / gaSpectateurMatchs : 0;
  const margeOp = caGlobal ? ebitda / caGlobal : 0;

  return { rows, totals, annexes, caGlobal, cogsGlobal, margeBruteGlobale,
           caMatchday, caHospitality, caConcerts, caCorpo,
           caPerSpec, margeOp, gaSpectateurMatchs,
           staff, marketing, chargesFixes, ebitda };
}

/* ---------- Rendu KPIs ---------- */
function refBadge(value, ref) {
  const cmp = compareRef(value, ref);
  const colors = { ok: "#2e8b57", low: "#c0392b", high: "#c0392b", neutral: "#8a93a5" };
  return `<span style="color:${colors[cmp.status]};font-weight:700;">${cmp.icon}</span>
          <span style="color:#8a93a5;font-size:11px;">réf ${ref.label}</span>`;
}

function renderKPIs(model) {
  const { totals, annexes, caGlobal, margeBruteGlobale, ebitda, caPerSpec, margeOp } = model;

  document.getElementById("kpi-ca").textContent = fmt.format(caGlobal) + " CHF";
  document.getElementById("kpi-ca-match").innerHTML = refBadge(caGlobal, REF.totalCA);

  document.getElementById("kpi-mb").textContent = fmt.format(margeBruteGlobale) + " CHF";
  document.getElementById("kpi-mb-pct").textContent =
    (caGlobal ? fmtPct.format(margeBruteGlobale / caGlobal) : "—") + " sur coût matière";

  const ebitdaEl = document.getElementById("kpi-ebitda");
  ebitdaEl.textContent = fmt.format(ebitda) + " CHF";
  ebitdaEl.parentElement.classList.toggle("good", ebitda >= 0);
  ebitdaEl.parentElement.classList.toggle("bad", ebitda < 0);
  document.getElementById("kpi-ebitda-pct").innerHTML =
    (caGlobal ? fmtPct.format(margeOp) : "—") + " marge opérationnelle &nbsp; " +
    refBadge(margeOp, REF.marge);

  document.getElementById("kpi-panier").textContent = fmt2.format(caPerSpec) + " CHF";
  document.getElementById("kpi-spec-actifs").innerHTML =
    "CA F&amp;B / spectateur GA &nbsp; " + refBadge(caPerSpec, REF.caPerSpec);

  document.getElementById("kpi-ca-spec").textContent = fmt.format(totals.actesMatch);
  document.getElementById("kpi-ca-spec").nextElementSibling &&
    (document.getElementById("kpi-ca-spec").nextElementSibling.textContent = "actes d'achat / match (outlets)");
}

/* ---------- Rendu annexes table ---------- */
function renderAnnexes(model) {
  const { annexes } = model;
  const html = `
    <thead>
      <tr>
        <th style="text-align:left;padding:9px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-mute);border-bottom:1px solid var(--border);">Source</th>
        <th style="text-align:right;padding:9px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-mute);border-bottom:1px solid var(--border);">CA saison</th>
        <th style="text-align:right;padding:9px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-mute);border-bottom:1px solid var(--border);">COGS</th>
        <th style="text-align:right;padding:9px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-mute);border-bottom:1px solid var(--border);">Marge brute</th>
        <th style="text-align:right;padding:9px 14px;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:var(--text-mute);border-bottom:1px solid var(--border);">% du CA annexe</th>
      </tr>
    </thead>
    <tbody>
      ${annexes.items.map(i => `
        <tr>
          <td class="lbl">${i.label}</td>
          <td class="val">${fmt.format(i.ca)}</td>
          <td class="val">- ${fmt.format(i.cogs)}</td>
          <td class="val">${fmt.format(i.ca - i.cogs)}</td>
          <td class="pct">${annexes.totalCA ? fmtPct.format(i.ca / annexes.totalCA) : "—"}</td>
        </tr>
      `).join("")}
      <tr class="subtotal">
        <td>Total annexes</td>
        <td class="val">${fmt.format(annexes.totalCA)}</td>
        <td class="val">- ${fmt.format(annexes.totalCOGS)}</td>
        <td class="val">${fmt.format(annexes.margeBrute)}</td>
        <td class="pct">100%</td>
      </tr>
    </tbody>
  `;
  document.getElementById("annexes-table").innerHTML = html;
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
        markCustomIfNeeded();
        renderAll({ skipTableRows: true });
      }
    });
  });
}

/* ---------- Rendu P&L ---------- */
function refCell(value, ref) {
  if (!ref) return "";
  const cmp = compareRef(value, ref);
  const colors = { ok: "#2e8b57", low: "#c0392b", high: "#c0392b" };
  return `<span style="color:${colors[cmp.status]};font-weight:700;margin-right:4px;">${cmp.icon}</span><span style="color:#8a93a5;font-size:11px;">réf ${ref.label}</span>`;
}

function renderPnL(model) {
  const { totals, annexes, caGlobal, cogsGlobal, margeBruteGlobale,
          caMatchday, caHospitality, caConcerts, caCorpo,
          margeOp, staff, marketing, chargesFixes, ebitda } = model;
  const ca = caGlobal;
  const p = (v) => ca ? fmtPct.format(v / ca) : "—";

  const html = `
    <tbody>
      <tr><td class="lbl" style="padding-left:24px;">Outlets · Bars &amp; boissons</td>
          <td class="val">${fmt.format(totals.parCategorie.D)}</td>
          <td class="pct">${p(totals.parCategorie.D)}</td>
          <td></td></tr>
      <tr><td class="lbl" style="padding-left:24px;">Outlets · Standards populaires</td>
          <td class="val">${fmt.format(totals.parCategorie.A)}</td>
          <td class="pct">${p(totals.parCategorie.A)}</td>
          <td></td></tr>
      <tr><td class="lbl" style="padding-left:24px;">Outlets · Saveurs internationales</td>
          <td class="val">${fmt.format(totals.parCategorie.B)}</td>
          <td class="pct">${p(totals.parCategorie.B)}</td>
          <td></td></tr>
      <tr><td class="lbl" style="padding-left:24px;">Outlets · Identité valaisanne</td>
          <td class="val">${fmt.format(totals.parCategorie.C)}</td>
          <td class="pct">${p(totals.parCategorie.C)}</td>
          <td></td></tr>
      <tr><td class="lbl" style="padding-left:24px;">Restaurant gastro Niv. 6 (matchday)</td>
          <td class="val">${fmt.format(annexes.caRestau)}</td>
          <td class="pct">${p(annexes.caRestau)}</td>
          <td></td></tr>
      <tr class="subtotal"><td>1. Matchday FC Sion</td>
          <td class="val">${fmt.format(caMatchday)}</td>
          <td class="pct">${p(caMatchday)}</td>
          <td>${refCell(caMatchday, REF.matchday)}</td></tr>

      <tr><td class="lbl" style="padding-left:24px;">Hospitality VIP (Niv. 1-2)</td>
          <td class="val">${fmt.format(annexes.caVIP)}</td>
          <td class="pct">${p(annexes.caVIP)}</td>
          <td></td></tr>
      <tr><td class="lbl" style="padding-left:24px;">Hospitality VVIP (Niv. 3-5)</td>
          <td class="val">${fmt.format(annexes.caVVIP)}</td>
          <td class="pct">${p(annexes.caVVIP)}</td>
          <td></td></tr>
      <tr class="subtotal"><td>2. Hospitality VIP + VVIP</td>
          <td class="val">${fmt.format(caHospitality)}</td>
          <td class="pct">${p(caHospitality)}</td>
          <td>${refCell(caHospitality, REF.hospitality)}</td></tr>

      <tr class="subtotal"><td>3. Concerts (${state.hyp.nbConcerts} événements)</td>
          <td class="val">${fmt.format(caConcerts)}</td>
          <td class="pct">${p(caConcerts)}</td>
          <td>${refCell(caConcerts, REF.concerts)}</td></tr>

      <tr class="subtotal"><td>4. Rentals + C&amp;E (${state.hyp.nbEventsCorpo} events)</td>
          <td class="val">${fmt.format(caCorpo)}</td>
          <td class="pct">${p(caCorpo)}</td>
          <td>${refCell(caCorpo, REF.rentals)}</td></tr>

      <tr class="total"><td>Total chiffre d'affaires F&amp;B</td>
          <td class="val">${fmt.format(ca)}</td>
          <td class="pct">100%</td>
          <td>${refCell(ca, REF.totalCA)}</td></tr>

      <tr><td class="lbl">Coût matière (COGS)</td>
          <td class="val">- ${fmt.format(cogsGlobal)}</td>
          <td class="pct">${p(cogsGlobal)}</td>
          <td></td></tr>
      <tr class="subtotal"><td>Marge sur coût matière</td>
          <td class="val">${fmt.format(margeBruteGlobale)}</td>
          <td class="pct">${p(margeBruteGlobale)}</td>
          <td></td></tr>
      <tr><td class="lbl">Masse salariale</td>
          <td class="val">- ${fmt.format(staff)}</td>
          <td class="pct">${p(staff)}</td>
          <td></td></tr>
      <tr><td class="lbl">Marketing &amp; communication</td>
          <td class="val">- ${fmt.format(marketing)}</td>
          <td class="pct">${p(marketing)}</td>
          <td></td></tr>
      <tr><td class="lbl">Charges fixes (concession, énergie, maintenance)</td>
          <td class="val">- ${fmt.format(chargesFixes)}</td>
          <td class="pct">${p(chargesFixes)}</td>
          <td></td></tr>
      <tr class="total"><td>EBITDA (marge opérationnelle)</td>
          <td class="val">${fmt.format(ebitda)}</td>
          <td class="pct">${ca ? fmtPct.format(margeOp) : "—"}</td>
          <td>${refCell(margeOp, REF.marge)}</td></tr>
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
  const ca = model.caGlobal;
  const monthlyCA = MONTH_KEYS.map(k => ca * MONTHLY_DIST[k]);
  const monthlyMB = monthlyCA.map(v => v * (ca ? model.margeBruteGlobale / ca : 0));
  state.charts.monthly = new Chart(document.getElementById("chart-monthly"), {
    type: "line",
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Chiffre d'affaires",
          data: monthlyCA,
          borderColor: "#E2001A",
          backgroundColor: "rgba(226, 0, 26, 0.12)",
          fill: true,
          tension: 0.35,
          pointBackgroundColor: "#E2001A",
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
  renderAnnexes(model);
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

/* ---------- Scénarios ---------- */
function applyScenario(name) {
  if (!SCENARIOS[name]) {
    state.scenario = "custom";
    updateScenarioUI();
    return;
  }
  isApplyingScenario = true;
  const s = SCENARIOS[name];
  Object.assign(state.hyp, s.hyp);
  OUTLETS_DATA.outlets.forEach(o => {
    state.captures[o.id] = (CAPTURE_DEFAULT[o.id] ?? 0.03) * s.captureMultiplier;
  });
  state.scenario = name;
  syncInputsFromState();
  updateScenarioUI();
  renderAll();
  isApplyingScenario = false;
}

function syncInputsFromState() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  const h = state.hyp;
  set("hyp-cap-pop", h.capPopulaire);
  set("hyp-cap-vip", h.capVIP);
  set("hyp-cap-vvip", h.capVVIP);
  set("hyp-remplissage-ga", Math.round(h.remplissageGA * 100));
  set("hyp-remplissage-prem", Math.round(h.remplissagePremium * 100));
  set("hyp-matchs", h.matchs);
  set("hyp-staff", Math.round(h.staffPct * 1000) / 10);
  set("hyp-charges", h.chargesFixes);
  set("hyp-marketing", Math.round(h.marketingPct * 1000) / 10);
  set("hyp-vip-panier", h.panierVIP);
  set("hyp-vvip-panier", h.panierVVIP);
  set("hyp-restau-couverts", h.restauCouverts);
  set("hyp-restau-panier", h.restauPanier);
  set("hyp-restau-remp", Math.round(h.restauRemplissage * 100));
  set("hyp-concerts", h.nbConcerts);
  set("hyp-concert-jauge", h.concertJauge);
  set("hyp-concert-panier", h.concertPanier);
  set("hyp-corpo-nb", h.nbEventsCorpo);
  set("hyp-corpo-panier", h.panierEventCorpo);
}

function updateScenarioUI() {
  document.querySelectorAll(".scen-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.scen === state.scenario);
  });
}

function markCustomIfNeeded() {
  if (!isApplyingScenario && state.scenario !== "custom") {
    state.scenario = "custom";
    updateScenarioUI();
  }
}

function bindScenarios() {
  document.querySelectorAll(".scen-btn").forEach(b => {
    b.addEventListener("click", () => applyScenario(b.dataset.scen));
  });
}

/* ---------- Bind hypothèses ---------- */
function bindHypotheses() {
  const map = [
    ["hyp-cap-pop", "capPopulaire", v => v],
    ["hyp-cap-vip", "capVIP", v => v],
    ["hyp-cap-vvip", "capVVIP", v => v],
    ["hyp-remplissage-ga", "remplissageGA", v => v / 100],
    ["hyp-remplissage-prem", "remplissagePremium", v => v / 100],
    ["hyp-matchs", "matchs", v => v],
    ["hyp-staff", "staffPct", v => v / 100],
    ["hyp-charges", "chargesFixes", v => v],
    ["hyp-marketing", "marketingPct", v => v / 100],
    ["hyp-vip-panier", "panierVIP", v => v],
    ["hyp-vvip-panier", "panierVVIP", v => v],
    ["hyp-restau-couverts", "restauCouverts", v => v],
    ["hyp-restau-panier", "restauPanier", v => v],
    ["hyp-restau-remp", "restauRemplissage", v => v / 100],
    ["hyp-concerts", "nbConcerts", v => v],
    ["hyp-concert-jauge", "concertJauge", v => v],
    ["hyp-concert-panier", "concertPanier", v => v],
    ["hyp-corpo-nb", "nbEventsCorpo", v => v],
    ["hyp-corpo-panier", "panierEventCorpo", v => v],
  ];
  map.forEach(([elId, key, conv]) => {
    document.getElementById(elId).addEventListener("input", e => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v) && v >= 0) {
        state.hyp[key] = conv(v);
        markCustomIfNeeded();
        renderAll();
      }
    });
  });
}

/* ---------- Actions ---------- */
function bindActions() {
  document.getElementById("btn-reset").addEventListener("click", () => {
    const mult = SCENARIOS[state.scenario]?.captureMultiplier ?? 1.0;
    isApplyingScenario = true;
    OUTLETS_DATA.outlets.forEach(o => {
      state.captures[o.id] = (CAPTURE_DEFAULT[o.id] ?? 0.03) * mult;
    });
    renderAll();
    isApplyingScenario = false;
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
  bindScenarios();
  bindHypotheses();
  bindActions();
  applyScenario("conservative");
});
