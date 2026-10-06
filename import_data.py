import os
import pandas as pd
from db_connection import get_db_connection

# CSV file path
DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "retail_sales.csv"
)

# Read CSV
df = pd.read_csv(DATA_FILE)

# Connect to MySQL
connection = get_db_connection()
cursor = connection.cursor()

# Insert records
insert_query = """
INSERT INTO retail_sales
(product, sale_date, store_location, sales, inventory)
VALUES (%s, %s, %s, %s, %s)
"""

for _, row in df.iterrows():
    cursor.execute(
        insert_query,
        (
            row["product"],
            row["date"],
            row["store_location"],
            row["sales"],
            row["inventory"]
        )
    )

connection.commit()

print("Data imported successfully!")
print("Records inserted:", len(df))

cursor.close()
connection.close()