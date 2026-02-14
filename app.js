const defaults = {
  games: "Lakers @ Nuggets\nCeltics @ Bucks\nKnicks @ Heat",
  bankroll: 500,
  tickets: 4,
  homeAdvantage: 2.5,
  sigma: 1.2,
  chaos: 2,
  efficiencyGap: 25,
  coinFlip: 20,
  fatigue: 15,
  pace: 20,
  defense: 20,
  extremeSkew: false,
  injuryShock: false,
  clvUnder: false,
};

const ids = [
  "games",
  "bankroll",
  "tickets",
  "homeAdvantage",
  "sigma",
  "chaos",
  "efficiencyGap",
  "coinFlip",
  "fatigue",
  "pace",
  "defense",
  "extremeSkew",
  "injuryShock",
  "clvUnder",
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

const output = {
  regime: document.getElementById("regimeOutput"),
  prob: document.getElementById("probOutput"),
  capital: document.getElementById("capitalOutput"),
  scenario: document.getElementById("scenarioOutput"),
  risk: document.getElementById("riskOutput"),
};

const labels = {
  homeAdvantageVal: document.getElementById("homeAdvantageVal"),
  sigmaVal: document.getElementById("sigmaVal"),
  chaosVal: document.getElementById("chaosVal"),
};

const regimeNames = [
  "Efficiency Gap",
  "Coin-Flip Parity",
  "Fatigue Distortion",
  "Pace/Volatility Inflation",
  "Defensive Compression",
];

function getState() {
  return {
    games: el.games.value.trim().split("\n").filter(Boolean),
    bankroll: Number(el.bankroll.value),
    tickets: Number(el.tickets.value),
    homeAdvantage: Number(el.homeAdvantage.value),
    sigma: Number(el.sigma.value),
    chaos: Number(el.chaos.value),
    weights: [
      Number(el.efficiencyGap.value),
      Number(el.coinFlip.value),
      Number(el.fatigue.value),
      Number(el.pace.value),
      Number(el.defense.value),
    ],
    flags: {
      extremeSkew: el.extremeSkew.checked,
      injuryShock: el.injuryShock.checked,
      clvUnder: el.clvUnder.checked,
    },
  };
}

function strongestRegime(weights) {
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...weights);
  const idx = weights.indexOf(max);
  const pct = (max / total) * 100;
  return {
    name: regimeNames[idx],
    dominance: pct,
    hybrid: pct < 40,
  };
}

function marketForRegime(name) {
  if (name.includes("Efficiency")) return "Spread";
  if (name.includes("Coin-Flip")) return "Moneyline";
  if (name.includes("Fatigue")) return "Totals (Under tilt)";
  if (name.includes("Pace")) return "Totals (Over tilt)";
  return "Spread + Alt Total";
}

function compute(state) {
  const games = state.games.length ? state.games : ["[Add games]"];
  const regime = strongestRegime(state.weights);

  const rows = games.map((game, i) => {
    const baseline = 50 + state.homeAdvantage * 1.4 + (i % 2 === 0 ? 1 : -1) * 2;
    const uncertaintyPenalty = state.chaos * 0.5;
    const modeled = Math.min(66, Math.max(34, baseline - uncertaintyPenalty));
    return {
      game,
      regime: regime.hybrid ? `${regime.name} + Hybrid` : regime.name,
      market: marketForRegime(regime.name),
      winProb: modeled,
      sigma: Math.min(2, Math.max(1, state.sigma)).toFixed(1),
    };
  });

  const baseTickets = Math.max(2, state.tickets);
  const effectiveBankroll = state.flags.clvUnder ? Math.min(400, state.bankroll) : state.bankroll;
  const equalStake = Math.round((effectiveBankroll / baseTickets) * 100) / 100;
  const hedgeWeight = state.flags.extremeSkew ? 0.2 : 0.5;

  const ticketRows = Array.from({ length: baseTickets }, (_, i) => {
    const side = i < baseTickets / 2 ? "Primary" : "Hedge";
    let stake = equalStake;
    if (state.flags.extremeSkew) {
      stake =
        side === "Primary"
          ? (effectiveBankroll * (1 - hedgeWeight)) / (baseTickets / 2)
          : (effectiveBankroll * hedgeWeight) / (baseTickets / 2);
    }
    if (state.flags.injuryShock) {
      stake *= 0.9;
    }
    return {
      ticket: `Ticket ${i + 1}`,
      type: side,
      stake: `${stake.toFixed(2)} MXN`,
      jointProb: `${(rows.reduce((a, r) => a * (r.winProb / 100), 1) * 100).toFixed(2)}%`,
    };
  });

  return { rows, ticketRows, regime, effectiveBankroll };
}

function table(headers, rows) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function render() {
  const state = getState();
  const data = compute(state);

  labels.homeAdvantageVal.textContent = `${state.homeAdvantage.toFixed(1)}%`;
  labels.sigmaVal.textContent = `${state.sigma.toFixed(1)}%`;
  labels.chaosVal.textContent = `${state.chaos.toFixed(1)}%`;

  output.regime.innerHTML = table(
    ["Game", "Regime", "Instrument"],
    data.rows.map((r) => [r.game, r.regime, r.market]),
  );

  output.prob.innerHTML = table(
    ["Game", "Modeled Win %", "σₚ", "Uncertainty Layers"],
    data.rows.map((r) => [r.game, `${r.winProb.toFixed(1)}%`, `${r.sigma}%`, "Observable + Market + Hidden"]),
  );

  output.capital.innerHTML = table(
    ["Ticket", "Role", "Stake", "Joint Probability"],
    data.ticketRows.map((r) => [r.ticket, r.type, r.stake, r.jointProb]),
  );

  output.scenario.innerHTML = "";
  [
    "Primary tickets trigger in base-efficiency state with low hidden variance.",
    "Hedge tickets trigger in opposite pace/defense state under structural misspecification.",
    `Dominant regime coverage: ${data.regime.name} at ${data.regime.dominance.toFixed(1)}% weight.`,
    state.flags.injuryShock ? "Injury shock active: stake trimmed to reduce estimate fragility." : "No injury shock override active.",
  ].forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    output.scenario.appendChild(li);
  });

  output.risk.textContent = [
    `Effective bankroll: ${data.effectiveBankroll} MXN.`,
    state.flags.extremeSkew ? "Extreme skew override: hedge exposure reduced to 20%." : "Symmetric hedge exposure maintained.",
    state.flags.clvUnder ? "CLV underperformance mode active: variance throttled by lower bankroll." : "CLV mode inactive.",
    "This is a wireframe output for structured reasoning, not a predictive claim.",
  ].join(" ");
}

function reset() {
  Object.entries(defaults).forEach(([k, v]) => {
    if (typeof v === "boolean") {
      el[k].checked = v;
    } else {
      el[k].value = v;
    }
  });
  render();
}

document.getElementById("generate").addEventListener("click", render);
document.getElementById("reset-btn").addEventListener("click", reset);

ids.forEach((id) => {
  el[id].addEventListener("input", render);
  el[id].addEventListener("change", render);
});

reset();
