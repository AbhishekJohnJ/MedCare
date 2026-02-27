const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const PatientVital = require('./PatientVital');

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Risk assessment logic function
function assessRisk(heartRate, spO2) {
  if (heartRate > 100 || spO2 < 90) {
    return {
      riskScore: 0.8,
      predictedEvent: 'High Risk'
    };
  }
  return {
    riskScore: 0.2,
    predictedEvent: 'Low Risk'
  };
}

// POST route to save patient vitals
app.post('/api/vitals', async (req, res) => {
  try {
    const { heartRate, spO2 } = req.body;
    
    // Calculate risk assessment
    const riskAssessment = assessRisk(heartRate, spO2);
    
    // Create vital record with risk assessment
    const vital = new PatientVital({
      ...req.body,
      ...riskAssessment
    });
    
    await vital.save();
    res.status(201).json(vital);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET route to retrieve patient vitals by patientId
app.get('/api/vitals/:patientId', async (req, res) => {
  try {
    const vitals = await PatientVital.find({ patientId: req.params.patientId })
      .sort({ timestamp: -1 });
    res.json(vitals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
