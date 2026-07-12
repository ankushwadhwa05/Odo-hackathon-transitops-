"""
TransitOps Flask API — single-file for speed.
Matches the exact routes/field names the React frontend (client/) expects:
camelCase JSON, `_id` as the id key, JWT in Authorization: Bearer <token>.

SETUP:
1. pip install flask flask-cors pyjwt mysql-connector-python bcrypt
2. Edit DB_CONFIG below
3. python app.py   (runs on http://localhost:5000)
4. Frontend expects API at /api -> set vite proxy or run frontend with
   VITE base pointing here (see note at bottom of file).
"""

import bcrypt
import jwt
import datetime
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3306,
    "user": "root",
    "password": "root",
    "database": "cleanlayoffs"
}

JWT_SECRET = "change-this-secret-for-real-use"

DEMO_USERS = [
    ("fleet@transitops.in", "FleetManager", "Fleet Manager"),
    ("dispatch@transitops.in", "Dispatcher", "Dispatcher"),
    ("safety@transitops.in", "SafetyOfficer", "Safety Officer"),
    ("finance@transitops.in", "FinancialAnalyst", "Financial Analyst"),
]
DEMO_PASSWORD = "password123"


def get_conn():
    return mysql.connector.connect(**DB_CONFIG)


def ensure_users_table():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS Users (
            user_id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(30) NOT NULL,
            name VARCHAR(100) NOT NULL
        )
    """)
    conn.commit()
    cur.execute("SELECT COUNT(*) FROM Users")
    if cur.fetchone()[0] == 0:
        pw_hash = bcrypt.hashpw(DEMO_PASSWORD.encode(), bcrypt.gensalt()).decode()
        for email, role, name in DEMO_USERS:
            cur.execute("INSERT INTO Users (email, password_hash, role, name) VALUES (%s,%s,%s,%s)",
                        (email, pw_hash, role, name))
        conn.commit()
    cur.close()
    conn.close()


# ---------- auth helpers ----------

def make_token(user):
    payload = {
        "sub": user["user_id"], "role": user["role"],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"message": "Missing token"}), 401
        try:
            payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=["HS256"])
        except jwt.PyJWTError:
            return jsonify({"message": "Invalid or expired token"}), 401
        request.user_role = payload["role"]
        return f(*args, **kwargs)
    return wrapper


# ---------- auth routes ----------

@app.route("/api/auth/login", methods=["POST"])
def login():
    body = request.json
    conn = get_conn()
    cur = conn.cursor(dictionary=True)
    cur.execute("SELECT * FROM Users WHERE email=%s", (body.get("email"),))
    user = cur.fetchone()
    cur.close(); conn.close()
    if not user or not bcrypt.checkpw(body.get("password", "").encode(), user["password_hash"].encode()):
        return jsonify({"message": "Invalid credentials"}), 401
    token = make_token(user)
    return jsonify({"token": token, "user": {"role": user["role"], "name": user["name"], "email": user["email"]}})


# ---------- vehicle routes ----------

def vehicle_row_to_json(row):
    return {
        "_id": row["vehicle_id"], "regNo": row["registration_number"], "name": row["model_name"],
        "type": row["vehicle_type"], "capacity": float(row["max_load_capacity"]),
        "odometer": float(row["odometer"]), "acquisitionCost": float(row["acquisition_cost"]),
        "status": row["status_name"]
    }


@app.route("/api/vehicles", methods=["GET"])
@require_auth
def list_vehicles():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT v.*, vs.status_name FROM Vehicle v
                   JOIN Vehicle_Status vs ON v.status_id = vs.status_id""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([vehicle_row_to_json(r) for r in rows])


@app.route("/api/vehicles/available", methods=["GET"])
@require_auth
def list_available_vehicles():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT v.*, vs.status_name FROM Vehicle v
                   JOIN Vehicle_Status vs ON v.status_id = vs.status_id
                   WHERE vs.is_dispatchable = TRUE""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([vehicle_row_to_json(r) for r in rows])


@app.route("/api/vehicles", methods=["POST"])
@require_auth
def create_vehicle():
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT status_id FROM Vehicle_Status WHERE status_name='Available'")
    available_id = cur.fetchone()[0]
    try:
        cur.execute("""INSERT INTO Vehicle (registration_number, model_name, vehicle_type,
                       max_load_capacity, odometer, acquisition_cost, status_id)
                       VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                    (b["regNo"], b["name"], b["type"], b["capacity"], b.get("odometer", 0),
                     b["acquisitionCost"], available_id))
        conn.commit()
    except mysql.connector.Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cur.close(); conn.close()
    return jsonify({"message": "created"}), 201


@app.route("/api/vehicles/<int:vid>", methods=["DELETE"])
@require_auth
def retire_vehicle(vid):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT status_id FROM Vehicle_Status WHERE status_name='Retired'")
    retired_id = cur.fetchone()[0]
    cur.execute("UPDATE Vehicle SET status_id=%s WHERE vehicle_id=%s", (retired_id, vid))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "retired"})


# ---------- driver routes ----------

def driver_row_to_json(row):
    return {
        "_id": row["driver_id"], "name": row["full_name"], "licenseNo": row["license_number"],
        "licenseCategory": row["license_category"],
        "licenseExpiry": row["license_expiry_date"].isoformat(),
        "contact": row["contact_number"], "safetyScore": row["safety_score"],
        "status": row["status_name"]
    }


@app.route("/api/drivers", methods=["GET"])
@require_auth
def list_drivers():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT d.*, ds.status_name FROM Driver d
                   JOIN Driver_Status ds ON d.status_id = ds.status_id""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([driver_row_to_json(r) for r in rows])


@app.route("/api/drivers/available", methods=["GET"])
@require_auth
def list_available_drivers():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT d.*, ds.status_name FROM Driver d
                   JOIN Driver_Status ds ON d.status_id = ds.status_id
                   WHERE ds.is_assignable = TRUE AND d.license_expiry_date >= CURDATE()""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([driver_row_to_json(r) for r in rows])


@app.route("/api/drivers", methods=["POST"])
@require_auth
def create_driver():
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT status_id FROM Driver_Status WHERE status_name='Available'")
    available_id = cur.fetchone()[0]
    try:
        cur.execute("""INSERT INTO Driver (full_name, license_number, license_category,
                       license_expiry_date, contact_number, status_id)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (b["name"], b["licenseNo"], b["licenseCategory"], b["licenseExpiry"],
                     b["contact"], available_id))
        conn.commit()
    except mysql.connector.Error as e:
        return jsonify({"message": str(e)}), 400
    finally:
        cur.close(); conn.close()
    return jsonify({"message": "created"}), 201


@app.route("/api/drivers/<int:did>", methods=["PUT"])
@require_auth
def update_driver_status(did):
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT status_id FROM Driver_Status WHERE status_name=%s", (b["status"],))
    row = cur.fetchone()
    if not row:
        return jsonify({"message": "Invalid status"}), 400
    cur.execute("UPDATE Driver SET status_id=%s WHERE driver_id=%s", (row[0], did))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "updated"})


# ---------- trip routes ----------

def trip_row_to_json(row):
    return {
        "_id": row["trip_id"], "source": row["source"], "destination": row["destination"],
        "vehicle": {"name": row["model_name"]}, "driver": {"name": row["full_name"]},
        "status": row["trip_status"], "cargoWeight": float(row["cargo_weight"]),
        "plannedDistance": float(row["planned_distance"]), "revenue": float(row["revenue"])
    }


@app.route("/api/trips", methods=["GET"])
@require_auth
def list_trips():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT t.*, v.model_name, d.full_name FROM Trip t
                   JOIN Vehicle v ON t.vehicle_id=v.vehicle_id
                   JOIN Driver d ON t.driver_id=d.driver_id
                   ORDER BY t.trip_id DESC""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([trip_row_to_json(r) for r in rows])


@app.route("/api/trips", methods=["POST"])
@require_auth
def create_trip():
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO Trip (vehicle_id, driver_id, source, destination,
                       cargo_weight, planned_distance, revenue, trip_status)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,'Draft')""",
                    (b["vehicle"], b["driver"], b["source"], b["destination"],
                     b["cargoWeight"], b["plannedDistance"], b.get("revenue", 0)))
        conn.commit()
    except mysql.connector.Error as e:
        return jsonify({"message": str(e)}), 400  # cargo-weight trigger rejection lands here
    finally:
        cur.close(); conn.close()
    return jsonify({"message": "created"}), 201


@app.route("/api/trips/<int:tid>/dispatch", methods=["POST"])
@require_auth
def dispatch_trip(tid):
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    # app-layer check: expired license / suspended driver (rule kept out of DB triggers on purpose)
    cur.execute("""SELECT d.license_expiry_date, ds.status_name FROM Trip t
                   JOIN Driver d ON t.driver_id=d.driver_id
                   JOIN Driver_Status ds ON d.status_id=ds.status_id
                   WHERE t.trip_id=%s""", (tid,))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        return jsonify({"message": "Trip not found"}), 404
    if row["status_name"] == "Suspended" or row["license_expiry_date"] < datetime.date.today():
        cur.close(); conn.close()
        return jsonify({"message": "Driver suspended or license expired"}), 400
    try:
        cur.execute("UPDATE Trip SET trip_status='Dispatched', dispatched_at=NOW() WHERE trip_id=%s", (tid,))
        conn.commit()
    except mysql.connector.Error as e:
        return jsonify({"message": str(e)}), 400  # vehicle/driver-not-available trigger rejection lands here
    finally:
        cur.close(); conn.close()
    return jsonify({"message": "dispatched"})


@app.route("/api/trips/<int:tid>/complete", methods=["POST"])
@require_auth
def complete_trip(tid):
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""UPDATE Trip SET trip_status='Completed', final_odometer=%s,
                   fuel_consumed=%s, completed_at=NOW() WHERE trip_id=%s""",
                (b["finalOdometer"], b["fuelConsumed"], tid))
    conn.commit()
    # update vehicle odometer + log the fuel used
    cur.execute("SELECT vehicle_id FROM Trip WHERE trip_id=%s", (tid,))
    vehicle_id = cur.fetchone()[0]
    cur.execute("UPDATE Vehicle SET odometer=%s WHERE vehicle_id=%s", (b["finalOdometer"], vehicle_id))
    cur.execute("""INSERT INTO Fuel_Log (vehicle_id, trip_id, liters, cost, log_date)
                   VALUES (%s,%s,%s,%s,CURDATE())""",
                (vehicle_id, tid, b["fuelConsumed"], 0))  # cost unknown at trip-complete time, logged as 0
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "completed"})


@app.route("/api/trips/<int:tid>/cancel", methods=["POST"])
@require_auth
def cancel_trip(tid):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE Trip SET trip_status='Cancelled' WHERE trip_id=%s", (tid,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "cancelled"})


# ---------- maintenance routes ----------

@app.route("/api/maintenance", methods=["GET"])
@require_auth
def list_maintenance():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT m.*, v.model_name FROM Maintenance m
                   JOIN Vehicle v ON m.vehicle_id=v.vehicle_id ORDER BY m.maintenance_id DESC""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([{
        "_id": r["maintenance_id"], "vehicle": {"name": r["model_name"]},
        "serviceType": r["description"], "cost": float(r["cost"]), "status": r["maintenance_status"]
    } for r in rows])


@app.route("/api/maintenance", methods=["POST"])
@require_auth
def create_maintenance():
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""INSERT INTO Maintenance (vehicle_id, description, cost, service_date, maintenance_status)
                   VALUES (%s,%s,%s,%s,'Active')""",
                (b["vehicle"], b["serviceType"], b["cost"], b["date"]))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "created"}), 201


@app.route("/api/maintenance/<int:mid>/complete", methods=["POST"])
@require_auth
def complete_maintenance(mid):
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE Maintenance SET maintenance_status='Closed' WHERE maintenance_id=%s", (mid,))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "closed"})


# ---------- fuel/expense routes ----------

@app.route("/api/fuel/logs", methods=["GET"])
@require_auth
def list_fuel_logs():
    conn = get_conn(); cur = conn.cursor(dictionary=True)
    cur.execute("""SELECT f.*, v.model_name FROM Fuel_Log f
                   JOIN Vehicle v ON f.vehicle_id=v.vehicle_id ORDER BY f.log_date DESC""")
    rows = cur.fetchall(); cur.close(); conn.close()
    return jsonify([{
        "_id": r["fuel_log_id"], "vehicle": {"name": r["model_name"]},
        "liters": float(r["liters"]), "cost": float(r["cost"]), "date": r["log_date"].isoformat()
    } for r in rows])


@app.route("/api/fuel/logs", methods=["POST"])
@require_auth
def create_fuel_log():
    b = request.json
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""INSERT INTO Fuel_Log (vehicle_id, liters, cost, log_date) VALUES (%s,%s,%s,%s)""",
                (b["vehicle"], b["liters"], b["cost"], b["date"]))
    conn.commit(); cur.close(); conn.close()
    return jsonify({"message": "created"}), 201


@app.route("/api/fuel/operational-cost", methods=["GET"])
@require_auth
def operational_cost():
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT COALESCE(SUM(cost),0) FROM Fuel_Log")
    fuel_total = cur.fetchone()[0]
    cur.execute("SELECT COALESCE(SUM(cost),0) FROM Maintenance")
    maint_total = cur.fetchone()[0]
    cur.close(); conn.close()
    return jsonify({"total": float(fuel_total) + float(maint_total)})


# ---------- dashboard ----------

@app.route("/api/dashboard", methods=["GET"])
@require_auth
def dashboard():
    conn = get_conn(); cur = conn.cursor(dictionary=True)

    cur.execute("""SELECT vs.status_name, COUNT(*) c FROM Vehicle v
                   JOIN Vehicle_Status vs ON v.status_id=vs.status_id GROUP BY vs.status_name""")
    v_counts = {r["status_name"]: r["c"] for r in cur.fetchall()}

    cur.execute("""SELECT trip_status, COUNT(*) c FROM Trip GROUP BY trip_status""")
    t_counts = {r["trip_status"]: r["c"] for r in cur.fetchall()}

    cur.execute("""SELECT ds.status_name, COUNT(*) c FROM Driver d
                   JOIN Driver_Status ds ON d.status_id=ds.status_id GROUP BY ds.status_name""")
    d_counts = {r["status_name"]: r["c"] for r in cur.fetchall()}

    total_vehicles = sum(v_counts.values()) or 1
    fleet_utilization = round((v_counts.get("On Trip", 0) / total_vehicles) * 100, 1)

    cur.execute("""SELECT t.trip_id, t.source, t.destination, t.trip_status, v.model_name, d.full_name
                   FROM Trip t JOIN Vehicle v ON t.vehicle_id=v.vehicle_id
                   JOIN Driver d ON t.driver_id=d.driver_id
                   ORDER BY t.trip_id DESC LIMIT 5""")
    recent = cur.fetchall()
    cur.close(); conn.close()

    return jsonify({
        "activeVehicles": total_vehicles - v_counts.get("Retired", 0),
        "availableVehicles": v_counts.get("Available", 0),
        "vehiclesInMaintenance": v_counts.get("In Shop", 0),
        "activeTrips": t_counts.get("Dispatched", 0),
        "pendingTrips": t_counts.get("Draft", 0),
        "driversOnDuty": d_counts.get("On Trip", 0),
        "fleetUtilization": fleet_utilization,
        "recentTrips": [{
            "_id": r["trip_id"], "source": r["source"], "destination": r["destination"],
            "vehicle": {"name": r["model_name"]}, "driver": {"name": r["full_name"]},
            "status": r["trip_status"]
        } for r in recent]
    })


# ---------- analytics ----------

@app.route("/api/analytics", methods=["GET"])
@require_auth
def analytics():
    conn = get_conn(); cur = conn.cursor(dictionary=True)

    # fuel efficiency: total planned distance of completed trips / total fuel consumed
    cur.execute("""SELECT COALESCE(SUM(planned_distance),0) d, COALESCE(SUM(fuel_consumed),0) f
                   FROM Trip WHERE trip_status='Completed' AND fuel_consumed > 0""")
    r = cur.fetchone()
    fuel_efficiency = round(float(r["d"]) / float(r["f"]), 2) if r["f"] else 0

    cur.execute("""SELECT vs.status_name, COUNT(*) c FROM Vehicle v
                   JOIN Vehicle_Status vs ON v.status_id=vs.status_id GROUP BY vs.status_name""")
    v_counts = {row["status_name"]: row["c"] for row in cur.fetchall()}
    total_v = sum(v_counts.values()) or 1
    fleet_utilization = round((v_counts.get("On Trip", 0) / total_v) * 100, 1)

    cur.execute("SELECT COALESCE(SUM(cost),0) t FROM Fuel_Log")
    fuel_cost = float(cur.fetchone()["t"])
    cur.execute("SELECT COALESCE(SUM(cost),0) t FROM Maintenance")
    maint_cost = float(cur.fetchone()["t"])
    operational_cost = round(fuel_cost + maint_cost, 2)

    cur.execute("""
        SELECT v.vehicle_id, v.registration_number, v.model_name, v.acquisition_cost,
            COALESCE(f.fuel_cost,0) fuel_cost, COALESCE(m.maint_cost,0) maint_cost,
            COALESCE(t.revenue,0) revenue
        FROM Vehicle v
        LEFT JOIN (SELECT vehicle_id, SUM(cost) fuel_cost FROM Fuel_Log GROUP BY vehicle_id) f
            ON v.vehicle_id = f.vehicle_id
        LEFT JOIN (SELECT vehicle_id, SUM(cost) maint_cost FROM Maintenance GROUP BY vehicle_id) m
            ON v.vehicle_id = m.vehicle_id
        LEFT JOIN (SELECT vehicle_id, SUM(revenue) revenue FROM Trip
                   WHERE trip_status='Completed' GROUP BY vehicle_id) t
            ON v.vehicle_id = t.vehicle_id
    """)
    per_vehicle_rows = cur.fetchall()
    cur.close(); conn.close()

    per_vehicle = []
    for r in per_vehicle_rows:
        cost = float(r["fuel_cost"]) + float(r["maint_cost"])
        revenue = float(r["revenue"])
        acq = float(r["acquisition_cost"]) or 1
        roi = round(((revenue - cost) / acq) * 100, 2)
        per_vehicle.append({
            "vehicle": r["model_name"], "regNo": r["registration_number"],
            "cost": round(cost, 2), "revenue": round(revenue, 2), "roi": roi
        })

    avg_roi = round(sum(v["roi"] for v in per_vehicle) / len(per_vehicle), 2) if per_vehicle else 0
    top_costliest = sorted(per_vehicle, key=lambda v: v["cost"], reverse=True)[:5]

    return jsonify({
        "fuelEfficiency": fuel_efficiency,
        "fleetUtilization": fleet_utilization,
        "operationalCost": operational_cost,
        "vehicleRoi": avg_roi,
        "perVehicle": per_vehicle,
        "topCostliestVehicles": top_costliest
    })


if __name__ == "__main__":
    ensure_users_table()
    app.run(debug=True, port=5000)

# NOTE on frontend wiring:
# The React app calls axios baseURL '/api'. Either:
#  (a) add a proxy in client/vite.config.js:
#        server: { proxy: { '/api': 'http://localhost:5000' } }
#  (b) or change client/src/api.js baseURL to 'http://localhost:5000/api'
# Option (a) is cleaner and avoids CORS entirely during dev.
