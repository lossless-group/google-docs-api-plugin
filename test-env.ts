import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Environment Variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '***' : 'Not set');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***' : 'Not set');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '***' : 'Not set');
