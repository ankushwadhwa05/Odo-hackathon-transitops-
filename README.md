# TransitOps — Smart Transport Operations Platform

An end-to-end transport operations platform that digitizes vehicle, driver,
dispatch, maintenance, and expense management — built to replace the
spreadsheet-and-logbook workflow most small/mid logistics operators still rely on.

Built in an 8-hour hackathon window.

## Problem

Logistics companies without a centralized system run into scheduling
conflicts, underutilized vehicles, missed maintenance, expired driver
licenses, inaccurate expense tracking, and no real operational visibility.
TransitOps centralizes the full lifecycle — vehicle registration, driver
management, trip dispatch, maintenance, fuel/expense logging, and analytics —
behind role-based access for four user types: Fleet Manager, Dispatcher,
Safety Officer, and Financial Analyst.

## Architecture

```
React 18 + Vite + Tailwind  →  Flask REST API  →  MySQL (schema + triggers)
     (frontend/client)            (app.py)          (business rule enforcement)
```

- **MySQL** owns data integrity and state-machine enforcement via triggers —
  not the application layer — for rules where correctness must hold
  regardless of what touches the database.
- **Flask** exposes a REST API matching the frontend's expected contract
  (JWT auth, camelCase JSON, RBAC-gated routes).
- **React** provides the operator-facing UI with per-role view/edit gating.

## Key design decisions

**Lookup tables vs. ENUM for status fields.**
`Vehicle` and `Driver` statuses use dedicated lookup tables
(`Vehicle_Status`, `Driver_Status`) with an `is_dispatchable` /
`is_assignable` boolean flag, instead of a plain `ENUM`. This lets dispatch
eligibility be expressed as `WHERE is_dispatchable = TRUE` rather than
hardcoded string comparisons scattered across queries — new statuses can be
added without touching application logic. `Trip` and `Maintenance` statuses
use plain `ENUM`s instead, since they're a fixed sequence with no comparable
"filter by flag" need.

**Triggers vs. application-layer validation — split by failure mode.**
| Rule | Enforced in | Why |
|---|---|---|
| Registration number uniqueness | DB constraint | Static integrity rule |
| Cargo weight ≤ vehicle capacity | DB trigger (`before_insert_trip`) | Cross-table check; also failure-mode-critical |
| Vehicle/driver already On Trip | DB trigger (`before_update_trip`) | Race-condition-prone; must be enforced at the transaction level, not just in app code |
| Status auto-transitions (dispatch/complete/cancel, maintenance open/close) | DB triggers (`after_update_trip`, `after_insert/update_maintenance`) | Guarantees consistency regardless of what writes to the table (API, admin script, etc.) |
| Expired license / suspended driver block | Flask route (`/trips/:id/dispatch`) | Time-dependent (depends on "today"), not a static data constraint |
| Hiding Retired/In Shop vehicles from dispatch | Flask query filter | Display concern, not a data integrity rule |

**Vehicle ROI formula.**
`ROI % = (Revenue − (Maintenance Cost + Fuel Cost)) / Acquisition Cost × 100`,
computed per vehicle in the `/api/analytics` route via a set of correlated
subqueries joining `Trip`, `Fuel_Log`, and `Maintenance` against `Vehicle`.

**`Users` table (not in the original data model).**
The problem statement didn't specify an authentication data model. A
minimal `Users` table (email, bcrypt password hash, role, name) was added
and auto-seeded with 4 demo accounts on first run, since the frontend
requires JWT-based login with role resolution.

## Setup

### Database
1. Create the `transitops` schema and run the DDL (`Vehicle_Status`,
   `Driver_Status`, `Vehicle`, `Driver`, `Trip`, `Maintenance`, `Fuel_Log`,
   `Expense`) followed by the 5 triggers.
2. Edit `DB_CONFIG` in `seed_data.py`, then run:
   ```bash
   python seed_data.py
   ```

### Backend
```bash
pip install flask flask-cors pyjwt mysql-connector-python bcrypt
# edit DB_CONFIG in app.py
python app.py   # runs on http://localhost:5000
```

### Frontend
Add a dev proxy in `client/vite.config.js`:
```js
server: { proxy: { '/api': 'http://localhost:5000' } }
```
```bash
cd client
npm install
npm run dev
```

### Demo login
Any of the 4 seeded accounts, password `password123`:
`fleet@transitops.in`, `dispatch@transitops.in`, `safety@transitops.in`, `finance@transitops.in`

## Verified business rules (manually tested)

- Dispatching a trip whose vehicle/driver is already `On Trip` is rejected
  by `before_update_trip`.
- Creating a trip with cargo weight over the vehicle's `max_load_capacity`
  is rejected by `before_insert_trip`.
- Dispatch → both vehicle and driver flip to `On Trip`; Complete/Cancel →
  both revert to `Available`.
- Opening a maintenance record flips the vehicle to `In Shop`; closing it
  restores `Available` (unless the vehicle is `Retired`).

## Out of scope for this submission

Deliberately cut to meet the hackathon deadline — flagged here rather than
left unmentioned:
- Predictive maintenance / driver risk-scoring ML layer
- PDF export (CSV export is implemented)
- Dark mode
- Email reminders for expiring licenses
- Full document/photo management for vehicles

## Tech stack

MySQL 8 (schema, triggers) · Python / Flask (REST API, JWT auth, bcrypt) ·
React 18 + Vite + Tailwind + react-router-dom (frontend, built by
collaborator:uniyalsarthak) · axios (API client)
