import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './GeofenceLogs.scss';

const GeofenceLogs = ({ logs, onDateChange, deviceId }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (date) => {
    setSelectedDate(date);
    onDateChange(date);
    setShowDatePicker(false); // Close date picker after selecting a date
  };

  const handleCloseDatePicker = () => {
    setShowDatePicker(false);
  };

  return (
    <div className="card geofence-logs-container">
      <h2 className='headdd'>
        Geofence Logs <br/>
        <button className='datePickerButton' onClick={() => setShowDatePicker(true)}>Filter logs</button>
      </h2>
      {showDatePicker && (
        <div className="datePickerWrapper">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="yyyy-MM-dd"
            inline
          />
          <button className='closeDatePickerButton' onClick={handleCloseDatePicker}>&times;</button>
        </div>
      )}
      <ul className="geofence-log-list">
        {logs.map((log) => (
          <li className='log-item' key={log._id}>
            <div className="log-entry">
              <p className="log-time">Vehicle {log.eventType} at {new Date(log.timestamp).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default React.memo(GeofenceLogs);
