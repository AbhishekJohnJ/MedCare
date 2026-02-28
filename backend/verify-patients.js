const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const PatientVital = require('./PatientVital');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';

async function verifyPatients() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all unique patient IDs
    const patients = await PatientVital.distinct('patientId');
    
    console.log('\n--- All Patients in Database ---');
    console.log('Total unique patients:', patients.filter(p => p !== null).length);
    console.log('\nPatient IDs:');
    patients.filter(p => p !== null).forEach(id => {
      console.log(`  - ${id}`);
    });

    // Check specifically for patient_001 to patient_005
    const testPatients = ['patient_001', 'patient_002', 'patient_003', 'patient_004', 'patient_005'];
    console.log('\n--- Checking for test patients ---');
    for (const patientId of testPatients) {
      const count = await PatientVital.countDocuments({ patientId });
      console.log(`${patientId}: ${count} records`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

verifyPatients();
