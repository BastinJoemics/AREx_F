
const initialState = {
    vehicles: [], // Ensure this is defined
    details: {},
    isLoading: false,
    error: null,
  };
  
  const vehicleReducer = (state = { vehicles: [], details: {} }, action) => {
    switch (action.type) {
      case 'vehicle/fetchSuccess':
        return { ...state, vehicles: action.payload };
      case 'vehicleDetails/fetchSuccess':
        const { vehicleId, details } = action.payload;
        return { ...state, details: { ...state.details, [vehicleId]: details } };
      default:
        return state;
    }
  };
  
  export default vehicleReducer;
  