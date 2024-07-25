// vehicleTelemetryReducer.js
const initialState = {
  telemetryData: {},
  loading: false,
  error: null,
};

function vehicleTelemetryReducer(state = initialState, action) {
  switch (action.type) {
    case 'vehicleTelemetry/fetchStart':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'vehicleTelemetry/fetchSuccess':
      const newTelemetryData = {};
      action.payload.forEach(vehicle => {
        newTelemetryData[vehicle.ident] = vehicle;
      });
      return {
        ...state,
        telemetryData: newTelemetryData,
        loading: false,
      };
    case 'vehicleTelemetry/fetchFailure':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
}

export default vehicleTelemetryReducer;
