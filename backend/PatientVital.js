const mongoose = require('mongoose');

const patientVitalSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  heartRate: {
    type: Number,
    required: true
  },
  meanArterialPressure: {
    type: Number,
    required: true
  },
  spO2: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('PatientVital', patientVitalSchema);
