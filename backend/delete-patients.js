const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const PatientVital = require('./PatientVital');
const AlertHistory = require('./AlertHistory');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';

async function deletePatients() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Define patients to delete
    const patientsToDelete = ['patient_001', 'patient_002', 'patient_003', 'patient_004', 'patient_005'];

    console.log('\nDeleting patients:', patientsToDelete.join(', '));

    // Delete from PatientVital collection
    const vitalResult = await PatientVital.deleteMany({
      patientId: { $in: patientsToDelete }
    });
    console.log(`\n✓ Deleted ${vitalResult.deletedCount} vital records`);

    // Delete from AlertHistory collection
    const alertResult = await AlertHistory.deleteMany({
      patientId: { $in: patientsToDelete }
    });
    console.log(`✓ Deleted ${alertResult.deletedCount} alert history records`);

    // Verify deletion
    const remainingVitals = await PatientVital.countDocuments({
      patientId: { $in: patientsToDelete }
    });
    const remainingAlerts = await AlertHistory.countDocuments({
      patientId: { $in: patientsToDelete }
    });

    console.log('\n--- Verification ---');
    console.log(`Remaining vital records: ${remainingVitals}`);
    console.log(`Remaining alert records: ${remainingAlerts}`);

    if (remainingVitals === 0 && remainingAlerts === 0) {
      console.log('\n✓ All specified patients successfully deleted!');
    } else {
      console.log('\n⚠ Warning: Some records may still exist');
    }

    // Show remaining patients
    const remainingPatients = await PatientVital.distinct('patientId');
    console.log('\n--- Remaining Patients in Database ---');
    console.log(remainingPatients.filter(p => p !== null).join(', '));

  } catch (error) {
    console.error('Error deleting patients:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the deletion
deletePatients();
