const mongoose = require('mongoose');

async function checkBookings() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const bookings = await Booking.find({ venue: '69e7c21bb6b9881bf4eb6637' }).sort({ createdAt: -1 }).lean();
  
  bookings.forEach(b => {
    console.log(`ID: ${b._id}, Date: ${b.date.toISOString()}, Created: ${b.createdAt.toISOString()}, Slot: ${b.startTime}`);
  });
  
  process.exit();
}

checkBookings().catch(console.error);
