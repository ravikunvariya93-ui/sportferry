const mongoose = require('mongoose');

async function checkCreatedAt() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const b = await Booking.findById('6a0609c24c57a6fd5120d67d').lean();
  console.log(`Booking ID: ${b._id}`);
  console.log(`Created At: ${b.createdAt}`);
  console.log(`Current Time: ${new Date()}`);
  
  process.exit();
}

checkCreatedAt().catch(console.error);
