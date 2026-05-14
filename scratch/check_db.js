const mongoose = require('mongoose');

async function checkBookings() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const bookings = await Booking.find({ venue: '69e7c21bb6b9881bf4eb6637' }).lean();
  console.log('Total bookings found:', bookings.length);
  
  bookings.forEach(b => {
    console.log(`ID: ${b._id}, Date: ${b.date}, Status: ${b.status}, Slot: ${b.startTime}-${b.endTime}`);
  });
  
  process.exit();
}

checkBookings().catch(console.error);
