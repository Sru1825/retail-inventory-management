const API_BASE = "http://127.0.0.1:5000";

const $ = (id) => document.getElementById(id);

let allRecords = [];
let productRecords = [];


/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
  });
}


/* =========================================================
   STOCK STATUS
========================================================= */

function getStockStatus(inventory, reorderLevel) {

  inventory = Number(inventory || 0);
  reorderLevel = Number(reorderLevel || 0);

  if (reorderLevel > 0 && inventory <= reorderLevel) {
    return "critical";
  }

  if (reorderLevel > 0 && inventory <= reorderLevel * 1.25) {
    return "warning";
  }

  return "safe";
}


/* =========================================================
   LOAD PRODUCTS
========================================================= */

async function loadProducts() {

  const refreshBtn = $("refreshBtn");
  const errorBox = $("errorBox");

  if (refreshBtn) {
    refreshBtn.textContent = "↻ Refreshing...";
    refreshBtn.disabled = true;
  }

  try {

    if (errorBox) {
      errorBox.classList.add("hidden");
      errorBox.textContent = "";
    }

    $("backendStatus").textContent = "Checking...";
    $("dataStatus").textContent = "Checking...";


    const response =
      await fetch(`${API_BASE}/api/dashboard`);


    if (!response.ok) {

      throw new Error(
        `Products API error: HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    console.log(
      "PRODUCTS API DATA:",
      data
    );


    if (!Array.isArray(data)) {

      throw new Error(
        "Products data is not an array."
      );

    }


    if (data.length === 0) {

      throw new Error(
        "Backend returned zero product records."
      );

    }


    allRecords = data;


    /* -----------------------------------------------------
       KEEP LATEST RECORD FOR EACH
       PRODUCT + LOCATION
    ----------------------------------------------------- */

    const latestRecords = new Map();


    data.forEach(row => {

      const product =
        String(
          row.product_name || ""
        ).trim();


      const location =
        String(
          row.store_location || ""
        ).trim();


      if (!product || !location) {
        return;
      }


      const key =
        `${product.toLowerCase()}|||${location.toLowerCase()}`;


      const currentDate =
        new Date(
          row.date || 0
        ).getTime();


      const previous =
        latestRecords.get(key);


      const previousDate =
        previous
          ? new Date(
              previous.date || 0
            ).getTime()
          : 0;


      if (
        !previous ||
        currentDate >= previousDate
      ) {

        latestRecords.set(
          key,
          row
        );

      }

    });


    productRecords =
      Array.from(
        latestRecords.values()
      );


    console.log(
      "LATEST PRODUCT RECORDS:",
      productRecords.length
    );


    /* -----------------------------------------------------
       UPDATE PAGE
    ----------------------------------------------------- */

    calculateKPIs();

    populateFilters();

    renderProducts(productRecords);


    $("backendStatus").textContent =
      "Connected";


    $("dataStatus").textContent =
      `${data.length} records loaded`;

  }


  catch (error) {

    console.error(
      "Products page error:",
      error
    );


    $("backendStatus").textContent =
      "Offline";


    $("dataStatus").textContent =
      "Unavailable";


    if (errorBox) {

      errorBox.textContent =
        `Unable to load product data: ${error.message}`;

      errorBox.classList.remove(
        "hidden"
      );

    }

  }


  finally {

    if (refreshBtn) {

      refreshBtn.textContent =
        "↻ Refresh Data";

      refreshBtn.disabled =
        false;

    }

  }

}


/* =========================================================
   CALCULATE KPIs
========================================================= */

function calculateKPIs() {

  const uniqueProducts =
    new Set();

  let safe = 0;
  let warning = 0;
  let critical = 0;


  productRecords.forEach(row => {

    const product =
      String(
        row.product_name || ""
      ).trim();


    if (product) {

      uniqueProducts.add(
        product
      );

    }


    const status =
      getStockStatus(
        row.inventory,
        row.reorder_level
      );


    if (status === "safe") {

      safe++;

    }

    else if (status === "warning") {

      warning++;

    }

    else if (status === "critical") {

      critical++;

    }

  });


  $("totalProducts").textContent =
    formatNumber(
      uniqueProducts.size
    );


  $("safeProducts").textContent =
    formatNumber(
      safe
    );


  $("warningProducts").textContent =
    formatNumber(
      warning
    );


  $("criticalProducts").textContent =
    formatNumber(
      critical
    );

}


/* =========================================================
   POPULATE FILTERS
========================================================= */

function populateFilters() {

  const categoryFilter =
    $("categoryFilter");

  const locationFilter =
    $("locationFilter");


  const categories =
    new Map();

  const locations =
    new Map();


  productRecords.forEach(row => {

    const category =
      String(
        row.category || ""
      ).trim();


    const location =
      String(
        row.store_location || ""
      ).trim();


    if (category) {

      const key =
        category.toLowerCase();


      if (!categories.has(key)) {

        categories.set(
          key,
          category
        );

      }

    }


    if (location) {

      const key =
        location.toLowerCase();


      if (!locations.has(key)) {

        locations.set(
          key,
          location
        );

      }

    }

  });


  /* -----------------------------------------------------
     CATEGORY DROPDOWN
  ----------------------------------------------------- */

  categoryFilter.innerHTML = `
    <option value="all">
      All Categories
    </option>
  `;


  Array.from(
    categories.values()
  )
    .sort((a, b) =>
      a.localeCompare(b)
    )
    .forEach(category => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        category;


      option.textContent =
        category;


      categoryFilter.appendChild(
        option
      );

    });


  /* -----------------------------------------------------
     LOCATION DROPDOWN
  ----------------------------------------------------- */

  locationFilter.innerHTML = `
    <option value="all">
      All Locations
    </option>
  `;


  Array.from(
    locations.values()
  )
    .sort((a, b) =>
      a.localeCompare(b)
    )
    .forEach(location => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        location;


      option.textContent =
        location;


      locationFilter.appendChild(
        option
      );

    });

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

  const search =
    String(
      $("searchInput").value || ""
    )
      .trim()
      .toLowerCase();


  const category =
    $("categoryFilter").value;


  const location =
    $("locationFilter").value;


  const status =
    $("statusFilter").value;


  const filtered =
    productRecords.filter(row => {


      const productName =
        String(
          row.product_name || ""
        )
          .trim()
          .toLowerCase();


      const productId =
        String(
          row.product || ""
        )
          .trim()
          .toLowerCase();


      const categoryName =
        String(
          row.category || ""
        )
          .trim()
          .toLowerCase();


      const brand =
        String(
          row.brand || ""
        )
          .trim()
          .toLowerCase();


      const rowLocation =
        String(
          row.store_location || ""
        )
          .trim()
          .toLowerCase();


      const supplier =
        String(
          row.supplier || ""
        )
          .trim()
          .toLowerCase();


      const matchesSearch =
        !search ||

        productName.includes(search) ||

        productId.includes(search) ||

        categoryName.includes(search) ||

        brand.includes(search) ||

        rowLocation.includes(search) ||

        supplier.includes(search);


      const matchesCategory =
        category === "all" ||

        String(
          row.category || ""
        ).trim() === category;


      const matchesLocation =
        location === "all" ||

        String(
          row.store_location || ""
        ).trim() === location;


      const rowStatus =
        getStockStatus(
          row.inventory,
          row.reorder_level
        );


      const matchesStatus =
        status === "all" ||
        rowStatus === status;


      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesStatus
      );

    });


  renderProducts(
    filtered
  );

}


/* =========================================================
   RENDER PRODUCT TABLE
========================================================= */

function renderProducts(records) {

  const tbody =
    $("productsTableBody");


  const emptyState =
    $("emptyState");


  const resultCount =
    $("resultCount");


  tbody.innerHTML = "";


  if (!records.length) {

    emptyState.classList.remove(
      "hidden"
    );


    resultCount.textContent =
      "0 products found";


    return;

  }


  emptyState.classList.add(
    "hidden"
  );


  resultCount.textContent =
    `${records.length} product-location records`;


  records.forEach(row => {

    const tr =
      document.createElement(
        "tr"
      );


    const productId =
      String(
        row.product || "—"
      );


    const productName =
      String(
        row.product_name || "Unknown"
      );


    const category =
      String(
        row.category || "—"
      );


    const brand =
      String(
        row.brand || "—"
      );


    const price =
      Number(
        row.unit_price || 0
      );


    const inventory =
      Number(
        row.inventory || 0
      );


    const reorderLevel =
      Number(
        row.reorder_level || 0
      );


    const location =
      String(
        row.store_location || "—"
      );


    const supplier =
      String(
        row.supplier || "—"
      );


    const status =
      getStockStatus(
        inventory,
        reorderLevel
      );


    let statusText =
      "Safe";


    if (status === "warning") {

      statusText =
        "Warning";

    }

    else if (status === "critical") {

      statusText =
        "Critical";

    }


    tr.innerHTML = `

      <td>

        <span class="product-name">
          ${escapeHTML(productName)}
        </span>

        <span class="product-id">
          ${escapeHTML(productId)}
        </span>

      </td>


      <td>
        ${escapeHTML(category)}
      </td>


      <td>
        ${escapeHTML(brand)}
      </td>


      <td class="price">

        ₹${price.toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 2
          }
        )}

      </td>


      <td class="inventory-value">

        ${formatNumber(inventory)}

      </td>


      <td class="reorder-value">

        ${formatNumber(reorderLevel)}

      </td>


      <td>

        ${escapeHTML(location)}

      </td>


      <td>

        ${escapeHTML(supplier)}

      </td>


      <td>

        <span
          class="status-badge status-${status}"
        >
          ${statusText}
        </span>

      </td>

    `;


    tbody.appendChild(
      tr
    );

  });

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    loadProducts();


    $("refreshBtn")
      .addEventListener(
        "click",
        loadProducts
      );


    $("searchInput")
      .addEventListener(
        "input",
        applyFilters
      );


    $("categoryFilter")
      .addEventListener(
        "change",
        applyFilters
      );


    $("locationFilter")
      .addEventListener(
        "change",
        applyFilters
      );


    $("statusFilter")
      .addEventListener(
        "change",
        applyFilters
      );

  }
);