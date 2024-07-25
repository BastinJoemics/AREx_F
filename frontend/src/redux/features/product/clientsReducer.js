// clientsReducer.js
const initialState = {
    clients: [],
  };
  
  const clientsReducer = (state = { clients: [] }, action) => {
    switch (action.type) {
      case 'client/fetchSuccess':
        return { ...state, clients: action.payload };
      default:
        return state;
    }
  };
  
  export default clientsReducer;
  