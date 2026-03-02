const parlay = [];

const addBetBtn = document.getElementById("addBet");
const parlayList = document.getElementById("parlayList");
const totalLegsEl = document.getElementById("totalLegs");
const combinedOddsEl = document.getElementById("combinedOdds");
const payoutEl = document.getElementById("payout");
const ruleStatusEl = document.getElementById("ruleStatus");

addBetBtn.addEventListener("click", () => {
    const team = document.getElementById("teamSelect").value;
    const market = document.getElementById("marketSelect").value;
    const odds = parseInt(document.getElementById("oddsInput").value);

    if (!team || !market || isNaN(odds)) {
        alert("Please complete all fields.");
        return;
    }

    const bet = { team, market, odds };
    parlay.push(bet);

    renderParlay();
    validateRules();
});

function renderParlay() {
    parlayList.innerHTML = "";

    parlay.forEach((bet, index) => {
        const li = document.createElement("li");
        li.textContent = `${bet.team} - ${bet.market} (${bet.odds})`;
        parlayList.appendChild(li);
    });

    totalLegsEl.textContent = parlay.length;
    calculateOdds();
}

function calculateOdds() {
    if (parlay.length === 0) {
        combinedOddsEl.textContent = "0";
        payoutEl.textContent = "$0";
        return;
    }

    let decimalOdds = 1;

    parlay.forEach(bet => {
        let decimal = bet.odds > 0 
            ? (bet.odds / 100) + 1 
            : (100 / Math.abs(bet.odds)) + 1;
        decimalOdds *= decimal;
    });

    combinedOddsEl.textContent = decimalOdds.toFixed(2);

    const payout = 100 * decimalOdds;
    payoutEl.textContent = `$${payout.toFixed(2)}`;
}

function validateRules() {
    if (parlay.length < 2) {
        ruleStatusEl.textContent = "⚠ Minimum 2 legs required.";
        return;
    }

    const markets = parlay.map(b => b.market);

    if (markets.includes("over") && markets.includes("under")) {
        ruleStatusEl.textContent = "❌ Conflict: Cannot mix Over and Under in same game.";
        return;
    }

    if (parlay.length > 6) {
        ruleStatusEl.textContent = "⚠ High Risk: More than 6 legs reduces probability.";
        return;
    }

    ruleStatusEl.textContent = "✅ Parlay Valid per Ruleset.";
}
