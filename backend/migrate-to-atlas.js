const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ── Connection strings ──────────────────────────────────────────────
const LOCAL_URI  = process.env.MONGODB_URI; // your local compass DB
const ATLAS_URI  = 'mongodb+srv://abhishekjohnj411_db_user:stonecol@medcare.jwrgir0.mongodb.net/AurelionDB?retryWrites=true&w=majority';

// ── Schema (same as PatientVital.js) ───────────────────────────────
const vitalSchema = new mongoose.Schema({
  patientId:            { type: String, required: true },
  timestamp:            { type: Date,   default: Date.now },
  heartRate:            { type: Number, required: true },
  meanArterialPressure: { type: Number },
  spO2:                 { type: Number, required: true },
  riskScore:            { type: Number },
  predictedEvent:       { type: String }
}, { strict: false }); // strict:false keeps any extra fields

async function migrate() {
  console.log('🔌 Connecting to local MongoDB (Compass)...');
  const localConn  = await mongoose.createConnection(LOCAL_URI).asPromise();

  console.log('☁️  Connecting to MongoDB Atlas...');
  const atlasConn  = await mongoose.createConnection(ATLAS_URI).asPromise();

  const LocalModel  = localConn.model('PatientVital', vitalSchema);
  const AtlasModel  = atlasConn.model('PatientVital', vitalSchema);

  // ── Count source records ────────────────────────────────────────
  const total = await LocalModel.countDocuments();
  console.log(`📦 Found ${total} records in local DB`);

  if (total === 0) {
    console.log('⚠️  Nothing to migrate.');
    await localConn.close();
    await atlasConn.close();
    return;
  }

  // ── Migrate in batches of 500 ───────────────────────────────────
  const BATCH = 500;
  let migrated = 0;

  for (let skip = 0; skip < total; skip += BATCH) {
    const docs = await LocalModel.find({}).skip(skip).limit(BATCH).lean();

    // Remove _id so Atlas generates new ones (avoids duplicate key errors)
    const cleaned = docs.map(({ _id, __v, ...rest }) => rest);

    await AtlasModel.insertMany(cleaned, { ordered: false });
    migrated += docs.length;
    console.log(`✅ Migrated ${migrated} / ${total}`);
  }

  console.log(`\n🎉 Migration complete! ${migrated} records transferred to Atlas.`);

  await localConn.close();
  await atlasConn.close();
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
