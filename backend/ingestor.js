const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_URL = 'http://localhost:3000/api/vitals';
const CSV_FILE = path.join(__dirname, 'chartevents.csv');
const INTERVAL = 2000; // 2 seconds
const PATIENT_ID = 'patient_001';
const MAX_ROWS = 50000; // Limit rows to prevent memory issues

// Label IDs for vital signs (MIMIC-IV)
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
    let stream;
    let hrCount = 0, spo2Count = 0, mapCount = 0;
    
    console.log('Starting CSV stream...');
    
    stream = fs.createReadStream(CSV_FILE)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;
        
        if (rowCount % 10000 === 0) {
          console.log(`Processed ${rowCount} rows... HR: ${hrCount}, SpO2: ${spo2Count}, MAP: ${mapCount}`);
        }
        
        // Stop reading after MAX_ROWS to prevent memory issues
        if (rowCount >= MAX_ROWS) {
          console.log(`Reached MAX_ROWS limit of ${MAX_ROWS}`);
          stream.pause();
          stream.destroy();
          
          // Manually trigger completion
          setTimeout(() => {
            patientIds = Object.keys(vitalsBySubject).filter(id => {
              const vitals = vitalsBySubject[id];
              return vitals.heartRate !== null && vitals.spO2 !== null;
            });
            
            console.log(`CSV file loaded successfully. Processed rows: ${MAX_ROWS}`);
            console.log(`Total unique subjects found: ${Object.keys(vitalsBySubject).length}`);
            console.log(`Patients with complete vital signs (HR + SpO2): ${patientIds.length}`);
            
            if (patientIds.length > 0) {
              const sample = vitalsBySubject[patientIds[0]];
              console.log(`Sample data - HR: ${sample.heartRate}, SpO2: ${sample.spO2}, MAP: ${sample.map}`);
            }
            
            resolve();
          }, 100);
          return;
        }
        
        // Get subject ID and label ID
        const subjectId = row.subject_id || row.SUBJECT_ID;
        const itemId = row.itemid || row.ITEMID || row.LABEL_ID;
        const value = parseFloat(row.valuenum || row.VALUENUM || row.VALUE);
        const chartTime = row.charttime || row.CHARTTIME || row.timestamp;
        
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
          hrCount++;
        } else if (itemId === SPO2_LABEL) {
          vitalsBySubject[subjectId].spO2 = value;
          vitalsBySubject[subjectId].timestamp = chartTime;
          spo2Count++;
        } else if (itemId === MAP_LABEL) {
          vitalsBySubject[subjectId].map = value;
          vitalsBySubject[subjectId].timestamp = chartTime;
          mapCount++;
        }
      })
      .on('end', () => {
        // Filter subjects that have at least heart rate and spO2
        patientIds = Object.keys(vitalsBySubject).filter(id => {
          const vitals = vitalsBySubject[id];
          return vitals.heartRate !== null && vitals.spO2 !== null;
        });
        
        console.log(`CSV file loaded successfully. Processed rows: ${Math.min(rowCount, MAX_ROWS)}`);
        console.log(`Total unique subjects found: ${Object.keys(vitalsBySubject).length}`);
        console.log(`Patients with complete vital signs (HR + SpO2): ${patientIds.length}`);
        
        if (patientIds.length > 0) {
          const sample = vitalsBySubject[patientIds[0]];
          console.log(`Sample data - HR: ${sample.heartRate}, SpO2: ${sample.spO2}, MAP: ${sample.map}`);
        }
        
        resolve();
      })
      .on('error', (error) => {
        if (error.code === 'ERR_STREAM_PREMATURE_CLOSE') {
          // Stream was intentionally destroyed after MAX_ROWS
          patientIds = Object.keys(vitalsBySubject).filter(id => {
            const vitals = vitalsBySubject[id];
            return vitals.heartRate !== null && vitals.spO2 !== null;
          });
          
          console.log(`CSV file loaded successfully. Processed rows: ${MAX_ROWS}`);
          console.log(`Total unique subjects found: ${Object.keys(vitalsBySubject).length}`);
          console.log(`Patients with complete vital signs (HR + SpO2): ${patientIds.length}`);
          
          if (patientIds.length > 0) {
            const sample = vitalsBySubject[patientIds[0]];
            console.log(`Sample data - HR: ${sample.heartRate}, SpO2: ${sample.spO2}, MAP: ${sample.map}`);
          }
          
          resolve();
        } else {
          reject(error);
        }
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
