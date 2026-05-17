(function () {
  var assetsInput = document.getElementById("assets");
  var liabilitiesInput = document.getElementById("liabilities");
  var netWorthInput = document.getElementById("net-worth");
  var resultPlaceholder = document.getElementById("result-placeholder");

  function parseAmount(value) {
    if (!value) {
      return 0;
    }
    var cleaned = String(value).replace(/[^0-9.-]/g, "");
    var num = parseFloat(cleaned);
    return Number.isFinite(num) ? num : 0;
  }

  function formatCurrency(amount) {
    return amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  function updateNetWorth() {
    var assets = parseAmount(assetsInput.value);
    var liabilities = parseAmount(liabilitiesInput.value);
    var netWorth = assets - liabilities;
    netWorthInput.value = formatCurrency(netWorth);
  }

  function hasAnyInput() {
    return (
      assetsInput.value.trim() !== "" ||
      liabilitiesInput.value.trim() !== "" ||
      document.getElementById("license-limit").value.trim() !== ""
    );
  }

  function updateResultHint() {
    if (!hasAnyInput()) {
      resultPlaceholder.textContent =
        "Enter your numbers above. A detailed limit estimate will appear here when the calculator launches.";
      resultPlaceholder.classList.remove("is-active");
      return;
    }

    var limit = parseAmount(document.getElementById("license-limit").value);
    var netWorth = parseAmount(netWorthInput.value);
    var limitText = limit > 0 ? formatCurrency(limit) : "your requested limit";

    resultPlaceholder.textContent =
      "Preview: net worth is $" +
      formatCurrency(netWorth) +
      ". A full comparison against " +
      limitText +
      " under Tennessee licensing rules is coming soon.";
    resultPlaceholder.classList.add("is-active");
  }

  function onInputChange() {
    updateNetWorth();
    updateResultHint();
  }

  if (assetsInput && liabilitiesInput && netWorthInput) {
    assetsInput.addEventListener("input", onInputChange);
    liabilitiesInput.addEventListener("input", onInputChange);
    document.getElementById("license-limit").addEventListener("input", updateResultHint);
    updateNetWorth();
  }
})();
