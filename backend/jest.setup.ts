process.env.NODE_ENV = 'test';

// Prefer .env.test so TEST_DATABASE_URL can point to a separate test DB
require('dotenv').config({ path: '.env.test' });
require('dotenv').config();
