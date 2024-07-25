import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import './VehicleActivityLogs.scss';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { jsPDF } from 'jspdf';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const VehicleActivityLogs = ({ telemetryData, fetchAddress, doorStatus, imei }) => {
  const [vehicleLogs, setVehicleLogs] = useState([]);
  const [previousSpeed, setPreviousSpeed] = useState(0);
  const [latestLog, setLatestLog] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const logIntervalRef = useRef(null);

  useEffect(() => {
    console.log(`IMEI in VehicleActivityLogs: ${imei}`); // Debug log for IMEI
  }, [imei]);

  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
  };

  const fieldsToCheck = useMemo(() => [
    'action', 'location', 'engineAction', 'handbrake', 'doorStatus', 'engineRPM', 'odometer', 'vehicleSpeed', 'acceleration', 'vehicleIdling'
  ], []);

  const fetchDataAndUpdateLogs = useCallback(async () => {
    if (telemetryData && telemetryData.length > 0) {
      const latestData = telemetryData[telemetryData.length - 1];
      console.log("Latest Data: ", latestData);
      const currentSpeed = parseInt(latestData['position.speed'] || '0', 10);
      const acceleration = ((currentSpeed - previousSpeed) / 5).toFixed(2);

      setPreviousSpeed(currentSpeed); // Update previous speed for next calculation

      const engineStatus = latestData['can.engine.ignition.status'];
      const handbrakeStatus = latestData['can.handbrake.status'];
      const latitude = latestData['position.latitude'];
      const longitude = latestData['position.longitude'];
      const timestamp = new Date().toLocaleString();

      const engineRPM = latestData['can.engine.rpm']?.toString();
      const odometer = latestData['can.vehicle.mileage']?.toString();
      const vehicleSpeed = parseInt(latestData['can.vehicle.speed'] || '0', 10);
      const vehicleIdling = engineStatus && vehicleSpeed === 0 ? 'Yes' : 'No';

      let action = engineStatus ? 'turned ON' : 'turned OFF';
      action = engineStatus === null ? 'IDLE' : action;

      let address = '';
      try {
        const addressResult = await fetchAddress(latitude, longitude);
        if (addressResult && addressResult.results && addressResult.results.length > 0) {
          address = addressResult.results[0].formatted_address;
        } else {
          address = 'Address not found';
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        address = 'Unable to fetch address';
      }

      const newLog = {
        vehicleId: "12345",
        time: timestamp,  // Ensure time is set here
        action,
        location: address,
        engineAction: engineStatus ? 'ON' : 'OFF',
        handbrake: handbrakeStatus,
        doorStatus: {
          frontLeft: doorStatus.frontLeft,
          frontRight: doorStatus.frontRight,
          rearLeft: doorStatus.rearLeft,
          rearRight: doorStatus.rearRight,
          trunk: doorStatus.trunk
        },
        engineRPM,
        odometer,
        vehicleSpeed: `${vehicleSpeed} km/h`,
        acceleration: `${acceleration} m/s²`,
        vehicleIdling,
      };

      // Check if relevant fields have changed
      const fieldsChanged = fieldsToCheck.some(field => {
        if (typeof newLog[field] === 'object' && typeof latestLog[field] === 'object') {
          return JSON.stringify(newLog[field]) !== JSON.stringify(latestLog[field]);
        }
        return newLog[field] !== latestLog[field];
      });

      if (fieldsChanged) {
        console.log('New log differs from previous log, saving new log:', newLog);
        setVehicleLogs([newLog]); // Reset and append the latest log
        setLatestLog(newLog); // Update the latest log

        try {
          await axios.post(`${BACKEND_URL}/vehicle-activity-log`, newLog);
        } catch (error) {
          console.error('Error saving log to backend:', error);
        }
      } else {
        console.log('No relevant changes detected, not saving log');
      }
    }
  }, [telemetryData, previousSpeed, latestLog, fetchAddress, doorStatus, fieldsToCheck, imei]);

  useEffect(() => {
    // Set up interval to check every 1 minute
    logIntervalRef.current = setInterval(fetchDataAndUpdateLogs, 60000); // 60000 ms = 1 minute

    // Initial call to update logs immediately
    fetchDataAndUpdateLogs();

    // Clear interval on component unmount
    return () => clearInterval(logIntervalRef.current);
  }, [fetchDataAndUpdateLogs]);

  const handleGenerateReport = async (date) => {
    setShowDatePicker(false);
    setSelectedDate(date);
    const formattedDate = date.toISOString().split('T')[0];

    try {
      const response = await axios.get(`${BACKEND_URL}/vehicle-activity-log?date=${formattedDate}`);
      if (response.data.length === 0) {
        alert('There are no logs found for this date');
        return;
      }

      const doc = new jsPDF();
      doc.text(`Vehicle Activity Logs for ${formattedDate}`, 10, 10);

      let yOffset = 20;
      const lineHeight = 10;
      const maxY = 280; // Max y position on a single page before adding a new page

      response.data.forEach((log, index) => {
        if (yOffset + lineHeight * 12 > maxY) {
          doc.addPage();
          yOffset = 10; // Reset yOffset for the new page
        }

        doc.text(`Log ${index + 1}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Time: ${log.timestamp}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Location: ${log.location}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Engine Action: ${log.engineAction}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Handbrake: ${log.handbrake ? 'Engaged' : 'Released'}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Driver's Door Status: ${log.doorStatus.frontLeft ? 'Opened' : 'Closed'}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Engine RPM: ${log.engineRPM}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Odometer Reading: ${log.odometer}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Vehicle Speed: ${log.vehicleSpeed}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Acceleration/Deceleration: ${log.acceleration}`, 10, yOffset);
        yOffset += lineHeight;
        doc.text(`Vehicle Idling: ${log.vehicleIdling}`, 10, yOffset);
        yOffset += lineHeight + 10; // Add extra space between logs
      });

      doc.save(`Vehicle_Activity_Logs_${formattedDate}.pdf`);
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  return (
    <div className="vehicle-activity-logs">
      <h2>Vehicle Activity Logs    <br/>     <button className='datePickerButton' onClick={() => setShowDatePicker(true)}>Generate Report</button>      </h2>
      {showDatePicker && (
        <div className="datePickerWrapper">
          <DatePicker
            selected={selectedDate}
            onChange={(date) => handleGenerateReport(date)}
            dateFormat="yyyy/MM/dd"
            inline
          />
          <button className='closeDatePickerButton' onClick={handleCloseDatePicker}>&times;</button>
        </div>
      )}
      <ul className="vehicle-activity-log-list">
        {vehicleLogs.map((log, index) => (
          <div key={index} className="log-entry">
            <ul>
              <p className='log-item'>
                {log.time} - Vehicle is currently at {log.location}
              </p>
              <p className={log.engineAction === 'OFF' ? 'engine-off' : 'engine-on'}>
                {log.time} - Engine Status: {log.engineAction}
              </p>
              <p className='log-item'>
                {log.time} - Handbrake Status: {log.handbrake ? 'Engaged' : 'Released'}
              </p>
              <p className={log.doorStatus.frontLeft ? 'door-opened' : 'door-closed'}>
                {log.time} - Driver's Door Status: {log.doorStatus.frontLeft ? 'Opened' : 'Closed'}
              </p>
              <p className='log-item'>{log.time} - Engine RPM: {log.engineRPM}</p>
              <p className='log-item'>{log.time} - Odometer Reading: {log.odometer}</p>
              <p className='log-item'>{log.time} - Vehicle Speed: {log.vehicleSpeed}</p>
              <p className='log-item'>{log.time} - Acceleration/Deceleration: {log.acceleration}</p>
              <p className={log.vehicleIdling === 'Yes' ? 'vehicle-idling' : 'vehicle-not-idling'}>
                {log.time} - Vehicle Idling: {log.vehicleIdling}
              </p>          
            </ul>
          </div>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(VehicleActivityLogs);
