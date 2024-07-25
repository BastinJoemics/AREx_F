const mongoose = require('mongoose');

const geofenceLogSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true
  },
  geofenceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Geofence',
    required: true
  },
  eventType: {
    type: String,
    enum: ['enter', 'exit', 'inside'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number,
    default: 0 // Duration in milliseconds, only applicable for 'exit' events
  }
});

const GeofenceLog = mongoose.model('GeofenceLog', geofenceLogSchema);
module.exports = GeofenceLog;
