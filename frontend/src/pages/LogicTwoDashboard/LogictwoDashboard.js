import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import productService from '../../redux/features/product/productService';
import '../dashboard/dashboard.scss';
import VehicleActivityLogs from '../../components/vehicleActivityLogs/VehicleActivityLogs';
import GeofenceLogs from '../../components/geofenceLogs/GeofenceLogs';
import DeviceControl from '../../components/deviceControl/Logic1/DeviceControl';
import FeedbackMessage from '../../components/feedbackMessage/FeedbackMessage';
import { selectTelemetryDataForDevice } from '../../redux/selectors';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const { getVehicleTelemetryDataForDevice, fetchAddress, sendCommandToFlespi } = productService;

const initialState = {
  currentSpeed: 0,
  vehicleIdling: false,
  vehicleParameters: [],
  address: '',
  isVehicleParked: true,
  isVehicleBlocked: false,
  acceleration: 0,
  scores: {
    accelerationScore: 100,
    brakingScore: 100,
    corneringScore: 100,
    speedingScore: 100,
  },
  doorStatus: {
    frontLeft: false,
    frontRight: false,
    rearLeft: false,
    rearRight: false,
    trunk: false,
  }
};

function reducer(state, action) {
  switch (action.type) {
    case 'UPDATE_TELEMETRY':
      return { ...state, ...action.payload };
    case 'UPDATE_ADDRESS':
    case 'UPDATE_PARKED_STATUS':
    case 'TOGGLE_VEHICLE_BLOCK':
    case 'UPDATE_SCORES':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const LogicTwoDashboard = () => {
  const { deviceId } = useParams(); // This will be the IMEI number
  const [commandStatus, setCommandStatus] = useState({
    condition1Sent: false,
    condition2Sent: false,
    condition3Sent: false,
  });
  const [doorOpenTime, setDoorOpenTime] = useState(null);
  const [doorClosedAfterOpening, setDoorClosedAfterOpening] = useState(false);
  const [doorClosedWithinTime, setDoorClosedWithinTime] = useState(false);
  const [doorStatus, setDoorStatus] = useState({
    frontLeft: false,
    frontRight: false,
    rearLeft: false,
    rearRight: false,
    trunk: false,
  });
  const [commandSent, setCommandSent] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState(null);
  const dispatch = useDispatch();
  const telemetryData = useSelector((state) => selectTelemetryDataForDevice(state, deviceId));
  const [state, localDispatch] = useReducer(reducer, initialState);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [logs, setLogs] = useState([]);

  // Fetch all devices and map IMEI to device ID
  useEffect(() => {
    const fetchAllDevices = async () => {
      try {
        const response = await axios.get('/gw/devices/telemetry.channel.id=1211469', {
          headers: {
            'Authorization': `FlespiToken ${process.env.REACT_APP_FLESPI_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Fetched devices:', response.data);

        if (response.data && response.data.result && response.data.result.length > 0) {
          const device = response.data.result.find(d => d.configuration.ident === deviceId);
          if (device) {
            setDeviceDetails(device);
            console.log('Device details:', device);
          } else {
            console.warn('Device ID not found for IMEI:', deviceId);
          }
        } else {
          console.warn('No devices found');
        }
      } catch (error) {
        console.error('Error fetching devices:', error.response?.data || error.message);
      }
    };

    fetchAllDevices();
  }, [deviceId]);

  // Fetch telemetry data for the specific device using IMEI
  useEffect(() => {
    dispatch(getVehicleTelemetryDataForDevice(deviceId));
  }, [dispatch, deviceId]);

  // Update telemetry data
  useEffect(() => {
    if (telemetryData.length > 0) {
      const latestData = telemetryData[telemetryData.length - 1];

      const newDoorStatus = {
        frontLeft: latestData['can.front.left.door.status'],
        // Update other door statuses as needed
      };

      setDoorStatus((prevState) => ({
        ...prevState,
        ...newDoorStatus,
      }));

      localDispatch({
        type: 'UPDATE_TELEMETRY',
        payload: {
          doorStatus: newDoorStatus,
        },
      });
    }
  }, [telemetryData, setDoorStatus, localDispatch]);

  // Send command using the device ID obtained from the device details
  const sendCommand = useCallback(
    async (command) => {
      console.log(`Button clicked. Sending command: ${command}`);
      if (!deviceDetails) {
        console.error('Device details not available to send command');
        return;
      }

      console.log(`Sending command to device ID: ${deviceDetails.id}`);
      
      try {
        await sendCommandToFlespi(deviceDetails.id, command, {
          properties: {},
          address: 'connection',
        });
        setFeedback({ message: `Command to ${command} sent successfully`, type: 'success' });
        console.log(`Command ${command} sent successfully to device ID: ${deviceDetails.id}`);
      } catch (error) {
        console.error(`Failed to send command to ${command}:`, error);
        setFeedback({ message: `Failed to send command to ${command}`, type: 'error' });
      } finally {
        setCommandSent(false);
      }
    },
    [deviceDetails]
  );

  const doorTimerRef = useRef(null);

  useEffect(() => {
    if (!telemetryData.length) return;

    const latestData = telemetryData[telemetryData.length - 1];
    const engineStatus = latestData['engine.ignition.status'];
    const currentSpeed = latestData['can.vehicle.speed'];
    const doorOpened = latestData['can.front.left.door.status'];
    const doorLocked = latestData['can.car.closed.status'];

    if (doorStatus.frontLeft !== doorOpened) {
      setDoorStatus((prevStatus) => ({
        ...prevStatus,
        frontLeft: doorOpened,
      }));
    }

    if (!engineStatus && doorOpened) {
      setDoorOpenTime(Date.now());
    }

    if (engineStatus) {
      if (doorOpened) {
        setDoorOpenTime(Date.now());
      } else if (!doorOpened && doorOpenTime) {
        setDoorClosedAfterOpening(true);
        setDoorOpenTime(null);
      }
    } else {
      setDoorClosedAfterOpening(false);
      setDoorOpenTime(null);
    }

    if (doorOpened) {
      setDoorOpenTime(Date.now());
      setDoorClosedWithinTime(false);
    } else {
      const timeDiff = (Date.now() - doorOpenTime) / 1000;
      if (timeDiff <= 7 && doorOpenTime) {
        setDoorClosedWithinTime(true);
      }
    }

    const attemptToSendCommands = async () => {
      if (engineStatus && currentSpeed === 0 && doorClosedAfterOpening) {
        if (!commandStatus.condition1Sent) {
          await sendCommand('lvcanclosealldoors');
          setCommandStatus((prev) => ({ ...prev, condition1Sent: true }));
        }
      } else {
        setCommandStatus((prev) => ({ ...prev, condition1Sent: false }));
      }

      if (engineStatus && currentSpeed === 0 && Object.values(doorStatus).some((status) => status)) {
        if (!commandStatus.condition2Sent) {
          await sendCommand('lvcanclosealldoors');
          setCommandStatus((prev) => ({ ...prev, condition2Sent: true }));
        }
      } else {
        setCommandStatus((prev) => ({ ...prev, condition2Sent: false }));
      }

      if (!engineStatus && currentSpeed === 0 && doorClosedWithinTime && !doorLocked) {
        if (!commandStatus.condition3Sent) {
          await sendCommand('lvcanclosealldoors');
          setCommandStatus((prev) => ({ ...prev, condition3Sent: true }));
        }
      } else {
        setCommandStatus((prev) => ({ ...prev, condition3Sent: false }));
      }
    };

    if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
    doorTimerRef.current = setTimeout(attemptToSendCommands, 5000);

    return () => {
      if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
    };
  }, [
    telemetryData,
    doorClosedAfterOpening,
    doorClosedWithinTime,
    doorStatus,
    doorOpenTime,
    commandSent,
    sendCommand,
    commandStatus,
  ]);

  // Fetch geofence logs
  const fetchGeofenceLogs = async (date = null) => {
    try {
      const response = await axios.get(`${BACKEND_URL}/geofence-log`, {
        params: { date: date ? date.toISOString().split('T')[0] : undefined },
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching geofence logs:', error);
    }
  };

  useEffect(() => {
    fetchGeofenceLogs();
  }, []);

  const handleDateChange = (date) => {
    fetchGeofenceLogs(date);
  };

  const closeFeedback = useCallback(() => {
    setFeedback({ message: '', type: '' });
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(getVehicleTelemetryDataForDevice(deviceId));
    }, 5000);
    return () => clearInterval(intervalId);
  }, [dispatch, deviceId]);

  return (
    <div className="dashboard">
      <div className="top-section">
        <DeviceControl sendCommand={sendCommand} />
      </div>
      <div className="bottom-section">
        <VehicleActivityLogs telemetryData={telemetryData} fetchAddress={fetchAddress} doorStatus={state.doorStatus} />
        <GeofenceLogs logs={logs} onDateChange={handleDateChange} />
      </div>
      <FeedbackMessage feedback={feedback} closeFeedback={closeFeedback} />
    </div>
  );
};

export default LogicTwoDashboard;
