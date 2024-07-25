const express = require('express');
const router = express.Router();
const VehicleActivityLog = require('../models/vehicleActivityLogModel');

// Helper function to check if relevant fields have changed
const haveRelevantFieldsChanged = (newLog, existingLog) => {
  const fieldsToCheck = ['action', 'location', 'engineAction', 'handbrake', 'doorStatus', 'engineRPM', 'odometer', 'vehicleSpeed', 'acceleration', 'vehicleIdling'];
  return fieldsToCheck.some(field => {
    if (typeof newLog[field] === 'object' && typeof existingLog[field] === 'object') {
      return JSON.stringify(newLog[field]) !== JSON.stringify(existingLog[field]);
    }
    return newLog[field] !== existingLog[field];
  });
};

// Endpoint to create vehicle activity log
router.post('/', async (req, res) => {
  try {
    const newLog = req.body;

    // Fetch the last log entry to compare
    const lastLog = await VehicleActivityLog.findOne({ vehicleId: newLog.vehicleId }).sort({ _id: -1 }).exec();

    const currentTime = Date.now();
    const lastLogTime = lastLog ? new Date(lastLog.timestamp).getTime() : 0;

    // Check if 1 minute has passed since the last log and if relevant fields have changed
    if (lastLog && currentTime - lastLogTime < 60000 && !haveRelevantFieldsChanged(newLog, lastLog)) {
      console.log('No relevant changes detected, log not saved');
      return res.status(200).send({ message: 'No relevant changes detected, log not saved' });
    }

    const log = new VehicleActivityLog(newLog);
    await log.save();
    res.status(201).send(log);
  } catch (error) {
    console.error('Error creating vehicle activity log:', error);
    res.status(400).send({ message: 'Error creating log', details: error.message });
  }
});

// Endpoint to get vehicle activity logs by date
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).send({ message: 'Date query parameter is required' });
    }

    const start = new Date(date);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setUTCHours(23, 59, 59, 999);

    const logs = await VehicleActivityLog.find({ timestamp: { $gte: start, $lte: end } });
    res.status(200).send(logs);
  } catch (error) {
    console.error('Error fetching vehicle activity logs:', error);
    res.status(400).send({ message: 'Error fetching logs', details: error.message });
  }
});

module.exports = router;
