(function () {
  var form = document.getElementById("tnLimitEstimatorForm");

  if (!form) return;

  var balanceSheetFieldIds = [
    "currentAssets",
    "currentLiabilities",
    "totalAssets",
    "totalLiabilities"
  ];

  var ids = {
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

  function fieldHasValue(fieldId) {
    var field = el(fieldId);
    return field && field.value.trim() !== "";
  }

  function hasMeaningfulInputs() {
    return balanceSheetFieldIds.some(fieldHasValue);
  }

  function formatCurrency(value) {
    var safeValue = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(safeValue);
  }

  function formatNumberCommas(value) {
    if (!Number.isFinite(value) || value === 0) return "";
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0
    }).format(value);
  }

  function formatMoneyInputValue(input) {
    var raw = input.value.trim();
    if (raw === "") {
      input.value = "";
      return;
    }

    input.value = formatNumberCommas(parseMoney(raw));
  }

  function formatMoneyInputLive(input) {
    var start = input.selectionStart || 0;
    var before = input.value;
    var digitsBeforeCursor = before.slice(0, start).replace(/\D/g, "").length;
    var digits = before.replace(/\D/g, "");

    if (digits === "") {
      input.value = "";
      return;
    }

    digits = digits.replace(/^0+/, "") || "0";
    var formatted = formatNumberCommas(Number(digits));
    input.value = formatted;

    var newPos = formatted.length;
    var seen = 0;

    for (var i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted.charAt(i))) {
        seen += 1;
        if (seen >= digitsBeforeCursor) {
          newPos = i + 1;
          break;
        }
      }
    }

    input.setSelectionRange(newPos, newPos);
  }

  function getTransactionType() {
    var radio = document.querySelector('input[name="transactionType"]:checked');
    return radio ? radio.value : "initial";
  }

  function getInputs() {
    return {
      transactionType: getTransactionType(),
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

    var wcSupportedLimit = Math.max(0, adjustedWorkingCapital * 10);
    var nwSupportedLimit = Math.max(0, adjustedNetWorth * 10);

    var renewalDiscretionaryLimit = Math.max(
      adjustedWorkingCapital * 10,
      adjustedNetWorth * 0.5
    );

    var limitingSide = adjustedWorkingCapital <= adjustedNetWorth
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
      limitingSide: limitingSide,
      wcSupportedLimit: wcSupportedLimit,
      nwSupportedLimit: nwSupportedLimit,
      conservativeLimit: conservativeLimit,
      renewalDiscretionaryLimit: Math.max(0, renewalDiscretionaryLimit)
    };
  }

  function getFilingGuidance(transactionType, requestedLimit) {
    var limit = requestedLimit > 0 ? requestedLimit : 0;

    if (transactionType === "renewal") {
      if (limit <= 1500000) {
        return "Based on current research, a self-prepared or notarized statement may apply for a renewal request at or below $1,500,000.";
      }
      return "Based on current research, a compilation may apply for a renewal request above $1,500,000.";
    }

    if (limit <= 3000000) {
      return "Based on current research, a reviewed statement minimum may apply for an initial application or increase request at or below $3,000,000.";
    }

    return "Based on current research, an audited statement is likely required for an initial application or increase request above $3,000,000.";
  }

  function getInterpretation(requestedLimit, conservativeLimit) {
    if (requestedLimit <= 0) {
      return {
        text: "Conservative estimate calculated from your balance-sheet entries. Add a requested limit to see how it compares.",
        tier: "none"
      };
    }

    if (conservativeLimit <= 0) {
      return {
        text: "Your requested limit appears above the conservative estimate.",
        tier: "above"
      };
    }

    var closeThreshold = conservativeLimit * 1.1;

    if (requestedLimit <= conservativeLimit) {
      return {
        text: "Your requested limit appears reasonably supported by the conservative estimate.",
        tier: "supported"
      };
    }

    if (requestedLimit <= closeThreshold) {
      return {
        text: "Your requested limit appears close to the conservative estimate.",
        tier: "close"
      };
    }

    return {
      text: "Your requested limit appears above the conservative estimate.",
      tier: "above"
    };
  }

  function getLimitingFactorCopy(result) {
    if (result.limitingSide === "workingCapital") {
      return {
        label: "Limiting factor: Working capital",
        detail: "Adjusted working capital is the lower figure, so it caps the conservative estimate. Net worth is higher but does not raise the limit under this formula."
      };
    }

    return {
      label: "Limiting factor: Net worth",
      detail: "Adjusted net worth is the lower figure, so it caps the conservative estimate. Working capital is higher but does not raise the limit under this formula."
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

    var intro = "To support a " + formatCurrency(inputs.requestedLimit) + " requested limit under the conservative approach, you generally need about " + formatCurrency(supportNeeded) + " in both working capital and net worth.";

    var wcStatus = wc >= supportNeeded
      ? "Adjusted working capital (" + formatCurrency(wc) + ") appears sufficient."
      : "Adjusted working capital (" + formatCurrency(wc) + ") appears short by about " + formatCurrency(wcGap) + ".";

    var nwStatus = nw >= supportNeeded
      ? "Adjusted net worth (" + formatCurrency(nw) + ") appears sufficient."
      : "Adjusted net worth (" + formatCurrency(nw) + ") appears short by about " + formatCurrency(nwGap) + ".";

    if (wc >= supportNeeded && nw >= supportNeeded) {
      return intro + " Based on these entries, both sides appear to meet that rough level. Board review and filing-strength factors still apply.";
    }

    if (wcGap > 0 && nwGap > 0) {
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

  function getWhatThisMeans(inputs, result, interpretation) {
    var items = [];

    if (interpretation.tier === "supported") {
      items.push("The requested limit appears supported under the conservative estimate.");
    } else if (interpretation.tier === "close") {
      items.push("The requested limit is close enough that relatively small balance-sheet changes could affect the estimate.");
    } else if (interpretation.tier === "above") {
      items.push("The requested limit is above the conservative estimate based on current entries.");
    } else {
      items.push("The conservative estimate is " + formatCurrency(result.conservativeLimit) + " based on the figures entered.");
    }

    if (result.limitingSide === "workingCapital") {
      items.push("The estimate appears constrained primarily by working capital.");
    } else {
      items.push("The estimate appears constrained primarily by net worth.");
    }

    if (inputs.agedReceivables > 0) {
      items.push("Older receivables reduced usable working capital.");
    }

    if (result.workingCapitalBeforeLoc < 0 && inputs.lineOfCredit > 0) {
      items.push("Negative working capital before the LOC may have limited how much credit counted.");
    }

    if (inputs.guarantorSupport > 0) {
      items.push("Supplemental guarantor support improved both sides at 50% of the amount entered.");
    }

    return items;
  }

  function getNextStep(inputs, result, interpretation) {
    if (!hasMeaningfulInputs()) {
      return "Enter current assets, liabilities, and total assets and liabilities from the applying entity's balance sheet, then run the estimate again.";
    }

    if (inputs.agedReceivables > 0) {
      return "Review older receivables carefully because they may reduce usable working capital.";
    }

    if (inputs.experienceConcern) {
      return "Review whether the requested limit aligns with demonstrated project experience.";
    }

    if (interpretation.tier === "above") {
      if (result.limitingSide === "workingCapital") {
        return "Review whether working capital, current liabilities, or receivables can be improved before filing.";
      }
      return "Review whether net worth, total liabilities, or balance-sheet structure can be improved before filing.";
    }

    if (interpretation.tier === "close") {
      return "Confirm these figures match the financial statement you plan to submit and whether small balance-sheet changes could shift the outcome.";
    }

    if (inputs.receivablesHeavy) {
      return "Review receivable aging and collectibility documentation before filing.";
    }

    return "Confirm these figures match the financial statement you plan to submit.";
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

    return { label: "Solid estimate", level: "high" };
  }

  function getEstimateStrengthExplanation(strength) {
    var base = "This reflects how clean and stable the estimate appears based on the entered figures and selected filing-strength factors. It is not a guarantee of approval.";

    if (strength.level === "high") {
      return "Estimate strength: solid. " + base;
    }

    if (strength.level === "medium") {
      return "Estimate strength: review recommended. " + base;
    }

    return "Estimate strength: needs attention. " + base;
  }

  function setEstimateStrengthBadge(strength) {
    var badge = el("estimateStrengthBadge");
    var quality = el("estimateQualityLabel");

    if (badge) {
      badge.textContent = strength.label;
      badge.className = "shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide";

      if (strength.level === "high") {
        badge.classList.add("bg-emerald-500/20", "text-emerald-300");
      } else if (strength.level === "medium") {
        badge.classList.add("bg-amber-500/20", "text-amber-300");
      } else {
        badge.classList.add("bg-rose-500/20", "text-rose-300");
      }
    }

    if (quality) {
      quality.textContent = strength.label;
      quality.className = "mt-1 inline-block rounded px-2 py-1 text-sm font-semibold";

      if (strength.level === "high") {
        quality.classList.add("bg-success-green/10", "text-success-green");
      } else if (strength.level === "medium") {
        quality.classList.add("bg-warning-amber/10", "text-amber-700");
      } else {
        quality.classList.add("bg-rose-100", "text-rose-700");
      }
    }
  }

  function formatLimitAmount(value) {
    return formatCurrency(value).replace(/^\$/, "");
  }

  function getLimitingFactorHero(result) {
    if (result.limitingSide === "workingCapital") {
      return "Your limit is constrained primarily by working capital. Improving current assets, reducing current liabilities, or addressing aged receivables may help.";
    }
    return "Your limit is constrained primarily by net worth. Improving total assets, reducing total liabilities, or strengthening equity may help.";
  }

  function getCurrentRatio(inputs) {
    if (inputs.currentLiabilities <= 0) return null;
    return inputs.currentAssets / inputs.currentLiabilities;
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

  function renderWhatThisMeans(items) {
    var list = el("whatThisMeansList");

    if (!list) return;

    list.innerHTML = "";

    items.forEach(function (text) {
      var li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
    });
  }

  function showEmptyState(message) {
    var empty = el("resultsEmptyState");
    var calculated = el("resultsCalculated");

    if (empty) {
      empty.classList.remove("hidden");
      if (message) {
        var msgEl = empty.querySelector("[data-empty-msg]");
        if (msgEl) {
          msgEl.textContent = message;
        } else {
          var paragraphs = empty.querySelectorAll("p");
          if (paragraphs.length > 1) {
            paragraphs[1].textContent = message;
          }
        }
      }
    }

    if (calculated) {
      calculated.classList.add("hidden");
    }
  }

  function showCalculatedResults() {
    var empty = el("resultsEmptyState");
    var calculated = el("resultsCalculated");

    if (empty) empty.classList.add("hidden");
    if (calculated) calculated.classList.remove("hidden");
  }

  function renderResults(inputs, result) {
    var interpretation = getInterpretation(inputs.requestedLimit, result.conservativeLimit);
    var limiting = getLimitingFactorCopy(result);
    var strength = getEstimateStrength(inputs, result, interpretation.tier);
    var formulaNotes = getFormulaNotes(inputs, result);
    var filingStrength = getFilingStrengthFactors(inputs);
    var whatThisMeans = getWhatThisMeans(inputs, result, interpretation);

    showCalculatedResults();

    el("resultInterpretation").textContent = interpretation.text;
    setEstimateStrengthBadge(strength);
    el("estimateStrengthExplain").textContent = getEstimateStrengthExplanation(strength);

    renderWhatThisMeans(whatThisMeans);

    var limitingHero = el("limitingFactorHero");
    if (limitingHero) limitingHero.textContent = getLimitingFactorHero(result);

    el("limitingFactorValue").textContent = limiting.label;
    el("limitingFactorExplain").textContent =
      limiting.detail + " The conservative estimate generally uses 10× the lower of adjusted working capital and adjusted net worth.";
    el("wcSupportLevel").textContent =
      "Working capital supports approximately " + formatCurrency(result.wcSupportedLimit) + " (" + formatCurrency(result.adjustedWorkingCapital) + " × 10).";
    el("nwSupportLevel").textContent =
      "Net worth supports approximately " + formatCurrency(result.nwSupportedLimit) + " (" + formatCurrency(result.adjustedNetWorth) + " × 10).";

    var wcDisplay = el("wcSupportDisplay");
    var nwDisplay = el("nwSupportDisplay");
    if (wcDisplay) wcDisplay.textContent = formatCurrency(result.wcSupportedLimit);
    if (nwDisplay) nwDisplay.textContent = formatCurrency(result.nwSupportedLimit);

    var limitAmount = el("conservativeLimitAmount");
    if (limitAmount) limitAmount.textContent = formatLimitAmount(result.conservativeLimit);

    el("adjustedWorkingCapital").textContent = formatCurrency(result.adjustedWorkingCapital);
    el("adjustedNetWorth").textContent = formatCurrency(result.adjustedNetWorth);
    el("conservativeLimit").textContent = formatCurrency(result.conservativeLimit);

    var ratio = getCurrentRatio(inputs);
    var ratioEl = el("currentRatioDisplay");
    if (ratioEl) {
      ratioEl.textContent = ratio === null ? "—" : ratio.toFixed(1);
      ratioEl.className = "text-xl font-semibold " + (ratio !== null && ratio >= 1.5 ? "text-success-green" : "text-slate-900");
    }

    var detailCard = el("limitingFactorCard");
    if (detailCard) detailCard.classList.remove("hidden");

    el("filingGuidance").textContent = getFilingGuidance(
      inputs.transactionType,
      inputs.requestedLimit > 0 ? inputs.requestedLimit : result.conservativeLimit
    );

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

    el("nextStepText").textContent = getNextStep(inputs, result, interpretation);

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
    formatMoneyInputValue(event.target);
  }

  document.querySelectorAll(".money-input").forEach(function (input) {
    input.addEventListener("input", function (event) {
      formatMoneyInputLive(event.target);
    });
    input.addEventListener("blur", formatMoneyInput);
  });

  function setRenewalCardVisible(show) {
    var renewalCard = el("renewalDiscretionaryCard");
    if (!renewalCard) return;
    renewalCard.hidden = !show;
    renewalCard.classList.toggle("hidden", !show);
  }

  setRenewalCardVisible(false);
  showEmptyState();

  document.querySelectorAll('input[name="transactionType"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      if (getTransactionType() !== "renewal") {
        setRenewalCardVisible(false);
      }
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!hasMeaningfulInputs()) {
      showEmptyState("Enter balance sheet figures for the applying entity (current assets and liabilities, plus total assets and liabilities), then run the estimate again.");
      return;
    }

    var inputs = getInputs();
    var result = calculateLimit(inputs);

    renderResults(inputs, result);
  });
})();
