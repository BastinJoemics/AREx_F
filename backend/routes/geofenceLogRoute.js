const express = require('express');
const router = express.Router();
const GeofenceLog = require('../models/geofenceLogModel');

// Endpoint to get geofence logs with optional date filtering
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let logs;

    if (date) {
      const start = new Date(date);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setUTCHours(23, 59, 59, 999);
      logs = await GeofenceLog.find({ timestamp: { $gte: start, $lte: end } });
    } else {
      logs = await GeofenceLog.find();
    }

    res.status(200).send(logs);
  } catch (error) {
    console.error('Error fetching geofence logs:', error);
    res.status(400).send({ message: 'Error fetching logs', details: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { vehicleId, geofenceId, eventType, timestamp } = req.body;

    // Calculate duration for 'exit' event
    if (eventType === 'exit') {
      const enterLog = await GeofenceLog.findOne({
        vehicleId,
        geofenceId,
        eventType: 'enter'
      }).sort({ timestamp: -1 });

      if (enterLog) {
        const duration = new Date(timestamp) - new Date(enterLog.timestamp);
        req.body.duration = duration;
      }
    }

    const log = new GeofenceLog(req.body);
    await log.save();
    res.status(201).send(log);
  } catch (error) {
    console.error('Error creating geofence log:', error);
    res.status(400).send({ message: 'Error creating log', details: error.message });
  }
});

module.exports = router;
