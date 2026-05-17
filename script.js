(function () {
  var assetsInput = document.getElementById("assets");
  var liabilitiesInput = document.getElementById("liabilities");
  var netWorthInput = document.getElementById("net-worth");
  var licenseLimitInput = document.getElementById("license-limit");
  var resultPlaceholder = document.getElementById("result-placeholder");
  var navToggle = document.getElementById("nav-toggle");
  var siteHeader = document.querySelector(".site-header");
  var siteNav = document.getElementById("site-nav");
  var yearEl = document.getElementById("year");

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
    if (!assetsInput || !liabilitiesInput || !netWorthInput) {
      return;
    }
    var netWorth = parseAmount(assetsInput.value) - parseAmount(liabilitiesInput.value);
    netWorthInput.value = formatCurrency(netWorth);
  }

  function hasAnyInput() {
    return (
      (assetsInput && assetsInput.value.trim() !== "") ||
      (liabilitiesInput && liabilitiesInput.value.trim() !== "") ||
      (licenseLimitInput && licenseLimitInput.value.trim() !== "")
    );
  }

  function updateResultHint() {
    if (!resultPlaceholder) {
      return;
    }

    if (!hasAnyInput()) {
      resultPlaceholder.textContent =
        "Enter your balance sheet figures to see a preview summary. The full limit comparison launches soon.";
      resultPlaceholder.classList.remove("is-active");
      return;
    }

    var limit = licenseLimitInput ? parseAmount(licenseLimitInput.value) : 0;
    var netWorth = netWorthInput ? parseAmount(netWorthInput.value) : 0;
    var limitText = limit > 0 ? "$" + formatCurrency(limit) : "your requested limit";

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

  if (assetsInput && liabilitiesInput) {
    assetsInput.addEventListener("input", onInputChange);
    liabilitiesInput.addEventListener("input", onInputChange);
    if (licenseLimitInput) {
      licenseLimitInput.addEventListener("input", updateResultHint);
    }
    updateNetWorth();
  }

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  function closeNav() {
    if (siteHeader) {
      siteHeader.classList.remove("is-nav-open");
    }
    if (navToggle) {
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  if (navToggle && siteHeader) {
    navToggle.addEventListener("click", function () {
      var isOpen = siteHeader.classList.toggle("is-nav-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  if (siteNav) {
    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeNav();
    }
  });
})();
