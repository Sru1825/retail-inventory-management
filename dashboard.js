const API_BASE = "http://127.0.0.1:5000";

const $ = (id) => document.getElementById(id);

let salesTrendChart = null;
let inventoryChart = null;
let topProductsChart = null;


/* =========================
   NUMBER FORMAT
========================= */

const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
};


/* =========================
   LOAD DASHBOARD
========================= */

async function loadDashboard() {

    const errorBox = $("errorBox");
    const refreshBtn = $("refreshBtn");

    if (refreshBtn) {
        refreshBtn.classList.add("refreshing");
        refreshBtn.textContent = "↻ Refreshing...";
        refreshBtn.disabled = true;
    }

    try {

        errorBox.classList.add("hidden");
        errorBox.textContent = "";

        $("backendStatus").textContent = "Checking...";
        $("dataStatus").textContent = "Checking...";


        /* =========================
           API REQUEST
        ========================= */

        const response = await fetch(
            `${API_BASE}/api/dashboard`
        );

        if (!response.ok) {
            throw new Error(
                `Dashboard API error: HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("DASHBOARD DATA:", data);


        if (!Array.isArray(data)) {
            throw new Error(
                "Dashboard API did not return an array."
            );
        }


        /* =========================
           BASIC CALCULATIONS
        ========================= */

        const products = new Set();

        let totalSales = 0;

        const latestRecords = new Map();


        data.forEach(row => {

            const product = String(
                row.product_name || ""
            ).trim();


            const location = String(
                row.store_location || ""
            ).trim();


            if (product) {
                products.add(product);
            }


            totalSales += Number(
                row.sales || 0
            );


            const key =
                `${product.toLowerCase()}|||${location.toLowerCase()}`;


            const currentDate =
                new Date(
                    Number(row.date || 0)
                );


            const previous =
                latestRecords.get(key);


            if (
                !previous ||
                currentDate >=
                new Date(
                    Number(previous.date || 0)
                )
            ) {

                latestRecords.set(
                    key,
                    row
                );

            }

        });


        /* =========================
           INVENTORY CALCULATIONS
        ========================= */

        let totalInventory = 0;

        let criticalAlerts = 0;

        let warningAlerts = 0;

        let safeProducts = 0;


        latestRecords.forEach(row => {

            const inventory =
                Number(
                    row.inventory || 0
                );


            const reorderLevel =
                Number(
                    row.reorder_level || 0
                );


            totalInventory += inventory;


            if (
                reorderLevel > 0 &&
                inventory <= reorderLevel
            ) {

                criticalAlerts++;

            }

            else if (
                reorderLevel > 0 &&
                inventory <=
                reorderLevel * 1.25
            ) {

                warningAlerts++;

            }

            else {

                safeProducts++;

            }

        });


        /* =========================
           UPDATE KPI CARDS
        ========================= */

        $("totalSales").textContent =
            formatNumber(
                totalSales
            );


        $("totalInventory").textContent =
            formatNumber(
                totalInventory
            );


        $("productsTracked").textContent =
            formatNumber(
                products.size
            );


        $("criticalAlerts").textContent =
            formatNumber(
                criticalAlerts
            );


        $("warningAlerts").textContent =
            formatNumber(
                warningAlerts
            );


        $("statusProducts").textContent =
            formatNumber(
                latestRecords.size
            );


        /* =========================
           INVENTORY STATUS MESSAGE
        ========================= */

        if (criticalAlerts > 0) {

            $("statusTitle").textContent =
                "Attention Required";


            $("statusText").textContent =
                `${criticalAlerts} product(s) are at or below their reorder level.`;

        }

        else if (warningAlerts > 0) {

            $("statusTitle").textContent =
                "Inventory Warning";


            $("statusText").textContent =
                `${warningAlerts} product(s) are approaching their reorder level.`;

        }

        else {

            $("statusTitle").textContent =
                "Inventory Healthy";


            $("statusText").textContent =
                "Current inventory levels are above reorder thresholds.";

        }


        /* =========================
           SYSTEM STATUS
        ========================= */

        $("backendStatus").textContent =
            "Connected";


        $("dataStatus").textContent =
            `${data.length} records loaded`;


        /* =========================
           CREATE CHARTS
        ========================= */

        createSalesTrendChart(
            data
        );


        createInventoryChart(
            safeProducts,
            warningAlerts,
            criticalAlerts
        );


        createTopProductsChart(
            data
        );


        console.log(
            "Dashboard + charts loaded successfully."
        );

    }


    catch (error) {

        console.error(
            "DASHBOARD ERROR:",
            error
        );


        $("backendStatus").textContent =
            "Offline";


        $("dataStatus").textContent =
            "Unavailable";


        errorBox.textContent =
            `Unable to load dashboard data: ${error.message}`;


        errorBox.classList.remove(
            "hidden"
        );

    }


    finally {

        if (refreshBtn) {

            refreshBtn.classList.remove(
                "refreshing"
            );


            refreshBtn.textContent =
                "↻ Refresh Data";


            refreshBtn.disabled =
                false;

        }

    }

}


/* =========================
   SALES TREND CHART
========================= */

function createSalesTrendChart(data) {

    const canvas =
        $("salesTrendChart");


    if (!canvas) return;


    const monthlySales = {};


    data.forEach(row => {

        const rawDate =
            Number(
                row.date
            );


        if (!rawDate) return;


        const date =
            new Date(
                rawDate
            );


        if (
            isNaN(
                date.getTime()
            )
        ) return;


        const monthKey =
            `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;


        const sales =
            Number(
                row.sales || 0
            );


        monthlySales[monthKey] =
            (
                monthlySales[monthKey] || 0
            ) + sales;

    });


    const months =
        Object.keys(
            monthlySales
        ).sort();


    const labels =
        months.map(month => {

            const [
                year,
                monthNumber
            ] =
                month.split("-");


            const date =
                new Date(
                    Number(year),
                    Number(monthNumber) - 1,
                    1
                );


            return date.toLocaleDateString(
                "en-US",
                {
                    month: "short",
                    year: "numeric"
                }
            );

        });


    const values =
        months.map(
            month =>
                monthlySales[month]
        );


    console.log(
        "MONTHLY SALES:",
        monthlySales
    );


    console.log(
        "SALES MONTHS:",
        months
    );


    console.log(
        "SALES VALUES:",
        values
    );


    if (salesTrendChart) {

        salesTrendChart.destroy();

    }


    salesTrendChart =
        new Chart(
            canvas,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [{

                        label: "Sales",

                        data: values,

                        borderWidth: 2,

                        tension: 0.35,

                        fill: true,

                        pointRadius: 3,

                        pointHoverRadius: 6

                    }]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(context) {

                                        return `Sales: ${Number(
                                            context.raw
                                        ).toLocaleString(
                                            "en-IN"
                                        )}`;

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            ticks: {

                                maxRotation: 0,

                                autoSkip: true,

                                maxTicksLimit: 12

                            }

                        },


                        y: {

                            beginAtZero: true,

                            ticks: {

                                callback:
                                    function(value) {

                                        return Number(
                                            value
                                        ).toLocaleString(
                                            "en-IN"
                                        );

                                    }

                            }

                        }

                    }

                }

            }
        );

}


/* =========================
   INVENTORY CHART
========================= */

function createInventoryChart(
    safe,
    warning,
    critical
) {

    const canvas =
        $("inventoryChart");


    if (!canvas) return;


    if (inventoryChart) {

        inventoryChart.destroy();

    }


    inventoryChart =
        new Chart(
            canvas,
            {

                type: "doughnut",


                data: {

                    labels: [
                        "Safe",
                        "Warning",
                        "Critical"
                    ],


                    datasets: [{

                        data: [
                            safe,
                            warning,
                            critical
                        ],


                        borderWidth: 0

                    }]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "68%",


                    plugins: {

                        legend: {

                            position: "bottom"

                        }

                    }

                }

            }
        );

}


/* =========================
   TOP PRODUCTS CHART
========================= */

function createTopProductsChart(data) {

    const canvas =
        $("topProductsChart");


    if (!canvas) return;


    const productSales = {};


    data.forEach(row => {

        const product =
            String(
                row.product_name ||
                "Unknown"
            ).trim();


        const sales =
            Number(
                row.sales || 0
            );


        productSales[product] =
            (
                productSales[product] || 0
            ) + sales;

    });


    const sortedProducts =
        Object.entries(
            productSales
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .slice(
            0,
            8
        );


    const labels =
        sortedProducts.map(
            item =>
                item[0]
        );


    const values =
        sortedProducts.map(
            item =>
                item[1]
        );


    if (topProductsChart) {

        topProductsChart.destroy();

    }


    topProductsChart =
        new Chart(
            canvas,
            {

                type: "bar",


                data: {

                    labels: labels,


                    datasets: [{

                        label: "Sales",

                        data: values,

                        borderWidth: 0,

                        borderRadius: 6

                    }]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    plugins: {

                        legend: {

                            display: false

                        }

                    },


                    scales: {

                        y: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


/* =========================
   PAGE LOAD
========================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadDashboard();


        const refreshBtn =
            $("refreshBtn");


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                loadDashboard
            );

        }

    }
);