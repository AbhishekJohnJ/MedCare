const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const API_URL = 'http://localhost:3000/api/vitals';
const CSV_FILE = path.join(__dirname, 'chartevents.csv');
const INTERVAL = 5000; // 5 seconds
const RECORDS_PER_BATCH = 5; // Send 5 records every 5 seconds
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

// Create vitals data object with variation
function createVitalsData(subjectId) {
  const vitals = vitalsBySubject[subjectId];
  
  // Add realistic variation to vital signs
  const baseHeartRate = vitals.heartRate || 75;
  const baseSpO2 = vitals.spO2 || 95;
  const baseMAP = vitals.map || 80;
  
  // Create variation patterns for different subjects
  const subjectVariation = getSubjectVariation(subjectId);
  
  // Apply variation with realistic medical ranges
  const heartRate = Math.max(40, Math.min(180, 
    baseHeartRate + (Math.random() - 0.5) * subjectVariation.hrVariation
  ));
  
  const spO2 = Math.max(70, Math.min(100, 
    baseSpO2 + (Math.random() - 0.5) * subjectVariation.spo2Variation
  ));
  
  const meanArterialPressure = Math.max(50, Math.min(120, 
    baseMAP + (Math.random() - 0.5) * subjectVariation.mapVariation
  ));
  
  return {
    patientId: subjectId,
    timestamp: new Date().toISOString(),
    heartRate: Math.round(heartRate),
    meanArterialPressure: Math.round(meanArterialPressure),
    spO2: Math.round(spO2)
  };
}

// Get variation patterns for different subjects to create diverse risk profiles
function getSubjectVariation(subjectId) {
  const hash = subjectId.toString().split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const patterns = [
    // Stable patient
    { hrVariation: 10, spo2Variation: 3, mapVariation: 8 },
    // Moderate risk patient
    { hrVariation: 25, spo2Variation: 8, mapVariation: 15 },
    // High risk patient
    { hrVariation: 40, spo2Variation: 15, mapVariation: 25 },
    // Critical patient
    { hrVariation: 50, spo2Variation: 20, mapVariation: 30 },
    // Recovering patient
    { hrVariation: 15, spo2Variation: 5, mapVariation: 12 }
  ];
  
  return patterns[Math.abs(hash) % patterns.length];
}

// Send multiple data points to API
async function ingestData() {
  if (patientIds.length === 0) {
    console.log('No data available to ingest');
    return;
  }

  console.log(`\n--- Ingesting ${RECORDS_PER_BATCH} records at ${new Date().toLocaleTimeString()} ---`);
  
  for (let i = 0; i < RECORDS_PER_BATCH; i++) {
    // Get current patient and cycle through data
    const subjectId = patientIds[currentIndex];
    currentIndex = (currentIndex + 1) % patientIds.length;

    try {
      const vitalsData = createVitalsData(subjectId);
      const response = await axios.post(API_URL, vitalsData);
      
      const riskIcon = response.data.predictedEvent === 'High Risk' ? '🔴' : '🟢';
      
      console.log(`${riskIcon} Subject ${subjectId}: HR=${vitalsData.heartRate}, SpO2=${vitalsData.spO2}%, MAP=${vitalsData.meanArterialPressure} | Risk: ${response.data.predictedEvent} (${response.data.riskScore})`);
      
      // Small delay between records to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`❌ Error ingesting data for subject ${subjectId}:`, error.message);
    }
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
    console.log(`Posting ${RECORDS_PER_BATCH} records every ${INTERVAL / 1000} seconds to ${API_URL}`);
    console.log(`Found ${patientIds.length} unique subjects with complete vitals`);
    console.log(`Each subject will have varied vital signs for realistic risk assessment\n`);
    
    // Ingest first batch immediately
    await ingestData();
    
    // Then continue every 5 seconds
    setInterval(ingestData, INTERVAL);
  } catch (error) {
    console.error('Error starting ingestion:', error.message);
    process.exit(1);
  }
}

// Start the script
startIngestion();
