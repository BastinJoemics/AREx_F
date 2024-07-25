import React, { useEffect, useReducer } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import productService from '../../redux/features/product/productService';
import '../dashboard/dashboard.scss';
import VehicleActivityLogs from '../../components/vehicleActivityLogs/VehicleActivityLogs';
import { selectTelemetryDataForDevice } from '../../redux/selectors';

const { getVehicleTelemetryDataForDevice, fetchAddress } = productService;

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

const LogicOneDashboard = () => {
  const { deviceId } = useParams();
  const dispatch = useDispatch();
  const telemetryData = useSelector((state) => selectTelemetryDataForDevice(state, deviceId));
  const [state, localDispatch] = useReducer(reducer, initialState);

  // Fetch telemetry data for the specific device
  useEffect(() => {
    dispatch(getVehicleTelemetryDataForDevice(deviceId));
  }, [dispatch, deviceId]);

  // Update telemetry data
  useEffect(() => {
    const updateTelemetry = () => {
      if (telemetryData.length > 0) {
        const latestData = telemetryData[telemetryData.length - 1];
        console.log("Latest Telemetry Data:", latestData);

        const newDoorStatus = {
          frontLeft: latestData['can.front.left.door.status'],
        };

        localDispatch({
          type: 'UPDATE_TELEMETRY',
          payload: {
            doorStatus: newDoorStatus 
          }
        });
      }
    };

    updateTelemetry();
  }, [telemetryData, localDispatch]);

  // Refresh telemetry data at regular intervals
  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(getVehicleTelemetryDataForDevice(deviceId));
    }, 5000);
    return () => clearInterval(intervalId);
  }, [dispatch, deviceId]);

  return (
    <div className="dashboard">
      <div className="top-section">
        <VehicleActivityLogs telemetryData={telemetryData} fetchAddress={fetchAddress} doorStatus={state.doorStatus} />
      </div>
    </div>
  );
};

export default LogicOneDashboard;
