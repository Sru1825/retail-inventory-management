CREATE DATABASE IF NOT EXISTS retail_db;
USE retail_db;

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2)
);

CREATE TABLE IF NOT EXISTS stores (
    store_id INT AUTO_INCREMENT PRIMARY KEY,
    store_location VARCHAR(150) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    store_id INT NOT NULL,
    sale_date DATE NOT NULL,
    units_sold INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    store_id INT NOT NULL,
    inventory_date DATE NOT NULL,
    inventory_level INT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (store_id) REFERENCES stores(store_id)
);
