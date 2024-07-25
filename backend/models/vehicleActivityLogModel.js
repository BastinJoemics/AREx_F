const mongoose = require('mongoose');

const vehicleActivityLogSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  engineAction: {
    type: String,
    required: true
  },
  handbrake: {
    type: Boolean,
    required: true
  },
  doorStatus: {
    frontLeft: {
      type: Boolean,
      required: true
    }
  },
  engineRPM: {
    type: String,
    required: false
  },
  odometer: {
    type: String,
    required: false
  },
  vehicleSpeed: {
    type: String,
    required: true
  },
  acceleration: {
    type: String,
    required: true
  },
  vehicleIdling: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const VehicleActivityLog = mongoose.model('VehicleActivityLog', vehicleActivityLogSchema);
module.exports = VehicleActivityLog;
