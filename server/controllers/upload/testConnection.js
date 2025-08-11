const { Client } = require('pg');

async function testConnection() {
  const client = new Client({
    host: 'dpg-d29k2rmr433s739fhbag-a.oregon-postgres.render.com', // Added full domain
    user: 'shuvam',
    port: 5432,
    password: 'nFu6P3acZJWN8dKLeM0SaA4xZ7sR4ffE',
    database: 'dms_h9bk',
    ssl: {
      rejectUnauthorized: false // Required for Render
    },
    connectionTimeoutMillis: 5000, // Add timeout
    idle_in_transaction_session_timeout: 10000 // Add idle timeout
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const res = await client.query('SELECT NOW() as current_time');
    console.log('🕒 Current time:', res.rows[0].current_time);
    
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    console.error('Stack trace:', err.stack);
    return false;
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

testConnection().then(success => {
  if (success) {
    console.log('Connection test passed! Proceed with data upload.');
  } else {
    console.log('Connection test failed. Check your settings.');
  }
});