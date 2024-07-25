import React, { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import productService from '../../redux/features/product/productService';
import '../dashboard/dashboard.scss';
import VehicleActivityLogs from '../../components/vehicleActivityLogs/VehicleActivityLogs';
import DeviceControl from '../../components/deviceControl/Logic2/DeviceControl';
import FeedbackMessage from '../../components/feedbackMessage/FeedbackMessage';
import GeofenceLogs from '../../components/geofenceLogs/GeofenceLogs';
import { selectTelemetryDataForDevice} from '../../redux/selectors';

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

const LogicThreeDashboard = () => {
  const { deviceId } = useParams();
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
  // const [isVehicleBlocked, setIsVehicleBlocked] = useState(false); 
  const [commandSent, setCommandSent] = useState(false);
  const dispatch = useDispatch();
  const telemetryData = useSelector((state) => selectTelemetryDataForDevice(state, deviceId));
  const [state, localDispatch] = useReducer(reducer, initialState);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [logs, setLogs] = useState([]);

   // Fetch telemetry data for the specific device
   useEffect(() => {
    dispatch(getVehicleTelemetryDataForDevice(deviceId));
  }, [dispatch, deviceId]);
  
// **************************************TELEMETRY DATA********************************************************************

useEffect(() => {
  const updateTelemetry = () => {
    if (telemetryData.length > 0) {
      const latestData = telemetryData[telemetryData.length - 1];
      console.log("Latest Telemetry Data:", latestData);

      const newDoorStatus = {
        frontLeft: latestData['can.front.left.door.status'],
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

// ****************************************SEND COMMAND******************************************************************

const sendCommand = useCallback(async (command) => {
  console.log('Sending command:', command);
    try {
      const deviceId = 5559968;
      await sendCommandToFlespi(deviceId, command, {
        properties: {},
        address: "connection",
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
  const doorOpened = latestData['can.front.left.door.status'];
  const doorLocked = latestData['can.car.closed.status'];

  // Prevent unnecessary updates if the door status hasn't changed
  if (doorStatus.frontLeft !== doorOpened) {
    setDoorStatus(prevStatus => ({
      ...prevStatus,
      frontLeft: doorOpened
    }));
  }

    // Track when the door is opened with the engine off
    if (!engineStatus && doorOpened) {
      setDoorOpenTime(Date.now()); // Track the time when door was opened
    }
  
    // Manage door opening/closing events
  if (engineStatus) {
    if (doorOpened) {
      setDoorOpenTime(Date.now()); // Door is opened while engine is on
    } else if (!doorOpened && doorOpenTime) {
      // Set doorClosedAfterOpening only if the door has just transitioned from open to closed
      setDoorClosedAfterOpening(true);
      // Reset doorOpenTime to null after closing to require a new open event to trigger again
      setDoorOpenTime(null);
    }
  } else {
    // Reset the door closed flag and open time if engine is off
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
  // Commands logic separated into its own function to be called conditionally
  const attemptToSendCommands = async () => {
    console.log('Attempting to send commands:', { engineStatus, currentSpeed, doorClosedAfterOpening, doorStatus });
  
    // Condition 1: Engine on, speed 0, door closed after opening
    if (engineStatus && currentSpeed === 0 && doorClosedAfterOpening) {
      if (!commandStatus.condition1Sent) {
        console.log('Condition 1 met and command not sent yet');
        await sendCommand('lvcanclosealldoors');
        await sendCommand('lvcanblockengine');
        setCommandStatus(prev => ({ ...prev, condition1Sent: true }));
      }
    } else {
      setCommandStatus(prev => ({ ...prev, condition1Sent: false })); // Reset if condition no longer met
    }
  
    // Condition 2: Engine on, speed 0, any door open
    if (engineStatus && currentSpeed === 0 && Object.values(doorStatus).some(status => status)) {
      if (!commandStatus.condition2Sent) {
        console.log('Condition 2 met and command not sent yet');
        await sendCommand('lvcanclosealldoors');
        await sendCommand('lvcanblockengine');
        setCommandStatus(prev => ({ ...prev, condition2Sent: true }));
      }
    } else {
      setCommandStatus(prev => ({ ...prev, condition2Sent: false }));
    }
  
        // Condition 3: Engine off, speed 0, door closed within time, door not locked
    if (!engineStatus && currentSpeed === 0 && doorClosedWithinTime && !doorLocked) {
      if (!commandStatus.condition3Sent) {
        console.log('Condition 3 met and command not sent yet');
        await sendCommand('lvcanclosealldoors');
        await sendCommand('lvcanblockengine');
        setCommandStatus(prev => ({ ...prev, condition3Sent: true }));
      }
    } else {
      setCommandStatus(prev => ({ ...prev, condition3Sent: false }));
    }
  };
  

  // Use a timeout to delay commands if needed, avoiding setting state that directly triggers re-render
  if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
  doorTimerRef.current = setTimeout(attemptToSendCommands, 5000);

  return () => {
    if (doorTimerRef.current) clearTimeout(doorTimerRef.current);
  };
}, [telemetryData, doorClosedAfterOpening, doorClosedWithinTime, doorStatus, doorOpenTime, commandSent, sendCommand, commandStatus]);
 
// *******************************************GEOFENCE LOGS***************************************************************

const fetchGeofenceLogs = async (date = null) => {
  console.log('Fetching logs for date:', date); // Add this line
  try {
    const response = await axios.get(`${BACKEND_URL}/geofence-log`, {
      params: { date: date ? date.toISOString().split('T')[0] : undefined }
    });
    console.log('Logs fetched:', response.data); // Add this line
    setLogs(response.data);
  } catch (error) {
    console.error('Error fetching geofence logs:', error);
  }
};

useEffect(() => {
  fetchGeofenceLogs();
}, []);

const handleDateChange = (date) => {
  console.log('Selected date:', date); // Add this line
  fetchGeofenceLogs(date);
};
// *******************************************CLOSE FEEDBACK POP-UP***************************************************************

const closeFeedback = useCallback(() => {
  setFeedback({ message: '', type: '' });
}, []);

// *******************************************TIME INTERVAL***************************************************************

  // Refresh telemetry data at regular intervals
  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(getVehicleTelemetryDataForDevice(deviceId));
    }, 5000);
    return () => clearInterval(intervalId);
  }, [dispatch, deviceId]);

// ********************************************JSX**************************************************************

  return (
    <div className="dashboard">
    <div className="top-section">
      <DeviceControl sendCommand={sendCommand}/>
    </div>
    <div className="bottom-section">
      <VehicleActivityLogs telemetryData={telemetryData} fetchAddress={fetchAddress} doorStatus={state.doorStatus} />
      <GeofenceLogs logs={logs} onDateChange={handleDateChange} />
    </div>
    <FeedbackMessage feedback={feedback} closeFeedback={closeFeedback} />
  </div>
  );
};

export default LogicThreeDashboard;
