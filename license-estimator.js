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

    return {
      eligibleCurrentAssets: eligibleCurrentAssets,
      workingCapitalBeforeLoc: workingCapitalBeforeLoc,
      locCredit: locCredit,
      guarantorCredit: guarantorCredit,
      adjustedWorkingCapital: adjustedWorkingCapital,
      baseNetWorth: baseNetWorth,
      adjustedNetWorth: adjustedNetWorth,
      conservativeLimit: conservativeLimit,
      renewalDiscretionaryLimit: Math.max(0, renewalDiscretionaryLimit)
    };
  }

  function getFilingGuidance(transactionType, requestedLimit) {
    if (transactionType === "renewal") {
      if (requestedLimit <= 1500000) {
        return "Based on current research, a self-prepared/notarized statement may apply for a renewal request at or below $1,500,000.";
      }
      return "Based on current research, a compilation may apply for a renewal request above $1,500,000.";
    }

    if (requestedLimit <= 3000000) {
      return "Based on current research, a reviewed statement minimum may apply for an initial application or increase request at or below $3,000,000.";
    }

    return "Based on current research, an audited statement is likely required for an initial application or increase request above $3,000,000.";
  }

  function getComparisonText(requestedLimit, conservativeLimit) {
    if (requestedLimit <= 0) {
      return "Enter a requested limit to compare it with the conservative estimate.";
    }

    if (requestedLimit <= conservativeLimit) {
      return "The figures entered may support the requested limit on a conservative financial estimate basis.";
    }

    var shortfall = requestedLimit - conservativeLimit;
    return "The requested limit is above the conservative estimate. Potential shortfall: " + formatCurrency(shortfall) + ".";
  }

  function getRiskFlags(inputs, result) {
    var flags = [];

    if (inputs.agedReceivables > 0) {
      flags.push("Receivables older than 90 days may be excluded from working capital.");
    }

    if (inputs.lineOfCredit > 0) {
      flags.push("Line of credit support only improves working capital, not net worth.");
    }

    if (result.workingCapitalBeforeLoc < 0 && inputs.lineOfCredit > 0) {
      flags.push("Negative working capital may reduce LOC value to 50%.");
    }

    if (inputs.cashOnly) {
      flags.push("Cash-only or no fixed assets may reduce confidence.");
    }

    if (inputs.receivablesHeavy) {
      flags.push("Receivable-heavy working capital may invite more review.");
    }

    if (inputs.experienceConcern) {
      flags.push("Tennessee also considers experience, not just financial math.");
    }

    if (inputs.transactionType === "renewal") {
      flags.push("Renewal estimates may differ from initial or increase rules.");
    }

    if (inputs.guarantorSupport > 0) {
      flags.push("Supplemental support is typically discounted to 50%.");
    }

    return flags;
  }

  function getConfidence(inputs, result) {
    var mediumFlags = [];

    if (inputs.receivablesHeavy) mediumFlags.push("receivables-heavy");
    if (inputs.cashOnly) mediumFlags.push("cash-only");
    if (inputs.experienceConcern) mediumFlags.push("experience concern");
    if (inputs.agedReceivables > 0) mediumFlags.push("aged receivables");

    var cap = result.conservativeLimit;
    var requested = inputs.requestedLimit;

    if (cap > 0 && requested > 0) {
      var withinTenPercent = Math.abs(requested - cap) / cap <= 0.10;
      if (withinTenPercent) mediumFlags.push("requested limit close to conservative cap");
    }

    var lowTriggers = [];

    if (result.workingCapitalBeforeLoc < 0) {
      lowTriggers.push("negative working capital before LOC");
    }

    if (result.adjustedNetWorth < 0) {
      lowTriggers.push("negative adjusted net worth");
    }

    if (cap > 0 && requested > cap * 1.25) {
      lowTriggers.push("requested limit more than 25% above conservative cap");
    }

    if (mediumFlags.length >= 2) {
      lowTriggers.push("two or more medium risk flags");
    }

    if (lowTriggers.length > 0) {
      return "Low";
    }

    if (mediumFlags.length > 0) {
      return "Medium";
    }

    return "High";
  }

  function setConfidenceBadge(confidence) {
    var badge = el("confidenceBadge");

    badge.textContent = confidence + " confidence";
    badge.className = "rounded-full px-3 py-1 text-sm font-semibold";

    if (confidence === "High") {
      badge.classList.add("bg-emerald-100", "text-emerald-800");
    } else if (confidence === "Medium") {
      badge.classList.add("bg-amber-100", "text-amber-800");
    } else {
      badge.classList.add("bg-rose-100", "text-rose-800");
    }
  }

  function renderResults(inputs, result) {
    var confidence = getConfidence(inputs, result);
    var riskFlags = getRiskFlags(inputs, result);

    el("adjustedWorkingCapital").textContent = formatCurrency(result.adjustedWorkingCapital);
    el("adjustedNetWorth").textContent = formatCurrency(result.adjustedNetWorth);
    el("conservativeLimit").textContent = formatCurrency(result.conservativeLimit);

    el("comparisonText").textContent = getComparisonText(
      inputs.requestedLimit,
      result.conservativeLimit
    );

    el("filingGuidance").textContent = getFilingGuidance(
      inputs.transactionType,
      inputs.requestedLimit
    );

    setConfidenceBadge(confidence);

    if (inputs.requestedLimit > 0 && inputs.requestedLimit <= result.conservativeLimit) {
      el("resultHeadline").textContent = "Requested limit may be financially supported";
    } else if (inputs.requestedLimit > 0) {
      el("resultHeadline").textContent = "Requested limit is above the conservative estimate";
    } else {
      el("resultHeadline").textContent = "Conservative estimate calculated";
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

    var flagsWrap = el("riskFlagsWrap");
    var flagsContainer = el("riskFlags");

    flagsContainer.innerHTML = "";

    if (riskFlags.length > 0) {
      flagsWrap.classList.remove("hidden");

      riskFlags.forEach(function (flag) {
        var item = document.createElement("div");
        item.className = "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700";
        item.textContent = flag;
        flagsContainer.appendChild(item);
      });
    } else {
      flagsWrap.classList.add("hidden");
    }
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
