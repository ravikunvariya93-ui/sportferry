import mongoose from 'mongoose';
import dbConnect from '../lib/mongodb.js';
import Booking from '../models/Booking.js';
import Venue from '../models/Venue.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function check() {
  await dbConnect();
  const venueId = '69e7c21bb6b9881bf4eb6637';
  const dateStr = '2026-05-14';
  
  const d1 = new Date(dateStr);
  const d2 = new Date(dateStr);
  d2.setHours(0,0,0,0);
  
  console.log('Query Date 1 (UTC):', d1.toISOString());
  console.log('Query Date 2 (Local Midnight):', d2.toISOString());
  
  const bookings = await Booking.find({ venue: venueId }).lean();
  console.log(`Total bookings for venue ${venueId}:`, bookings.length);
  
  bookings.forEach(b => {
    console.log(`Booking ${b._id}: Date=${b.date.toISOString()}, Slot=${b.startTime}-${b.endTime}, Status=${b.status}`);
  });
  
  process.exit(0);
}

check();
