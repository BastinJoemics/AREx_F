// vehicleTelemetryActions.js
export const fetchStart = () => ({
  type: 'vehicleTelemetry/fetchStart',
});

export const fetchSuccess = (data) => ({
  type: 'vehicleTelemetry/fetchSuccess',
  payload: data,
});

export const fetchFailure = (error) => ({
  type: 'vehicleTelemetry/fetchFailure',
  payload: error,
});

export const setTelemetryDataForDevice = (deviceId, data) => ({
  type: 'vehicleTelemetry/setTelemetryDataForDevice',
  payload: { deviceId, data },
});
