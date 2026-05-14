const mongoose = require('mongoose');

async function checkBookings() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    status: String,
    startTime: String,
    venue: mongoose.Schema.Types.ObjectId
  }, { strict: false }));
  
  const User = mongoose.model('User', new mongoose.Schema({ name: String }));
  
  const bookings = await Booking.find({ venue: '69e7c21bb6b9881bf4eb6637' }).populate('user').lean();
  
  bookings.forEach(b => {
    console.log(`ID: ${b._id}, Date: ${b.date.toISOString()}, User: ${b.user?.name}, Slot: ${b.startTime}`);
  });
  
  process.exit();
}

checkBookings().catch(console.error);
