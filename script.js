(function () {
  var assetsInput = document.getElementById("assets");
  var liabilitiesInput = document.getElementById("liabilities");
  var licenseLimitInput = document.getElementById("license-limit");
  var workingCapitalEl = document.getElementById("working-capital");
  var netWorthEl = document.getElementById("net-worth");
  var resultPlaceholder = document.getElementById("result-placeholder");
  var yearEl = document.getElementById("year");

  function parseAmount(value) {
    if (!value) {
      return 0;
    }
    var cleaned = String(value).replace(/[^0-9.-]/g, "");
    var num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function formatMoney(amount) {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function getWorkingCapital() {
    return parseAmount(assetsInput.value) - parseAmount(liabilitiesInput.value);
  }

  function hasAnyInput() {
    return (
      assetsInput.value.trim() !== "" ||
      liabilitiesInput.value.trim() !== "" ||
      licenseLimitInput.value.trim() !== ""
    );
  }

  function updateOutputs() {
    var value = getWorkingCapital();

    if (workingCapitalEl) {
      workingCapitalEl.textContent = formatMoney(value);
    }
    if (netWorthEl) {
      netWorthEl.textContent = formatMoney(value);
    }

    if (!resultPlaceholder) {
      return;
    }

    if (!hasAnyInput()) {
      resultPlaceholder.textContent =
        "Enter your balance sheet figures to see a preview summary. The full limit comparison launches soon.";
      resultPlaceholder.classList.remove("is-active");
      return;
    }

    var limit = parseAmount(licenseLimitInput.value);
    var limitText = limit > 0 ? formatMoney(limit) : "your requested limit";

    resultPlaceholder.textContent =
      "Preview: working capital is " +
      formatMoney(value) +
      ". A full comparison against " +
      limitText +
      " under Tennessee licensing rules is coming soon.";
    resultPlaceholder.classList.add("is-active");
  }

  if (assetsInput && liabilitiesInput) {
    assetsInput.addEventListener("input", updateOutputs);
    liabilitiesInput.addEventListener("input", updateOutputs);
    licenseLimitInput.addEventListener("input", updateOutputs);
    updateOutputs();
  }

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();
