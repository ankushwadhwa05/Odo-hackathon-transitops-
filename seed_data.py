"""
TransitOps seed data generator.
Populates Vehicle, Driver, Trip, Maintenance, Fuel_Log, Expense with
enough realistic rows to demo dashboard/analytics/triggers.

EDIT the DB_CONFIG block below with your actual MySQL credentials, then run:
    python seed_data.py
"""

import os
import random
from datetime import date, timedelta
import mysql.connector
from faker import Faker
from dotenv import load_dotenv

load_dotenv()

fake = Faker()
random.seed(42)

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "database": os.getenv("DB_NAME")
}

VEHICLE_TYPES = ["Van", "Truck", "Mini Truck", "Trailer"]
N_VEHICLES = 15
N_DRIVERS = 15
N_TRIPS = 40


def get_status_id(cursor, table, status_name):
    cursor.execute(f"SELECT status_id FROM {table} WHERE status_name = %s", (status_name,))
    return cursor.fetchone()[0]


def seed():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    available_v = get_status_id(cursor, "Vehicle_Status", "Available")
    available_d = get_status_id(cursor, "Driver_Status", "Available")

    # --- Vehicles ---
    vehicle_ids = []
    for i in range(N_VEHICLES):
        reg_no = f"PB-{random.randint(10,99)}-{fake.unique.random_int(1000,9999)}"
        cursor.execute("""
            INSERT INTO Vehicle (registration_number, model_name, vehicle_type,
                max_load_capacity, odometer, acquisition_cost, status_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            reg_no,
            f"{random.choice(['Tata','Ashok Leyland','Mahindra','Eicher'])} {fake.word().capitalize()}",
            random.choice(VEHICLE_TYPES),
            round(random.uniform(500, 5000), 2),
            round(random.uniform(1000, 80000), 2),
            round(random.uniform(500000, 2500000), 2),
            available_v
        ))
        vehicle_ids.append(cursor.lastrowid)

    # --- Drivers ---
    driver_ids = []
    for i in range(N_DRIVERS):
        cursor.execute("""
            INSERT INTO Driver (full_name, license_number, license_category,
                license_expiry_date, contact_number, safety_score, status_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
        """, (
            fake.name(),
            f"DL-{fake.unique.random_int(100000,999999)}",
            random.choice(["LMV", "HMV", "Commercial"]),
            fake.date_between(start_date="-30d", end_date="+2y"),
            fake.phone_number()[:15],
            random.randint(60, 100),
            available_d
        ))
        driver_ids.append(cursor.lastrowid)

    conn.commit()

    # --- Trips (mix of Completed / Cancelled / Draft, avoiding trigger conflicts) ---
    for i in range(N_TRIPS):
        v_id = random.choice(vehicle_ids)
        d_id = random.choice(driver_ids)
        cursor.execute("SELECT max_load_capacity FROM Vehicle WHERE vehicle_id=%s", (v_id,))
        capacity = cursor.fetchone()[0]
        cargo = round(random.uniform(0.3, 0.9) * float(capacity), 2)
        distance = round(random.uniform(50, 800), 2)
        revenue = round(distance * random.uniform(15, 40), 2)

        cursor.execute("""
            INSERT INTO Trip (vehicle_id, driver_id, source, destination,
                cargo_weight, planned_distance, revenue, trip_status)
            VALUES (%s,%s,%s,%s,%s,%s,%s,'Draft')
        """, (v_id, d_id, fake.city(), fake.city(), cargo, distance, revenue))
        trip_id = cursor.lastrowid
        conn.commit()  # commit Draft insert so triggers on later updates see correct state

        outcome = random.choices(["Completed", "Cancelled", "Draft"], weights=[70, 15, 15])[0]

        if outcome in ("Completed", "Cancelled"):
            # Dispatch first (fires triggers 2 & 3 -> vehicle/driver go On Trip)
            cursor.execute("UPDATE Trip SET trip_status='Dispatched' WHERE trip_id=%s", (trip_id,))
            conn.commit()

            if outcome == "Completed":
                final_odo = round(random.uniform(100, 500), 1)
                fuel_used = round(distance / random.uniform(8, 14), 2)  # km per liter basis
                cursor.execute("""
                    UPDATE Trip SET trip_status='Completed', final_odometer=%s, fuel_consumed=%s,
                    completed_at = NOW() WHERE trip_id=%s
                """, (final_odo, fuel_used, trip_id))
                conn.commit()

                # log matching fuel entry
                cursor.execute("""
                    INSERT INTO Fuel_Log (vehicle_id, trip_id, liters, cost, log_date)
                    VALUES (%s,%s,%s,%s,%s)
                """, (v_id, trip_id, fuel_used, round(fuel_used * random.uniform(90, 105), 2),
                      date.today() - timedelta(days=random.randint(0, 60))))
            else:
                cursor.execute("UPDATE Trip SET trip_status='Cancelled' WHERE trip_id=%s", (trip_id,))
            conn.commit()

    # --- Maintenance (a few closed, a couple active) ---
    for i in range(6):
        v_id = random.choice(vehicle_ids)
        cursor.execute("""
            INSERT INTO Maintenance (vehicle_id, description, cost, service_date, maintenance_status)
            VALUES (%s,%s,%s,%s,'Active')
        """, (v_id, random.choice(["Oil Change", "Tyre Replacement", "Brake Service", "General Checkup"]),
              round(random.uniform(1000, 15000), 2),
              date.today() - timedelta(days=random.randint(0, 90))))
        m_id = cursor.lastrowid
        conn.commit()  # Active insert fires trigger 4 -> vehicle In Shop

        if random.random() < 0.7:  # close most of them
            cursor.execute("UPDATE Maintenance SET maintenance_status='Closed' WHERE maintenance_id=%s", (m_id,))
            conn.commit()  # fires trigger 5 -> vehicle back to Available

    # --- Standalone expenses (tolls etc, not tied to a specific trip) ---
    for i in range(20):
        v_id = random.choice(vehicle_ids)
        cursor.execute("""
            INSERT INTO Expense (vehicle_id, trip_id, expense_type, amount, expense_date)
            VALUES (%s, NULL, %s, %s, %s)
        """, (v_id, random.choice(["Toll", "Parking", "Permit"]),
              round(random.uniform(50, 800), 2),
              date.today() - timedelta(days=random.randint(0, 60))))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"Seeded {N_VEHICLES} vehicles, {N_DRIVERS} drivers, {N_TRIPS} trips, 6 maintenance records, 20 expenses.")


if __name__ == "__main__":
    seed()
