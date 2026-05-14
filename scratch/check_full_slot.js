const mongoose = require('mongoose');

async function checkFullSlot() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const b = await Booking.findById('6a0609c24c57a6fd5120d67d').lean();
  console.log(`Booking ID: ${b._id}`);
  console.log(`Date: ${b.date.toISOString()}`);
  console.log(`Slot: ${b.startTime} - ${b.endTime}`);
  console.log(`Classification: ${b.classification}`);
  console.log(`PlayersCount: ${b.playersCount}`);
  console.log(`Status: ${b.status}`);
  
  process.exit();
}

checkFullSlot().catch(console.error);
