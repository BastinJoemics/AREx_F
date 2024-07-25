import axios from "axios";
import { fetchStart, fetchSuccess, fetchFailure } from './vehicleTelemetryActions';


const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const GEOCODE_API_URL = `${BACKEND_URL}/geocode`;

const getTelemetryData = async () => {
  const maxRetries = 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/flespi/gw/channels/1211469/messages`, {
        headers: {
          'Authorization': `FlespiToken ${process.env.REACT_APP_FLESPI_TOKEN}`
        }
      });

      if (response.data && response.data.result) {
        return response.data;
      } else {
        console.warn('No result field in response data:', response.data);
        throw new Error('Invalid response structure');
      }

    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          console.error('Unauthorized access - please check your Flespi token.');
          break; // Break the loop if it's an unauthorized error
        } else if (error.response.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || (2 ** i) * 1000;
          console.warn(`Rate limit exceeded. Retrying after ${retryAfter} ms...`);
          await delay(retryAfter);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries reached. Could not fetch telemetry data.');
};

export const getVehicleTelemetryData = () => async (dispatch) => {
  dispatch({ type: 'vehicleTelemetry/fetchStart' });
  try {
    const vehiclesData = await getTelemetryData();
    dispatch({
      type: 'vehicleTelemetry/fetchSuccess',
      payload: vehiclesData.result, // Ensure this matches the actual data structure
    });
  } catch (error) {
    dispatch({
      type: 'vehicleTelemetry/fetchFailure',
      payload: error.message,
    });
    console.error('Failed to fetch vehicle telemetry data:', error);
  }
};

const fetchAddress = async (latitude, longitude) => {
  try {
    const response = await axios.get(`${GEOCODE_API_URL}?latitude=${latitude}&longitude=${longitude}`);
    return response.data;
  } catch (error) {
    console.error('Geocoding error:', error);
    return 'Unable to fetch address';
  }
};

const sendCommandToFlespi = async (deviceId, command, data) => {
  try {
    const response = await axios.put(`${BACKEND_URL}/api/flespi/gw/devices/${deviceId}/settings/${command}`, data);
    return response.data;
  } catch (error) {
    console.error('Error sending command to Flespi:', error);
    throw error;
  }
};

const getTelemetryDataForDevice = async (imei) => {
  const maxRetries = 5;
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/flespi/gw/channels/1211469/messages`, {
        headers: {
          'Authorization': `FlespiToken ${process.env.REACT_APP_FLESPI_TOKEN}`
        },
        params: {
          'data.ident': imei
        }
      });

      // console.log('API response:', response.data); // Debug log

      if (response.data && response.data.result) {
        return response.data.result; // Directly return the result array
      } else {
        console.warn('No result field in response data:', response.data);
        throw new Error('Invalid response structure');
      }
      
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after'] || (2 ** i) * 1000;
        console.warn(`Rate limit exceeded. Retrying after ${retryAfter} ms...`);
        await delay(retryAfter);
      } else {
        throw error;
      }
    }
  }

  throw new Error('Max retries reached. Could not fetch telemetry data.');
};

export const getVehicleTelemetryDataForDevice = (imei) => async (dispatch) => {
  dispatch(fetchStart());
  try {
    const vehicleData = await getTelemetryDataForDevice(imei);
    dispatch(fetchSuccess(vehicleData)); // Ensure this is the actual data array
  } catch (error) {
    dispatch(fetchFailure(error.message));
    console.error('Failed to fetch vehicle telemetry data for device:', error);
  }
};


const productService = {
  getVehicleTelemetryData,
  fetchAddress,
  sendCommandToFlespi,
  getVehicleTelemetryDataForDevice
};

export default productService;
