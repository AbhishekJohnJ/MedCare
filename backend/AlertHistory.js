const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    index: true
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW']
  },
  prediction: {
    type: String,
    required: true
  },
  concerns: [{
    type: String
  }],
  recommendations: [{
    type: String
  }],
  vitals: {
    heartRate: Number,
    spO2: Number,
    meanArterialPressure: Number
  },
  trends: {
    hrTrend: Number,
    spo2Trend: Number,
    mapTrend: Number,
    hrVariability: Number,
    spo2Variability: Number
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('AlertHistory', alertHistorySchema);
