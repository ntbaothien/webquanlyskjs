import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from './backend/models/User.js';
import connectDB from './backend/config/db.js';

async function test() {
  await mongoose.connect('mongodb://localhost:27017/eventhub');
  const user = await User.findOne({ role: 'ADMIN' });
  if (!user) {
    console.log('No admin found');
    return process.exit();
  }
  const token = jwt.sign({ id: user._id }, 'eventhub_jwt_secret_key_2026', { expiresIn: '1d' });
  
  console.log('Token generated');
  
  try {
    const res = await fetch('http://localhost:5000/api/resources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventId: '69d52d00f12a961818f3e139',
        name: 'loa',
        type: 'Equipment',
        quantity: 20,
        notes: 'samsung'
      })
    });
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
  process.exit();
}
test();
