const mongoose = require('mongoose');
const PatientVital = require('./PatientVital');

mongoose.connect('mongodb://localhost:27017/AurelionDB')
  .then(async () => {
    console.log('✓ Connected to MongoDB\n');
    
    // Get all vitals
    const vitals = await PatientVital.find().sort({ timestamp: -1 }).limit(10);
    
    console.log(`Found ${vitals.length} records (showing last 10):\n`);
    
    vitals.forEach((vital, index) => {
      console.log(`Record ${index + 1}:`);
      console.log(`  Patient ID: ${vital.patientId}`);
      console.log(`  Timestamp: ${vital.timestamp}`);
      console.log(`  Heart Rate: ${vital.heartRate} BPM`);
      console.log(`  SpO2: ${vital.spO2}%`);
      console.log(`  MAP: ${vital.meanArterialPressure} mmHg`);
      console.log(`  Risk Score: ${vital.riskScore}`);
      console.log(`  Predicted Event: ${vital.predictedEvent}`);
      console.log('---');
    });
    
    // Get count by patient
    const count = await PatientVital.countDocuments();
    console.log(`\nTotal records in database: ${count}`);
    
    mongoose.connection.close();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
