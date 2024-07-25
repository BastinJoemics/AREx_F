import { createSelector } from 'reselect';

const getTelemetryDataState = (state) => state.vehicle.telemetryData;

export const selectUser = (state) => state.auth.user;

// Existing selector to get all telemetry data
export const selectTelemetryData = createSelector(
  [getTelemetryDataState],
  (telemetryData) => Object.values(telemetryData)
);

// New selector to get telemetry data for a specific device
export const selectTelemetryDataForDevice = createSelector(
  [getTelemetryDataState, (state, imei) => imei],
  (telemetryData, imei) => {
    if (!telemetryData || typeof telemetryData !== 'object') {
      return [];
    }
    return Object.values(telemetryData).filter(data => data.ident === imei);
  }
);
