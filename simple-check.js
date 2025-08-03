// Simple direct query to check if tables exist
const fs = require('fs');

// Read your config to see if we can find connection details
if (fs.existsSync('verify-db-schema.js')) {
  console.log('Found verify-db-schema.js - it contains hardcoded credentials');
  console.log('Let me check what tables exist by running a SQL query...');
  
  // Run the existing verification script
  require('./verify-db-schema.js');
} else {
  console.log('Looking for other verification scripts...');
  
  if (fs.existsSync('scripts/check-db.js')) {
    console.log('Found scripts/check-db.js');
    require('./scripts/check-db.js');
  }
}
