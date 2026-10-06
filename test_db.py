from db_connection import get_db_connection

try:
    connection = get_db_connection()
    cursor = connection.cursor()

    cursor.execute("SELECT COUNT(*) FROM products")

    result = cursor.fetchone()

    print("MySQL connection successful!")
    print("Products count:", result[0])

    cursor.close()
    connection.close()

except Exception as e:
    print("MySQL error:", e)