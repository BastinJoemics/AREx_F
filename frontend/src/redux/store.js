import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../redux/features/auth/authSlice";
import vehicleTelemetryReducer from "./features/product/vehicleTelemetryReducer";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicle: vehicleTelemetryReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      immutableCheck: process.env.NODE_ENV !== 'production' ? {
        warnAfter: 100, // ms
      } : false,
      serializableCheck: process.env.NODE_ENV !== 'production' ? {
        warnAfter: 100, // ms
      } : false,
    }),
  devTools: process.env.NODE_ENV !== 'production',
});
