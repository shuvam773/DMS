const { Client } = require('pg');
const { DRUG_TYPES } = require('../../../client/src/constants/drugTypes');
const { DRUG_NAMES } = require('../../../client/src/constants/drugNames');

async function uploadDrugData() {
  const client = new Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000 // 10 seconds timeout
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Verify tables exist (optional safety check)
    console.log('🔍 Verifying table structure...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS drug_types (
        id SERIAL PRIMARY KEY,
        type_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS drug_names (
        id SERIAL PRIMARY KEY,
        type_id INTEGER REFERENCES drug_types(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(type_id, name)
      );
    `);

    // Begin transaction
    await client.query('BEGIN');
    console.log('🚀 Beginning transaction...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await client.query('TRUNCATE TABLE drug_names CASCADE');
    await client.query('TRUNCATE TABLE drug_types CASCADE');

    // Insert drug types and names
    console.log('📝 Inserting drug types and names...');
    for (const type of DRUG_TYPES) {
      console.log(`  💊 Inserting type: ${type}`);
      
      const typeRes = await client.query(
        'INSERT INTO drug_types (type_name) VALUES ($1) RETURNING id',
        [type]
      );
      const typeId = typeRes.rows[0].id;

      const names = DRUG_NAMES[type] || [];
      for (const name of names) {
        console.log(`    💉 Inserting drug: ${name}`);
        await client.query(
          'INSERT INTO drug_names (type_id, name) VALUES ($1, $2)',
          [typeId, name]
        );
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('🎉 All data uploaded successfully!');

    // Verify counts
    const typesCount = await client.query('SELECT COUNT(*) FROM drug_types');
    const namesCount = await client.query('SELECT COUNT(*) FROM drug_names');
    console.log(`📊 Final counts: ${typesCount.rows[0].count} types, ${namesCount.rows[0].count} names`);

  } catch (error) {
    // Rollback transaction if error occurs
    await client.query('ROLLBACK');
    console.error('❌ Error during upload:', error.message);
    console.error('Stack trace:', error.stack);
    throw error; // Re-throw to catch in the outer handler
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Execute with proper error handling
(async () => {
  try {
    console.log('🏁 Starting data upload process...');
    await uploadDrugData();
    console.log('✨ Data upload completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Critical error during upload process:', error.message);
    process.exit(1);
  }
})();