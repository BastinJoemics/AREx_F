import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';

import { useParams } from "react-router-dom";
import productService from '../../redux/features/product/productService';

import './dashboard.scss';

import VehicleActivityLogs from '../../components/vehicleActivityLogs/VehicleActivityLogs';
import VehicleEfficiency from '../../components/vehicleEfficiency/VehicleEfficiency';
import DeviceControl from '../../components/deviceControl/DeviceControl';
import FeedbackMessage from '../../components/feedbackMessage/FeedbackMessage';
import GeofenceLogs from '../../components/geofenceLogs/GeofenceLogs';
import { selectTelemetryDataForDevice } from '../../redux/selectors';

// Define BACKEND_URL if not defined as an environment variable
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const { getVehicleTelemetryDataForDevice, fetchAddress } = productService;
const REACT_APP_FLESPI_TOKEN = process.env.REACT_APP_FLESPI_TOKEN;


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

// // Define fetchAddress function
// const fetchAddress = async (latitude, longitude) => {
//   try {
//     const response = await axios.get(`${BACKEND_URL}/geocode`, {
//       params: { latitude, longitude }
//     });
//     return response.data;
//   } catch (error) {
//     console.error('Geocoding error:', error);
//     return 'Unable to fetch address';
//   }
// };

const Dashboard = () => {
  const { imei } = useParams(); // Get imei from the URL params
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
  const [isVehicleBlocked, setIsVehicleBlocked] = useState(false); 
  const [commandSent, setCommandSent] = useState(false);
  const [state, localDispatch] = useReducer(reducer, initialState);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [logs, setLogs] = useState([]);
  const dispatch = useDispatch();
  const telemetryData = useSelector((state) => selectTelemetryDataForDevice(state, imei));

  useEffect(() => {
    if (imei) {
      console.log(`Fetching telemetry data for device with imei: ${imei}`); // Debug log
      dispatch(getVehicleTelemetryDataForDevice(imei));
    }
  }, [dispatch, imei]);

  useEffect(() => {
    console.log(`Telemetry data for device with imei ${imei}:`, telemetryData); // Debug log
  }, [telemetryData, imei]);



  // useEffect(() => {
  //   const fetchTelemetryData = async () => {
  //     try {
  //       const response = await axios.get(`/gw/channels/1192564/messages`, {
  //         headers: {
  //           'Authorization': `FlespiToken udUH7MdyoxT7dWf8vj5sgIwf30d7VhfXw3jgV0bKVFqtBsrdh49pzHixQdYvsi7P`
  //         },
  //         params: {
  //           'data.ident': imei // Filter by imei
  //         }
  //       });
  //       setTelemetryData(response.data.result);
  //     } catch (error) {
  //       console.error('Error fetching telemetry data:', error);
  //     }
  //   };

  //   fetchTelemetryData();
  //   const intervalId = setInterval(fetchTelemetryData, 5000);

  //   return () => clearInterval(intervalId);
  // }, [imei]);

  // Process the telemetry data and update the state accordingly
  useEffect(() => {
    const updateTelemetry = () => {
      if (telemetryData.length > 0) {
        const latestData = telemetryData[telemetryData.length - 1];
        console.log("Latest Telemetry Data:", latestData);

        const newDoorStatus = {
          frontLeft: latestData['door.open.status'],
        };

        setDoorStatus(prevState => ({
          ...prevState,
          ...newDoorStatus
        }));

        localDispatch({
          type: 'UPDATE_TELEMETRY',
          payload: {
            doorStatus: newDoorStatus 
          }
        });
      }
    };

    updateTelemetry();
  }, [telemetryData, setDoorStatus, localDispatch]);

  // Refresh telemetry data at regular intervals
  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(getVehicleTelemetryDataForDevice(imei));
    }, 5000);
    return () => clearInterval(intervalId);
  }, [dispatch, imei]);

  // Function to control vehicle block status
const controlVehicleBlock = useCallback(async (forceBlock) => {
  if (!commandSent) {
    const newBlockStatus = forceBlock;
    const commandData = {
      properties: {
        out1: {
          state: newBlockStatus ? "1" : "0",
        },
      },
      address: "connection"
    };

    try {
      const deviceId = 5819862;
      await axios.put(`/gw/devices/${deviceId}/settings/setdigout_3`, commandData, {
        headers: {
          'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`
        }
      });
      setIsVehicleBlocked(newBlockStatus);
      setCommandSent(true);
      setFeedback({
        message: `Vehicle Acc ${newBlockStatus ? 'cut-off' : 'enabled'} successfully`,
        type: 'success',
      });
    } catch (error) {
      console.error(`Failed to ${newBlockStatus ? 'block' : 'unblock'} the vehicle:`, error);
      setFeedback({
        message: `Failed to ${newBlockStatus ? 'block' : 'unblock'} the vehicle`,
        type: 'error',
      });
    }
  } else {
    console.error('imei is undefined or command already sent');
    setFeedback({ message: 'imei is undefined or command already sent', type: 'error' });
  }
}, [commandSent, setIsVehicleBlocked, setCommandSent, setFeedback]);

// Function to send command
const sendCommand = useCallback(async (command) => {
  console.log('Sending command:', command);
  try {
    const deviceId = 5819862;
    await axios.put(`/gw/devices/${deviceId}/settings/${command}`, {
      properties: {},
      address: "connection",
    }, {
      headers: {
        'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`
      }
    });
    setFeedback({ message: `Command to ${command} sent successfully`, type: 'success' });
    console.log(`Command ${command} sent successfully`);
  } catch (error) {
    console.error(`Failed to send command to ${command}:`, error);
    setFeedback({ message: `Failed to send command to ${command}`, type: 'error' });
  } finally {
    setCommandSent(false);
  }
}, [setFeedback]);


  const doorTimerRef = useRef(null);

  useEffect(() => {
    if (!telemetryData.length) return;

    const latestData = telemetryData[telemetryData.length - 1];
    const engineStatus = latestData['engine.ignition.status'];
    const currentSpeed = latestData['can.vehicle.speed'];
    const doorOpened = latestData['door.open.status'];
    const doorLocked = latestData['can.car.closed.status'];

    if (doorStatus.frontLeft !== doorOpened) {
      setDoorStatus(prevStatus => ({
        ...prevStatus,
        frontLeft: doorOpened
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
      console.log('Attempting to send commands:', { engineStatus, currentSpeed, doorClosedAfterOpening, doorStatus });

      if (engineStatus && currentSpeed === 0 && doorClosedAfterOpening) {
        if (!commandStatus.condition1Sent) {
          console.log('Condition 1 met and command not sent yet');
          await sendCommand('lvcanclosealldoors');
          await sendCommand('lvcanblockengine');
          await controlVehicleBlock(true);
          setCommandStatus(prev => ({ ...prev, condition1Sent: true }));
        }
      } else {
        setCommandStatus(prev => ({ ...prev, condition1Sent: false }));
      }

      if (engineStatus && currentSpeed === 0 && Object.values(doorStatus).some(status => status)) {
        if (!commandStatus.condition2Sent) {
          console.log('Condition 2 met and command not sent yet');
          await sendCommand('lvcanclosealldoors');
          await sendCommand('lvcanblockengine');
          await controlVehicleBlock(true);
          setCommandStatus(prev => ({ ...prev, condition2Sent: true }));
        }
      } else {
        setCommandStatus(prev => ({ ...prev, condition2Sent: false }));
      }

      if (!engineStatus && currentSpeed === 0 && doorClosedWithinTime && !doorLocked) {
        if (!commandStatus.condition3Sent) {
          console.log('Condition 3 met and command not sent yet');
          await sendCommand('lvcanclosealldoors');
          await sendCommand('lvcanblockengine');
          await controlVehicleBlock(true);
          setCommandStatus(prev => ({ ...prev, condition3Sent: true }));
        }
      } else {
        setCommandStatus(prev => ({ ...prev, condition3Sent: false }));
      }
    };

    if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
    doorTimerRef.current = setTimeout(attemptToSendCommands, 5000);

    return () => {
      if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
    };
  }, [telemetryData, doorClosedAfterOpening, doorClosedWithinTime, doorStatus, doorOpenTime, commandSent, sendCommand, controlVehicleBlock, commandStatus]);

  const toggleBlockVehicle = async () => {
    const newBlockStatus = !isVehicleBlocked;

    const commandData = {
      properties: {
        out1: {
          state: newBlockStatus ? "1" : "0",
        },
      },
      address: "connection"
    };

    try {
      const deviceId = 5819862;
      await axios.put(`/gw/devices/${deviceId}/settings/setdigout_3`, commandData, {
        headers: {
          'Authorization': `FlespiToken ${REACT_APP_FLESPI_TOKEN}`
        }
      });
      setIsVehicleBlocked(newBlockStatus);
      setFeedback({
        message: `Vehicle Acc ${newBlockStatus ? 'cut-off' : 'enabled'} successfully`,
        type: 'success',
      });
    } catch (error) {
      console.error(`Failed to ${newBlockStatus ? 'block' : 'unblock'} the vehicle:`, error);
      setFeedback({
        message: `Failed to ${newBlockStatus ? 'block' : 'unblock'} the vehicle`,
        type: 'error',
      });
    }
  };

  const fetchGeofenceLogs = async (date = null) => {
    console.log('Fetching logs for date:', date);
    try {
      const response = await axios.get(`${BACKEND_URL}/geofence-log`, {
        params: { date: date ? date.toISOString().split('T')[0] : undefined }
      });
      console.log('Logs fetched:', response.data);
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching geofence logs:', error);
    }
  };

  useEffect(() => {
    fetchGeofenceLogs();
  }, []);

  const handleDateChange = (date) => {
    console.log('Selected date:', date);
    fetchGeofenceLogs(date);
  };

  const closeFeedback = useCallback(() => {
    setFeedback({ message: '', type: '' });
  }, []);

  return (
    <div className="dashboard">
      <div className="top-section">
        <DeviceControl sendCommand={sendCommand} toggleBlockVehicle={toggleBlockVehicle} isVehicleBlocked={isVehicleBlocked} />
        <VehicleEfficiency telemetryData={telemetryData} imei={imei} />
      </div>
      <div className="bottom-section">
        <GeofenceLogs logs={logs} onDateChange={handleDateChange} />
        <VehicleActivityLogs telemetryData={telemetryData} fetchAddress={fetchAddress} doorStatus={state.doorStatus} imei={imei}/>
      </div>
      <FeedbackMessage feedback={feedback} closeFeedback={closeFeedback} />
    </div>
  );
};

export default Dashboard;
