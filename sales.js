const API_BASE = "http://127.0.0.1:5000";

const $ = (id) => document.getElementById(id);

let monthlySalesChart = null;
let locationSalesChart = null;
let topProductsChart = null;


/* =========================
   NUMBER FORMAT
   ========================= */

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });
}


/* =========================
   LOAD SALES DATA
   ========================= */

async function loadSalesAnalytics() {

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

        if ($("backendStatus")) {
            $("backendStatus").textContent = "Checking...";
        }

        if ($("dataStatus")) {
            $("dataStatus").textContent = "Checking...";
        }


        /* =========================
           FETCH BACKEND DATA
           ========================= */

        const response = await fetch(
            `${API_BASE}/api/dashboard`
        );

        if (!response.ok) {
            throw new Error(
                `Sales API error: HTTP ${response.status}`
            );
        }

        const data = await response.json();

        console.log("SALES ANALYTICS DATA:", data);


        if (!Array.isArray(data)) {
            throw new Error(
                "Sales API did not return an array."
            );
        }


        /* =========================
           BASIC CALCULATIONS
           ========================= */

        const products = new Set();
        const stores = new Set();

        let totalSales = 0;


        data.forEach(row => {

            // Correct lowercase backend fields
            const product = String(
                row.product_name || ""
            ).trim();

            const location = String(
                row.store_location || ""
            ).trim();

            const sales = Number(
                row.sales || 0
            );


            if (product) {
                products.add(product);
            }

            if (location) {
                stores.add(location);
            }

            totalSales += sales;

        });


        /* =========================
           KPI VALUES
           ========================= */

        if ($("totalSales")) {
            $("totalSales").textContent =
                formatNumber(totalSales);
        }

        if ($("productsTracked")) {
            $("productsTracked").textContent =
                formatNumber(products.size);
        }

        if ($("storesTracked")) {
            $("storesTracked").textContent =
                formatNumber(stores.size);
        }

        if ($("salesRecords")) {
            $("salesRecords").textContent =
                formatNumber(data.length);
        }


        if ($("backendStatus")) {
            $("backendStatus").textContent =
                "Connected";
        }

        if ($("dataStatus")) {
            $("dataStatus").textContent =
                `${data.length} records loaded`;
        }


        /* =========================
           CREATE CHARTS
           ========================= */

        createMonthlySalesChart(data);

        createLocationSalesChart(data);

        createTopProductsChart(data);


        console.log(
            "Sales Analytics loaded successfully."
        );

    }

    catch (error) {

        console.error(
            "SALES ANALYTICS ERROR:",
            error
        );

        if ($("backendStatus")) {
            $("backendStatus").textContent =
                "Offline";
        }

        if ($("dataStatus")) {
            $("dataStatus").textContent =
                "Unavailable";
        }

        if (errorBox) {
            errorBox.textContent =
                `Unable to load sales data: ${error.message}`;

            errorBox.classList.remove("hidden");
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


/* =========================
   MONTHLY SALES CHART
   ========================= */

function createMonthlySalesChart(data) {

    const canvas = $("monthlySalesChart");

    if (!canvas) return;


    const monthlySales = {};


    data.forEach(row => {

        const rawDate = row.date;

        if (!rawDate) return;


        let date;


        // Backend may return date as timestamp
        if (typeof rawDate === "number") {

            date = new Date(rawDate);

        }

        // Or date may be a string
        else {

            date = new Date(rawDate);

        }


        if (isNaN(date.getTime())) {
            return;
        }


        const monthKey =
            `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;


        const sales =
            Number(row.sales || 0);


        monthlySales[monthKey] =
            (monthlySales[monthKey] || 0) +
            sales;

    });


    const months =
        Object.keys(monthlySales).sort();


    const labels =
        months.map(month => {

            const [
                year,
                monthNumber
            ] = month.split("-");


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
            month => monthlySales[month]
        );


    console.log(
        "MONTHLY SALES:",
        monthlySales
    );


    if (monthlySalesChart) {
        monthlySalesChart.destroy();
    }


    monthlySalesChart =
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

                                        return (
                                            "Sales: " +
                                            Number(
                                                context.raw
                                            ).toLocaleString(
                                                "en-IN"
                                            )
                                        );

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
   LOCATION SALES CHART
   ========================= */

function createLocationSalesChart(data) {

    const canvas =
        $("locationSalesChart");

    if (!canvas) return;


    const locationSales = {};


    data.forEach(row => {

        const location =
            String(
                row.store_location ||
                "Unknown"
            ).trim();


        const sales =
            Number(
                row.sales || 0
            );


        locationSales[location] =
            (
                locationSales[location] || 0
            ) + sales;

    });


    const sortedLocations =
        Object.entries(locationSales)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


    const labels =
        sortedLocations.map(
            item => item[0]
        );


    const values =
        sortedLocations.map(
            item => item[1]
        );


    if (locationSalesChart) {
        locationSalesChart.destroy();
    }


    locationSalesChart =
        new Chart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: labels,

                    datasets: [{

                        data: values,

                        borderWidth: 0

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "65%",

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
   TOP PRODUCTS
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
        Object.entries(productSales)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )
            .slice(0, 10);


    const labels =
        sortedProducts.map(
            item => item[0]
        );


    const values =
        sortedProducts.map(
            item => item[1]
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

                    indexAxis: "y",

                    plugins: {

                        legend: {

                            display: false

                        }

                    },

                    scales: {

                        x: {

                            beginAtZero: true

                        }

                    }

                }

            }
        );

}


/* =========================
   PAGE INITIALIZATION
   ========================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        loadSalesAnalytics();


        const refreshBtn =
            $("refreshBtn");


        if (refreshBtn) {

            refreshBtn.addEventListener(
                "click",
                loadSalesAnalytics
            );

        }

    }
);