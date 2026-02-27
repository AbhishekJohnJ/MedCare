const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_URL = 'http://localhost:3000/api/vitals';
const CSV_FILE = path.join(__dirname, 'chartevents.csv');
const INTERVAL = 2000; // 2 seconds
const PATIENT_ID = 'patient_001';

// Label IDs for vital signs
const HEART_RATE_LABEL = '220045';
const SPO2_LABEL = '220277';
const MAP_LABEL = '220052'; // Mean Arterial Pressure

let vitalsBySubject = {};
let currentIndex = 0;
let patientIds = [];

// Read CSV file and organize data by subject
function loadCSVData() {
  return new Promise((resolve, reject) => {
    let rowCount = 0;
    
    fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        // Get subject ID and label ID
        const subjectId = row.SUBJECT_ID || row.subject_id;
        const itemId = row.ITEMID || row.itemid || row.LABEL_ID;
        const value = parseFloat(row.VALUENUM || row.valuenum || row.VALUE);
        const chartTime = row.CHARTTIME || row.charttime || row.timestamp;
        
        if (!subjectId || !itemId || isNaN(value)) {
          return;
        }
        
        // Initialize subject data if not exists
        if (!vitalsBySubject[subjectId]) {
          vitalsBySubject[subjectId] = {
            heartRate: null,
            spO2: null,
            map: null,
            timestamp: chartTime
          };
        }
        
        // Map label IDs to vital signs
        if (itemId === HEART_RATE_LABEL) {
          vitalsBySubject[subjectId].heartRate = value;
          vitalsBySubject[subjectId].timestamp = chartTime;
        } else if (itemId === SPO2_LABEL) {
          vitalsBySubject[subjectId].spO2 = value;
          vitalsBySubject[subjectId].timestamp = chartTime;
        } else if (itemId === MAP_LABEL) {
          vitalsBySubject[subjectId].map = value;
          vitalsBySubject[subjectId].timestamp = chartTime;
        }
      })
      .on('end', () => {
        // Filter subjects that have at least heart rate and spO2
        patientIds = Object.keys(vitalsBySubject).filter(id => {
          const vitals = vitalsBySubject[id];
          return vitals.heartRate !== null && vitals.spO2 !== null;
        });
        
        console.log(`CSV file loaded successfully. Total rows: ${rowCount}`);
        console.log(`Found ${patientIds.length} patients with complete vital signs`);
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Create vitals data object
function createVitalsData(subjectId) {
  const vitals = vitalsBySubject[subjectId];
  
  return {
    patientId: PATIENT_ID,
    timestamp: vitals.timestamp || new Date().toISOString(),
    heartRate: vitals.heartRate || 75,
    meanArterialPressure: vitals.map || 80,
    spO2: vitals.spO2 || 95
  };
}

// Send data to API
async function ingestData() {
  if (patientIds.length === 0) {
    console.log('No data available to ingest');
    return;
  }

  // Get current patient and cycle through data
  const subjectId = patientIds[currentIndex];
  currentIndex = (currentIndex + 1) % patientIds.length;

  try {
    const vitalsData = createVitalsData(subjectId);
    const response = await axios.post(API_URL, vitalsData);
    
    console.log('Data Ingested Successfully', {
      sourceSubject: subjectId,
      patientId: vitalsData.patientId,
      heartRate: vitalsData.heartRate,
      spO2: vitalsData.spO2,
      map: vitalsData.meanArterialPressure,
      riskScore: response.data.riskScore,
      predictedEvent: response.data.predictedEvent
    });
  } catch (error) {
    console.error('Error ingesting data:', error.message);
  }
}

// Start the ingestion process
async function startIngestion() {
  try {
    console.log('Loading CSV data from:', CSV_FILE);
    console.log('Looking for Heart Rate (Label ID: 220045) and SpO2 (Label ID: 220277)...');
    
    await loadCSVData();
    
    if (patientIds.length === 0) {
      console.error('No valid patient data found in CSV file');
      process.exit(1);
    }
    
    console.log('Starting data ingestion...');
    console.log(`Posting data every ${INTERVAL / 1000} seconds to ${API_URL}`);
    console.log(`Using patient ID: ${PATIENT_ID}`);
    
    // Ingest first row immediately
    await ingestData();
    
    // Then continue every 2 seconds
    setInterval(ingestData, INTERVAL);
  } catch (error) {
    console.error('Error starting ingestion:', error.message);
    process.exit(1);
  }
}

// Start the script
startIngestion();
