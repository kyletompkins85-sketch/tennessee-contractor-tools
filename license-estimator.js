(function () {
  var form = document.getElementById("tnLimitEstimatorForm");

  if (!form) return;

  var ids = {
    transactionType: "transactionType",
    requestedLimit: "requestedLimit",
    currentAssets: "currentAssets",
    currentLiabilities: "currentLiabilities",
    totalAssets: "totalAssets",
    totalLiabilities: "totalLiabilities",
    agedReceivables: "agedReceivables",
    lineOfCredit: "lineOfCredit",
    guarantorSupport: "guarantorSupport",
    cashOnlyFlag: "cashOnlyFlag",
    receivablesHeavyFlag: "receivablesHeavyFlag",
    experienceConcernFlag: "experienceConcernFlag"
  };

  function el(id) {
    return document.getElementById(id);
  }

  function parseMoney(value) {
    if (!value) return 0;
    var cleaned = String(value).replace(/[^0-9.-]/g, "");
    var parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatCurrency(value) {
    var safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(safeValue);
  }

  function getInputs() {
    return {
      transactionType: el(ids.transactionType).value,
      requestedLimit: parseMoney(el(ids.requestedLimit).value),
      currentAssets: parseMoney(el(ids.currentAssets).value),
      currentLiabilities: parseMoney(el(ids.currentLiabilities).value),
      totalAssets: parseMoney(el(ids.totalAssets).value),
      totalLiabilities: parseMoney(el(ids.totalLiabilities).value),
      agedReceivables: parseMoney(el(ids.agedReceivables).value),
      lineOfCredit: parseMoney(el(ids.lineOfCredit).value),
      guarantorSupport: parseMoney(el(ids.guarantorSupport).value),
      cashOnly: el(ids.cashOnlyFlag).checked,
      receivablesHeavy: el(ids.receivablesHeavyFlag).checked,
      experienceConcern: el(ids.experienceConcernFlag).checked
    };
  }

  function calculateLimit(inputs) {
    var eligibleCurrentAssets = inputs.currentAssets - inputs.agedReceivables;
    var workingCapitalBeforeLoc = eligibleCurrentAssets - inputs.currentLiabilities;

    var locCredit = workingCapitalBeforeLoc < 0
      ? inputs.lineOfCredit * 0.5
      : inputs.lineOfCredit;

    var guarantorCredit = inputs.guarantorSupport * 0.5;

    var adjustedWorkingCapital = workingCapitalBeforeLoc + locCredit + guarantorCredit;

    var baseNetWorth = inputs.totalAssets - inputs.totalLiabilities;
    var adjustedNetWorth = baseNetWorth + guarantorCredit;

    var lesserFinancialBase = Math.min(adjustedWorkingCapital, adjustedNetWorth);
    var conservativeLimit = Math.max(0, lesserFinancialBase * 10);

    var renewalDiscretionaryLimit = Math.max(
      adjustedWorkingCapital * 10,
      adjustedNetWorth * 0.5
    );

    var controllingSide = adjustedWorkingCapital <= adjustedNetWorth
      ? "workingCapital"
      : "netWorth";

    return {
      eligibleCurrentAssets: eligibleCurrentAssets,
      workingCapitalBeforeLoc: workingCapitalBeforeLoc,
      locCredit: locCredit,
      guarantorCredit: guarantorCredit,
      adjustedWorkingCapital: adjustedWorkingCapital,
      baseNetWorth: baseNetWorth,
      adjustedNetWorth: adjustedNetWorth,
      lesserFinancialBase: lesserFinancialBase,
      controllingSide: controllingSide,
      conservativeLimit: conservativeLimit,
      renewalDiscretionaryLimit: Math.max(0, renewalDiscretionaryLimit)
    };
  }

  function getFilingGuidance(transactionType, requestedLimit) {
    if (transactionType === "renewal") {
      if (requestedLimit <= 1500000) {
        return "Based on current research, a self-prepared or notarized statement may apply for a renewal request at or below $1,500,000.";
      }
      return "Based on current research, a compilation may apply for a renewal request above $1,500,000.";
    }

    if (requestedLimit <= 3000000) {
      return "Based on current research, a reviewed statement minimum may apply for an initial application or increase request at or below $3,000,000.";
    }

    return "Based on current research, an audited statement is likely required for an initial application or increase request above $3,000,000.";
  }

  function getInterpretation(requestedLimit, conservativeLimit) {
    if (requestedLimit <= 0) {
      return {
        text: "Conservative estimate calculated. Enter a requested limit to see how it compares.",
        tier: "none"
      };
    }

    if (conservativeLimit <= 0) {
      return {
        text: "Your requested limit appears above the conservative estimate based on the figures entered. The formula base is zero or negative.",
        tier: "above"
      };
    }

    var closeThreshold = conservativeLimit * 1.1;

    if (requestedLimit <= conservativeLimit) {
      return {
        text: "Your requested limit appears reasonably supported by the conservative estimate based on the figures entered.",
        tier: "supported"
      };
    }

    if (requestedLimit <= closeThreshold) {
      return {
        text: "Your requested limit appears close to the conservative estimate based on the figures entered.",
        tier: "close"
      };
    }

    return {
      text: "Your requested limit appears above the conservative estimate based on the figures entered.",
      tier: "above"
    };
  }

  function getControllingNumberCopy(result) {
    if (result.controllingSide === "workingCapital") {
      return {
        label: "Controlling number: Working capital",
        detail: "Adjusted working capital (" + formatCurrency(result.adjustedWorkingCapital) + ") is lower than adjusted net worth (" + formatCurrency(result.adjustedNetWorth) + "), so working capital controls the conservative limit."
      };
    }

    return {
      label: "Controlling number: Net worth",
      detail: "Adjusted net worth (" + formatCurrency(result.adjustedNetWorth) + ") is lower than adjusted working capital (" + formatCurrency(result.adjustedWorkingCapital) + "), so net worth controls the conservative limit."
    };
  }

  function getSupportNeededText(inputs, result) {
    if (inputs.requestedLimit <= 0) {
      return "";
    }

    var supportNeeded = inputs.requestedLimit / 10;
    var wc = result.adjustedWorkingCapital;
    var nw = result.adjustedNetWorth;
    var wcGap = Math.max(0, supportNeeded - wc);
    var nwGap = Math.max(0, supportNeeded - nw);

    var intro = "To support a " + formatCurrency(inputs.requestedLimit) + " requested limit under the conservative 10× approach, you generally need about " + formatCurrency(supportNeeded) + " in both working capital and net worth (after adjustments).";

    var wcStatus = wc >= supportNeeded
      ? "Adjusted working capital (" + formatCurrency(wc) + ") appears sufficient for that level."
      : "Adjusted working capital (" + formatCurrency(wc) + ") appears short by about " + formatCurrency(wcGap) + ".";

    var nwStatus = nw >= supportNeeded
      ? "Adjusted net worth (" + formatCurrency(nw) + ") appears sufficient for that level."
      : "Adjusted net worth (" + formatCurrency(nw) + ") appears short by about " + formatCurrency(nwGap) + ".";

    if (wc >= supportNeeded && nw >= supportNeeded) {
      return intro + " Based on these entries, both sides appear to meet that rough support level. Board review, documentation, and filing-strength factors still apply.";
    }

    if (wcGap > 0 && nwGap > 0) {
      return intro + " " + wcStatus + " " + nwStatus + " Both sides may need improvement to strengthen the filing.";
    }

    if (wcGap > 0) {
      return intro + " " + wcStatus + " " + nwStatus;
    }

    return intro + " " + wcStatus + " " + nwStatus;
  }

  function getFormulaNotes(inputs, result) {
    var notes = [];

    if (inputs.agedReceivables > 0) {
      notes.push("Receivables over 90 days (" + formatCurrency(inputs.agedReceivables) + ") were subtracted from current assets before working capital was calculated.");
    }

    if (inputs.lineOfCredit > 0) {
      if (result.workingCapitalBeforeLoc < 0) {
        notes.push("Working capital was negative before the line of credit, so only 50% of the LOC (" + formatCurrency(result.locCredit) + ") was added to working capital. The LOC does not increase net worth.");
      } else {
        notes.push("The full line of credit (" + formatCurrency(result.locCredit) + ") was added to working capital only, not net worth.");
      }
    }

    if (inputs.guarantorSupport > 0) {
      notes.push("Guarantor support was counted at 50% (" + formatCurrency(result.guarantorCredit) + ") toward both working capital and net worth.");
    }

    if (inputs.transactionType === "renewal") {
      notes.push("Renewals may be reviewed under different discretionary rules. The renewal-only estimate below is separate from the conservative formula.");
    }

    if (result.adjustedWorkingCapital < 0 || result.adjustedNetWorth < 0) {
      notes.push("One or both adjusted figures are negative, which typically limits or eliminates support under the conservative formula.");
    }

    return notes;
  }

  function getFilingStrengthFactors(inputs) {
    var factors = [];

    if (inputs.cashOnly) {
      factors.push("Cash-only or no fixed assets: the filing may look thin on durable balance-sheet support.");
    }

    if (inputs.receivablesHeavy) {
      factors.push("Receivables-heavy working capital: a reviewer may scrutinize collectibility and liquidity.");
    }

    if (inputs.experienceConcern) {
      factors.push("Experience concern: Tennessee also weighs demonstrated project experience relative to the requested limit.");
    }

    return factors;
  }

  function getEstimateStrength(inputs, result, interpretationTier) {
    var reviewFlags = [];

    if (inputs.receivablesHeavy) reviewFlags.push("receivables-heavy");
    if (inputs.cashOnly) reviewFlags.push("cash-only");
    if (inputs.experienceConcern) reviewFlags.push("experience");
    if (inputs.agedReceivables > 0) reviewFlags.push("aged receivables");

    var attentionTriggers = [];

    if (result.workingCapitalBeforeLoc < 0) {
      attentionTriggers.push("negative working capital before LOC");
    }

    if (result.adjustedNetWorth < 0) {
      attentionTriggers.push("negative adjusted net worth");
    }

    if (interpretationTier === "above") {
      attentionTriggers.push("requested limit above conservative estimate");
    }

    if (result.conservativeLimit > 0 && inputs.requestedLimit > result.conservativeLimit * 1.25) {
      attentionTriggers.push("requested limit well above conservative estimate");
    }

    if (reviewFlags.length >= 2) {
      attentionTriggers.push("multiple filing-strength concerns");
    }

    if (attentionTriggers.length > 0) {
      return { label: "Needs attention", level: "low" };
    }

    if (reviewFlags.length > 0 || interpretationTier === "close") {
      return { label: "Review recommended", level: "medium" };
    }

    return { label: "Solid formula match", level: "high" };
  }

  function setEstimateStrengthBadge(strength) {
    var badge = el("estimateStrengthBadge");

    if (!badge) return;

    badge.textContent = strength.label;
    badge.className = "shrink-0 rounded-full px-3 py-1 text-sm font-semibold";

    if (strength.level === "high") {
      badge.classList.add("bg-emerald-100", "text-emerald-800");
    } else if (strength.level === "medium") {
      badge.classList.add("bg-amber-100", "text-amber-800");
    } else {
      badge.classList.add("bg-rose-100", "text-rose-800");
    }
  }

  function renderFlagList(containerId, wrapId, items) {
    var wrap = el(wrapId);
    var container = el(containerId);

    if (!wrap || !container) return;

    container.innerHTML = "";

    if (items.length > 0) {
      wrap.classList.remove("hidden");

      items.forEach(function (text) {
        var item = document.createElement("div");
        item.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700";
        item.textContent = text;
        container.appendChild(item);
      });
    } else {
      wrap.classList.add("hidden");
    }
  }

  function renderResults(inputs, result) {
    var interpretation = getInterpretation(inputs.requestedLimit, result.conservativeLimit);
    var controlling = getControllingNumberCopy(result);
    var strength = getEstimateStrength(inputs, result, interpretation.tier);
    var formulaNotes = getFormulaNotes(inputs, result);
    var filingStrength = getFilingStrengthFactors(inputs);

    el("resultInterpretation").textContent = interpretation.text;
    setEstimateStrengthBadge(strength);

    el("adjustedWorkingCapital").textContent = formatCurrency(result.adjustedWorkingCapital);
    el("adjustedNetWorth").textContent = formatCurrency(result.adjustedNetWorth);
    el("conservativeLimit").textContent = formatCurrency(result.conservativeLimit);

    el("filingGuidance").textContent = getFilingGuidance(
      inputs.transactionType,
      inputs.requestedLimit
    );

    var controllingCard = el("controllingNumberCard");
    if (controllingCard) {
      controllingCard.classList.remove("hidden");
      el("controllingNumberValue").textContent = controlling.label;
      el("controllingNumberExplain").textContent =
        controlling.detail + " Tennessee's conservative formula generally uses 10× the lower of adjusted working capital and adjusted net worth.";
    }

    var supportCard = el("supportNeededCard");
    var supportText = getSupportNeededText(inputs, result);
    if (supportCard) {
      if (supportText) {
        supportCard.classList.remove("hidden");
        el("supportNeededText").textContent = supportText;
      } else {
        supportCard.classList.add("hidden");
      }
    }

    var renewalCard = el("renewalDiscretionaryCard");

    if (renewalCard) {
      var showRenewal = inputs.transactionType === "renewal";
      renewalCard.hidden = !showRenewal;
      renewalCard.classList.toggle("hidden", !showRenewal);
      if (showRenewal) {
        el("renewalDiscretionaryLimit").textContent = formatCurrency(result.renewalDiscretionaryLimit);
      }
    }

    renderFlagList("formulaNotes", "formulaNotesWrap", formulaNotes);
    renderFlagList("filingStrengthFactors", "filingStrengthWrap", filingStrength);
  }

  function formatMoneyInput(event) {
    var input = event.target;
    var value = parseMoney(input.value);

    if (input.value.trim() === "") return;

    input.value = formatCurrency(value);
  }

  document.querySelectorAll(".money-input").forEach(function (input) {
    input.addEventListener("blur", formatMoneyInput);
  });

  function setRenewalCardVisible(show) {
    var renewalCard = el("renewalDiscretionaryCard");
    if (!renewalCard) return;
    renewalCard.hidden = !show;
    renewalCard.classList.toggle("hidden", !show);
  }

  setRenewalCardVisible(false);

  el(ids.transactionType).addEventListener("change", function () {
    if (el(ids.transactionType).value !== "renewal") {
      setRenewalCardVisible(false);
    }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var inputs = getInputs();
    var result = calculateLimit(inputs);

    renderResults(inputs, result);
  });
})();
