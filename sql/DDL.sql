CREATE TABLE Vehicle_Status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(20) NOT NULL UNIQUE,
    is_dispatchable BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO Vehicle_Status (status_name, is_dispatchable) VALUES
('Available', TRUE),
('On Trip', FALSE),
('In Shop', FALSE),
('Retired', FALSE);

-- Driver status lookup
CREATE TABLE Driver_Status (
    status_id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(20) NOT NULL UNIQUE,
    is_assignable BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO Driver_Status (status_name, is_assignable) VALUES
('Available', TRUE),
('On Trip', FALSE),
('Off Duty', FALSE),
('Suspended', FALSE);

-- Vehicle master table
CREATE TABLE Vehicle (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    model_name VARCHAR(50) NOT NULL,
    vehicle_type VARCHAR(30) NOT NULL,
    max_load_capacity DECIMAL(10,2) NOT NULL,
    odometer DECIMAL(10,2) NOT NULL DEFAULT 0,
    acquisition_cost DECIMAL(12,2) NOT NULL,
    status_id INT NOT NULL,
    FOREIGN KEY (status_id) REFERENCES Vehicle_Status(status_id)
);

-- Driver master table
CREATE TABLE Driver (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(30) NOT NULL UNIQUE,
    license_category VARCHAR(20) NOT NULL,
    license_expiry_date DATE NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    safety_score INT NOT NULL DEFAULT 100 CHECK (safety_score BETWEEN 0 AND 100),
    status_id INT NOT NULL,
    FOREIGN KEY (status_id) REFERENCES Driver_Status(status_id)
);
-- Trip
CREATE TABLE Trip (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    driver_id INT NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    cargo_weight DECIMAL(10,2) NOT NULL,
    planned_distance DECIMAL(10,2) NOT NULL,
    final_odometer DECIMAL(10,2),
    fuel_consumed DECIMAL(10,2),
    trip_status ENUM('Draft','Dispatched','Completed','Cancelled') NOT NULL DEFAULT 'Draft',
    dispatched_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id)
);

-- Maintenance
CREATE TABLE Maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    description VARCHAR(200) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    service_date DATE NOT NULL,
    maintenance_status ENUM('Active','Closed') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id)
);

-- Fuel_Log
CREATE TABLE Fuel_Log (
    fuel_log_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    trip_id INT NULL,
    liters DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL,
    log_date DATE NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);

-- Expense
CREATE TABLE Expense (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    trip_id INT NULL,
    expense_type VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES Vehicle(vehicle_id),
    FOREIGN KEY (trip_id) REFERENCES Trip(trip_id)
);