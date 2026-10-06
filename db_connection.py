import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    connection = mysql.connector.connect(
        host="127.0.0.1",
        port=3306,
        user="root",
        password=os.getenv("MYSQL_PASSWORD"),
        database="retail_db"
    )

    print("Connected Database:", connection.database)

    return connection