const API_BASE = "http://127.0.0.1:5000";

let retailData = [];
let productGroups = [];
let chart = null;

const $ = (id) => document.getElementById(id);

function formatNumber(value) {
    const n = Number(value);

    if (!Number.isFinite(n)) {
        return "—";
    }

    return n.toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });
}

function showError(message) {
    if ($("errorBox")) {
        $("errorBox").textContent = message;
        $("errorBox").classList.remove("hidden");
    }
}

function clearError() {
    if ($("errorBox")) {
        $("errorBox").classList.add("hidden");
    }
}


/* =====================================================
   GROUP DATABASE DATA
   ===================================================== */

function groupData() {

    const map = new Map();

    retailData.forEach(row => {

        const product =
            String(row.product_name || "").trim();

        const location =
            String(row.store_location || "").trim();

        if (!product || !location) {
            return;
        }

        const key =
            `${product.toLowerCase()}|||${location.toLowerCase()}`;

        if (!map.has(key)) {

            map.set(key, {
                product,
                location,
                rows: []
            });

        }

        map.get(key).rows.push(row);

    });


    productGroups =
        Array.from(map.values());


    productGroups.forEach(group => {

        group.rows.sort((a, b) =>
            new Date(a.date || 0) -
            new Date(b.date || 0)
        );

    });

}


/* =====================================================
   PRODUCT DROPDOWN
   ===================================================== */

function populateProducts() {

    const productMap = new Map();

    productGroups.forEach(group => {

        const key =
            group.product.trim().toLowerCase();

        if (!productMap.has(key)) {

            productMap.set(
                key,
                group.product.trim()
            );

        }

    });


    const products =
        [...productMap.values()]
            .sort((a, b) =>
                a.localeCompare(b)
            );


    $("productSelect").innerHTML =
        '<option value="">Select a product</option>' +

        products.map(product =>
            `<option value="${escapeHtml(product)}">
                ${escapeHtml(product)}
            </option>`
        ).join("");

}


/* =====================================================
   STORE LOCATION DROPDOWN
   ===================================================== */

function populateLocations() {

    const product =
        $("productSelect").value;


    const locationMap = new Map();


    productGroups
        .filter(group =>
            !product ||
            group.product.toLowerCase() ===
            product.toLowerCase()
        )
        .forEach(group => {

            const cleanLocation =
                group.location.trim();

            const key =
                cleanLocation.toLowerCase();


            if (!locationMap.has(key)) {

                locationMap.set(
                    key,
                    cleanLocation
                );

            }

        });


    const locations =
        [...locationMap.values()]
            .sort((a, b) =>
                a.localeCompare(b)
            );


    $("locationSelect").innerHTML =
        '<option value="">Select a store</option>' +

        locations.map(location =>
            `<option value="${escapeHtml(location)}">
                ${escapeHtml(location)}
            </option>`
        ).join("");


    updatePreview();

}


/* =====================================================
   GET SELECTED PRODUCT + STORE GROUP
   ===================================================== */

function getSelectedGroup() {

    const product =
        $("productSelect").value;

    const location =
        $("locationSelect").value;


    if (!product || !location) {
        return null;
    }


    return productGroups.find(group =>

        group.product.toLowerCase() ===
        product.toLowerCase()

        &&

        group.location.toLowerCase() ===
        location.toLowerCase()

    );

}


/* =====================================================
   INPUT PREVIEW
   ===================================================== */

function updatePreview() {

    const group =
        getSelectedGroup();


    if (!group) {

        $("historyCount").textContent = "—";
        $("currentInventory").textContent = "—";
        $("reorderLevel").textContent = "—";
        $("latestSale").textContent = "—";


        if ($("intelProduct"))
            $("intelProduct").textContent = "—";

        if ($("intelHistory"))
            $("intelHistory").textContent = "—";

        if ($("intelDate"))
            $("intelDate").textContent = "—";

        if ($("intelLocation"))
            $("intelLocation").textContent = "—";

        if ($("intelInventory"))
            $("intelInventory").textContent = "—";


        return;
    }


    const rows =
        group.rows;


    const latest =
        rows[rows.length - 1];


    /* ---------------------------------------------
       Basic input preview
       --------------------------------------------- */

    $("historyCount").textContent =
        Math.min(rows.length, 7);


    $("currentInventory").textContent =
        formatNumber(
            latest.inventory
        );


    $("reorderLevel").textContent =
        formatNumber(
            latest.reorder_level
        );


    $("latestSale").textContent =
        formatNumber(
            latest.sales
        );


    /* ---------------------------------------------
       Input Intelligence
       --------------------------------------------- */

    if ($("intelProduct")) {

        $("intelProduct").textContent =
            group.product;

    }


    if ($("intelHistory")) {

        $("intelHistory").textContent =
            `${Math.min(rows.length, 7)} observations`;

    }


    if ($("intelDate")) {

        const selectedDate =
            $("forecastDate").value;

        $("intelDate").textContent =
            selectedDate
                ? selectedDate
                    .split("-")
                    .reverse()
                    .join("-")
                : "—";

    }


    if ($("intelLocation")) {

        $("intelLocation").textContent =
            group.location;

    }


    if ($("intelInventory")) {

        $("intelInventory").textContent =
            `${formatNumber(
                latest.inventory
            )} units`;

    }

}


/* =====================================================
   BUILD LAST 7 HISTORICAL SALES
   ===================================================== */

function buildHistory(group) {

    return group.rows

        .filter(row =>
            Number.isFinite(
                Number(row.sales)
            )
        )

        .slice(-7)

        .map(row => ({

            date: row.date,

            sales:
                Number(
                    row.sales
                )

        }));

}


/* =====================================================
   GENERATE FORECAST
   ===================================================== */

async function generateForecast() {

    clearError();


    const group =
        getSelectedGroup();


    const date =
        $("forecastDate").value;


    if (!group) {

        showError(
            "Please select both a product and store location."
        );

        return;

    }


    if (!date) {

        showError(
            "Please select a forecast date."
        );

        return;

    }


    const history =
        buildHistory(group);


    if (!history.length) {

        showError(
            "No valid historical sales data is available for this selection."
        );

        return;

    }


    /* ---------------------------------------------
       Current inventory
       --------------------------------------------- */

    const latest =
        group.rows[
            group.rows.length - 1
        ];


    const inventory =
        Number(
            latest.inventory
        );


    /* ---------------------------------------------
       Button loading
       --------------------------------------------- */

    const button =
        $("forecastBtn");


    button.disabled = true;


    const buttonSpan =
        button.querySelector("span");


    if (buttonSpan) {

        buttonSpan.textContent =
            "Generating forecast...";

    }


    try {

        const response =
            await fetch(
                `${API_BASE}/api/predict`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        product:
                            group.product,

                        historical_sales:
                            history.map(
                                x => x.sales
                            ),

                        date:
                            date,

                        store_location:
                            group.location,

                        inventory_level:
                            inventory

                    })

                }
            );


        const result =
            await response.json();


        console.log(
            "FORECAST API RESPONSE:",
            result
        );


        if (
            !response.ok ||
            result.status !== "success"
        ) {

            throw new Error(
                result.message ||
                "Forecast request failed."
            );

        }


        renderResult(
            result,
            history,
            group
        );

    }


    catch (error) {

        console.error(
            "Forecast Error:",
            error
        );


        showError(
            error.message ||
            "Unable to generate forecast."
        );

    }


    finally {

        button.disabled = false;


        if (buttonSpan) {

            buttonSpan.textContent =
                "Generate Demand Forecast";

        }

    }

}


/* =====================================================
   RENDER FORECAST RESULT
   ===================================================== */

function renderResult(
    result,
    history,
    group
) {

    const out =
        result?.outputs;


    if (!out) {

        throw new Error(
            "Forecast API did not return outputs."
        );

    }


    /* ---------------------------------------------
       Forecast KPIs
       --------------------------------------------- */

    $("predictedDemand").textContent =
        Math.round(
            Number(
                out.predicted_demand
            )
        );


    $("salesForecast").textContent =
        Math.round(
            Number(
                out.sales_forecast
            )
        );


    $("restockQuantity").textContent =
        formatNumber(
            out.restock_quantity
        );


    $("reorderPoint").textContent =
        formatNumber(
            out.reorder_point
        );


    /* ---------------------------------------------
       Product + Location
       --------------------------------------------- */

    $("resultProduct").textContent =
        `${group.product} • ${group.location}`;


    /* ---------------------------------------------
       Inventory Signal
       --------------------------------------------- */

    const alertLevel =
        String(
            out.inventory_alert ||
            "NORMAL"
        );


    $("signalValue").textContent =
        alertLevel;


    $("signalMessage").textContent =
        out.alert_message ||
        "Inventory level is within the expected range.";


    $("alertBadge").textContent =
        alertLevel;


    $("alertBadge").className =
        `status ${alertLevel.toLowerCase()}`;


    /* ---------------------------------------------
       Current Inventory
       --------------------------------------------- */

    const latest =
        group.rows[
            group.rows.length - 1
        ];


    const inventory =
        Number(
            latest.inventory
        );


    const demand =
        Number(
            out.predicted_demand
        );


    /* ---------------------------------------------
       Inventory Coverage
       --------------------------------------------- */

    const coverage =
        demand > 0
            ? inventory / demand
            : 0;


    $("coverageValue").textContent =
        demand > 0
            ? `${coverage.toFixed(1)}× demand`
            : "—";


    const fill =
        Math.min(
            100,
            Math.max(
                0,
                coverage / 14 * 100
            )
        );


    $("signalFill").style.width =
        `${fill}%`;


    /* ---------------------------------------------
       Restocking Decision
       --------------------------------------------- */

    $("decisionStock").textContent =
        formatNumber(
            inventory
        );


    $("decisionDemand").textContent =
        formatNumber(
            demand
        );


    $("decisionRestock").textContent =
        formatNumber(
            out.restock_quantity
        );


    /* ---------------------------------------------
       Restock Message
       --------------------------------------------- */

    if (
        Number(
            out.restock_quantity
        ) > 0
    ) {

        $("decisionText").textContent =
            "Restock recommended";

        $("decisionIcon").textContent =
            "↑";

        $("decisionIcon").style.background =
            "#fff5e7";

        $("decisionIcon").style.color =
            "#e58b20";

    }

    else {

        $("decisionText").textContent =
            "No immediate restock";

        $("decisionIcon").textContent =
            "✓";

        $("decisionIcon").style.background =
            "#eaf8f2";

        $("decisionIcon").style.color =
            "#0f9d72";

    }


    $("decisionMessage").textContent =
        out.alert_message ||
        "Inventory level is within the expected range.";


    /* ---------------------------------------------
       Chart
       --------------------------------------------- */

    renderChart(
        history,
        demand
    );

}


/* =====================================================
   HISTORICAL SALES + FORECAST CHART
   ===================================================== */

function renderChart(
    history,
    forecast
) {

    const ctx =
        $("forecastChart");


    if (!ctx) return;


    if (chart) {
        chart.destroy();
    }


    chart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels:
                        history.map(
                            (x, i) => {

                                if (!x.date) {
                                    return `Obs ${i + 1}`;
                                }


                                const d =
                                    new Date(
                                        x.date
                                    );


                                if (
                                    isNaN(
                                        d.getTime()
                                    )
                                ) {
                                    return `Obs ${i + 1}`;
                                }


                                return d.toLocaleDateString(
                                    "en-IN",
                                    {
                                        day: "2-digit",
                                        month: "short"
                                    }
                                );

                            }
                        ),


                    datasets: [

                        {

                            label:
                                "Historical sales",

                            data:
                                history.map(
                                    x => x.sales
                                ),

                            borderWidth: 2,

                            tension: 0.35,

                            pointRadius: 3,

                            pointHoverRadius: 5

                        },


                        {

                            label:
                                "Predicted demand",

                            data:
                                history.map(
                                    (_, i) =>
                                        i ===
                                        history.length - 1
                                            ? forecast
                                            : null
                                ),

                            borderWidth: 3,

                            pointRadius: 6,

                            pointHoverRadius: 7,

                            borderDash: [6, 5]

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        intersect: false,

                        mode: "index"

                    },

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle: true,

                                boxWidth: 7,

                                font: {
                                    size: 10
                                }

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {

                                font: {
                                    size: 9
                                }

                            }

                        },

                        y: {

                            beginAtZero: true,

                            grid: {

                                color:
                                    "#edf0f4"

                            },

                            ticks: {

                                font: {
                                    size: 9
                                }

                            }

                        }

                    }

                }

            }
        );

}


/* =====================================================
   LOAD DATA FROM FLASK
   ===================================================== */

async function loadData() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/dashboard`
            );


        if (!response.ok) {

            throw new Error(
                "Unable to connect to Flask backend."
            );

        }


        retailData =
            await response.json();


        if (
            !Array.isArray(retailData) ||
            retailData.length === 0
        ) {

            throw new Error(
                "No retail data was returned by the backend."
            );

        }


        console.log(
            "Forecast data loaded:",
            retailData.length
        );


        /* -----------------------------------------
           Prepare data
           ----------------------------------------- */

        groupData();

        populateProducts();

        updatePreview();


        console.log(
            "Forecast product groups:",
            productGroups.length
        );


    }

    catch (error) {

        console.error(
            "Forecast data loading error:",
            error
        );


        showError(
            `${error.message} Make sure Flask is running on port 5000.`
        );

    }

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function escapeHtml(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/* =====================================================
   EVENT LISTENERS
   ===================================================== */

$("productSelect")
    .addEventListener(
        "change",
        populateLocations
    );


$("locationSelect")
    .addEventListener(
        "change",
        updatePreview
    );


$("forecastDate")
    .addEventListener(
        "change",
        updatePreview
    );


$("forecastBtn")
    .addEventListener(
        "click",
        generateForecast
    );


/* =====================================================
   DEFAULT FORECAST DATE
   ===================================================== */

const today =
    new Date();


today.setMinutes(
    today.getMinutes() -
    today.getTimezoneOffset()
);


$("forecastDate").value =
    today
        .toISOString()
        .slice(0, 10);


/* =====================================================
   START APPLICATION
   ===================================================== */

loadData();