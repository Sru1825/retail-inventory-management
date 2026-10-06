from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pandas as pd
import numpy as np

from db_connection import get_db_connection

load_dotenv()

app = Flask(__name__)
CORS(app)


# ============================================================
# CONFIGURATION
# ============================================================

DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "retail_sales.csv"
)


# ============================================================
# DATA LOADING & CLEANING
# ============================================================

def load_data():

    connection = get_db_connection()

    query = """
    SELECT
        product_id AS product,
        product_name AS product_name,
        category AS category,
        brand AS brand,
        sale_date AS date,
        store_id AS store_id,
        store_location AS store_location,
        sales_quantity AS sales,
        unit_price AS unit_price,
        inventory_level AS inventory,
        reorder_level AS reorder_level,
        discount AS discount,
        holiday AS holiday,
        weather AS weather,
        revenue AS revenue,
        supplier AS supplier,
        reorder_required AS reorder_required
    FROM retail_sales
    """

    try:
        df = pd.read_sql(query, connection)

    finally:
        connection.close()

    # --------------------------------------------------------
    # Clean data
    # --------------------------------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    )

    df["sales"] = pd.to_numeric(
        df["sales"],
        errors="coerce"
    ).fillna(0)

    df["inventory"] = pd.to_numeric(
        df["inventory"],
        errors="coerce"
    ).fillna(0)

    df["product_name"] = (
        df["product_name"]
        .fillna("Unknown Product")
        .astype(str)
    )

    df["store_location"] = (
        df["store_location"]
        .fillna("Unknown Store")
        .astype(str)
    )

    return df


# ============================================================
# FORECASTING LOGIC
# ============================================================

def calculate_forecast(sales_series):
    """
    Simple baseline forecasting.

    Uses the average of the latest 7 valid sales observations.
    """

    values = pd.to_numeric(
        pd.Series(sales_series),
        errors="coerce"
    ).dropna()

    if values.empty:
        return 0.0

    return round(
        float(values.tail(7).mean()),
        2
    )


# ============================================================
# INVENTORY RECOMMENDATION
# ============================================================

def inventory_recommendation(
    predicted_demand,
    current_inventory
):

    # 3 days of expected demand + 20% safety stock
    reorder_point = (
        predicted_demand * 3 * 1.20
    )

    restock_quantity = max(
        0,
        int(
            np.ceil(
                reorder_point - current_inventory
            )
        )
    )

    # --------------------------------------------------------
    # Alert classification
    # --------------------------------------------------------

    if current_inventory <= reorder_point * 0.50:

        alert = "CRITICAL"

        message = (
            "Stock is very low. "
            "Restock immediately."
        )

    elif current_inventory <= reorder_point:

        alert = "WARNING"

        message = (
            "Stock is below the recommended "
            "level. Restock soon."
        )

    elif current_inventory > predicted_demand * 14:

        alert = "OVERSTOCK"

        message = (
            "Inventory is high compared "
            "with expected demand."
        )

    else:

        alert = "NORMAL"

        message = (
            "Inventory level is healthy."
        )

    return {
        "reorder_point": round(
            reorder_point,
            2
        ),

        "restock_quantity": restock_quantity,

        "alert_level": alert,

        "alert_message": message
    }


# ============================================================
# BUILD FORECAST
# ============================================================

def build_forecast():

    df = load_data()

    results = []

    if df.empty:
        return results

    # Group by product and store
    for (
        product,
        location
    ), group in df.groupby(
        [
            "product_name",
            "store_location"
        ]
    ):

        # Sort according to date
        group = group.sort_values(
            "date"
        )

        # Calculate predicted demand
        predicted = calculate_forecast(
            group["sales"]
        )

        # Latest inventory value
        inventory = float(
            group["inventory"].iloc[-1]
        )

        # Inventory recommendation
        recommendation = inventory_recommendation(
            predicted,
            inventory
        )

        results.append({

            "product": product,

            "store_location": location,

            "predicted_demand": predicted,

            "sales_forecast": predicted,

            "current_inventory": round(
                inventory,
                2
            ),

            **recommendation
        })

    return results


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return jsonify({

        "project":
        "Retail Sales Demand Forecasting and Inventory Management System",

        "status":
        "Backend is running successfully",

        "version":
        "1.0"
    })


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():

    return jsonify({

        "status": "healthy",

        "service": "retail-backend"
    })


# ============================================================
# GET DATA
# ============================================================

@app.get("/api/data")
def get_data():

    df = load_data()

    if df.empty:

        return jsonify({
            "count": 0,
            "data": []
        })

    result = df.copy()

    # Convert date to API-friendly string
    result["date"] = pd.to_datetime(
        result["date"],
        errors="coerce"
    ).dt.strftime(
        "%Y-%m-%d"
    )

    # Keep only fields required by frontend
    result = result[
        [
            "product",
            "date",
            "store_location",
            "sales",
            "inventory"
        ]
    ]

    return jsonify({

        "count": len(result),

        "data":
        result.to_dict(
            orient="records"
        )
    })


# ============================================================
# FORECAST API
# ============================================================

@app.get("/api/forecast")
def get_forecast():

    results = build_forecast()

    return jsonify({

        "count": len(results),

        "forecast": results
    })


# ============================================================
# SUMMARY API
# ============================================================

@app.get("/api/summary")
def get_summary():

    df = load_data()

    forecasts = build_forecast()

    total_sales = (
        float(df["sales"].sum())
        if not df.empty
        else 0
    )

    total_inventory = (
        float(df["inventory"].sum())
        if not df.empty
        else 0
    )

    critical = sum(

        1
        for item in forecasts

        if item["alert_level"]
        == "CRITICAL"
    )

    warning = sum(

        1
        for item in forecasts

        if item["alert_level"]
        == "WARNING"
    )

    overstock = sum(

        1
        for item in forecasts

        if item["alert_level"]
        == "OVERSTOCK"
    )

    normal = sum(

        1
        for item in forecasts

        if item["alert_level"]
        == "NORMAL"
    )

    return jsonify({

        "total_sales":
        round(
            total_sales,
            2
        ),

        "total_inventory":
        round(
            total_inventory,
            2
        ),

        "products_tracked":
        len(forecasts),

        "critical_alerts":
        critical,

        "warning_alerts":
        warning,

        "overstock_alerts":
        overstock,

        "normal_products":
        normal
    })


# ============================================================
# MANUAL PREDICTION API
# ============================================================

@app.post("/api/predict")
def predict():

    data = request.get_json(
        silent=True
    ) or {}

    required_fields = [

        "product",

        "historical_sales",

        "date",

        "store_location",

        "inventory_level"
    ]

    # --------------------------------------------------------
    # Check missing fields
    # --------------------------------------------------------

    missing = [

        field
        for field in required_fields

        if field not in data
    ]

    if missing:

        return jsonify({

            "status": "error",

            "message":
            "Required input fields are missing.",

            "missing_fields":
            missing

        }), 400

    historical_sales = (
        data["historical_sales"]
    )

    # --------------------------------------------------------
    # Validate historical sales
    # --------------------------------------------------------

    if (

        not isinstance(
            historical_sales,
            list
        )

        or len(
            historical_sales
        ) == 0

    ):

        return jsonify({

            "status": "error",

            "message":
            "historical_sales must be a non-empty list."

        }), 400

    sales = pd.to_numeric(

        pd.Series(
            historical_sales
        ),

        errors="coerce"

    ).dropna()

    if sales.empty:

        return jsonify({

            "status": "error",

            "message":
            "No valid historical sales values were provided."

        }), 400

    # --------------------------------------------------------
    # Validate inventory
    # --------------------------------------------------------

    try:

        inventory = float(
            data["inventory_level"]
        )

    except (
        TypeError,
        ValueError
    ):

        return jsonify({

            "status": "error",

            "message":
            "inventory_level must be a number."

        }), 400

    # --------------------------------------------------------
    # Calculate prediction
    # --------------------------------------------------------

    predicted = calculate_forecast(
        sales
    )

    recommendation = inventory_recommendation(

        predicted,

        inventory
    )

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return jsonify({

        "status": "success",

        "inputs": {

            "product":
            data["product"],

            "date":
            data["date"],

            "store_location":
            data["store_location"],

            "inventory_level":
            inventory
        },

        "outputs": {

            "predicted_demand":
            predicted,

            "sales_forecast":
            predicted,

            "restock_quantity":
            recommendation[
                "restock_quantity"
            ],

            "reorder_point":
            recommendation[
                "reorder_point"
            ],

            "inventory_alert":
            recommendation[
                "alert_level"
            ],

            "alert_message":
            recommendation[
                "alert_message"
            ]
        }
    })


# ============================================================
# DASHBOARD API
# ============================================================

@app.get("/api/dashboard")
def dashboard_data():

    data = load_data()

    return data.to_json(
        orient="records"
    )


# ============================================================
# RUN FLASK
# ============================================================

if __name__ == "__main__":

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True
    )