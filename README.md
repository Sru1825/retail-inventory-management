# Retail Sales Demand Forecasting and Inventory Management System

## Backend

### Inputs
1. Product details
2. Historical sales
3. Date
4. Store location
5. Inventory levels

### Outputs
1. Predicted demand
2. Restocking suggestions
3. Sales forecasting
4. Inventory alerts

## Technologies

- Python
- Flask
- Pandas
- NumPy
- MySQL (database structure prepared)
- REST API
- HTML/CSS/JavaScript can be connected later for the frontend

## Backend flow

Dataset
   ↓
Data Cleaning
   ↓
Historical Sales Analysis
   ↓
Demand Forecast
   ↓
Inventory Comparison
   ↓
Restocking Recommendation
   ↓
Inventory Alert

## Setup

### 1. Open the project folder

```text
C:\Users\divya\retail_backend
```

### 2. Install packages

```text
pip install -r requirements.txt
```

### 3. Run backend

```text
python app.py
```

### 4. Open in browser

```text
http://127.0.0.1:5000/
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | / | Backend status |
| GET | /api/health | Health check |
| GET | /api/data | Sales and inventory data |
| GET | /api/forecast | Demand + restocking + alerts |
| GET | /api/summary | Dashboard summary |
| POST | /api/predict | Prediction from frontend inputs |

## POST /api/predict example

```json
{
  "product": "Product A",
  "historical_sales": [20, 25, 22, 30, 28, 35, 32],
  "date": "2026-09-24",
  "store_location": "Visakhapatnam",
  "inventory_level": 40
}
```

## Forecasting method

The current version uses a simple 7-observation moving average as a baseline forecast. This is intentionally easy to understand and demonstrate during the initial project review.

Later, the same API can be connected to a trained Machine Learning model such as Random Forest, XGBoost, or another time-series approach.

## MySQL

`database.sql` contains the database and table structure for:

- Products
- Stores
- Sales
- Inventory

The current CSV-based backend is kept working independently so the team can test the API first. MySQL integration can then be connected without changing the frontend API design.
