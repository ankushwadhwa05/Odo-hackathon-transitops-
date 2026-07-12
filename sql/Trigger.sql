DELIMITER //

-- 1. Reject trip if cargo weight exceeds vehicle's max load capacity
CREATE TRIGGER before_insert_trip
BEFORE INSERT ON Trip
FOR EACH ROW
BEGIN
    DECLARE v_capacity DECIMAL(10,2);
    SELECT max_load_capacity INTO v_capacity
    FROM Vehicle WHERE vehicle_id = NEW.vehicle_id;

    IF NEW.cargo_weight > v_capacity THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cargo weight exceeds vehicle max load capacity';
    END IF;
END //

-- 2. Reject dispatch if vehicle or driver isn't currently Available
CREATE TRIGGER before_update_trip
BEFORE UPDATE ON Trip
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE d_status VARCHAR(20);

    IF OLD.trip_status <> 'Dispatched' AND NEW.trip_status = 'Dispatched' THEN
        SELECT vs.status_name INTO v_status
        FROM Vehicle v JOIN Vehicle_Status vs ON v.status_id = vs.status_id
        WHERE v.vehicle_id = NEW.vehicle_id;

        SELECT ds.status_name INTO d_status
        FROM Driver d JOIN Driver_Status ds ON d.status_id = ds.status_id
        WHERE d.driver_id = NEW.driver_id;

        IF v_status <> 'Available' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Vehicle is not available for dispatch';
        END IF;

        IF d_status <> 'Available' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Driver is not available for dispatch';
        END IF;
    END IF;
END //

-- 3. Cascade Trip status changes to Vehicle and Driver status
CREATE TRIGGER after_update_trip
AFTER UPDATE ON Trip
FOR EACH ROW
BEGIN
    IF OLD.trip_status <> 'Dispatched' AND NEW.trip_status = 'Dispatched' THEN
        UPDATE Vehicle SET status_id = (SELECT status_id FROM Vehicle_Status WHERE status_name = 'On Trip')
        WHERE vehicle_id = NEW.vehicle_id;

        UPDATE Driver SET status_id = (SELECT status_id FROM Driver_Status WHERE status_name = 'On Trip')
        WHERE driver_id = NEW.driver_id;
    END IF;

    IF OLD.trip_status = 'Dispatched' AND NEW.trip_status IN ('Completed','Cancelled') THEN
        UPDATE Vehicle SET status_id = (SELECT status_id FROM Vehicle_Status WHERE status_name = 'Available')
        WHERE vehicle_id = NEW.vehicle_id;

        UPDATE Driver SET status_id = (SELECT status_id FROM Driver_Status WHERE status_name = 'Available')
        WHERE driver_id = NEW.driver_id;
    END IF;
END //

-- 4. New Active maintenance record puts vehicle In Shop
CREATE TRIGGER after_insert_maintenance
AFTER INSERT ON Maintenance
FOR EACH ROW
BEGIN
    IF NEW.maintenance_status = 'Active' THEN
        UPDATE Vehicle SET status_id = (SELECT status_id FROM Vehicle_Status WHERE status_name = 'In Shop')
        WHERE vehicle_id = NEW.vehicle_id;
    END IF;
END //

-- 5. Closing maintenance restores vehicle to Available, unless Retired
CREATE TRIGGER after_update_maintenance
AFTER UPDATE ON Maintenance
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);

    IF OLD.maintenance_status = 'Active' AND NEW.maintenance_status = 'Closed' THEN
        SELECT vs.status_name INTO v_status
        FROM Vehicle v JOIN Vehicle_Status vs ON v.status_id = vs.status_id
        WHERE v.vehicle_id = NEW.vehicle_id;

        IF v_status <> 'Retired' THEN
            UPDATE Vehicle SET status_id = (SELECT status_id FROM Vehicle_Status WHERE status_name = 'Available')
            WHERE vehicle_id = NEW.vehicle_id;
        END IF;
    END IF;
END //

DELIMITER //=;
DELIMITER ;