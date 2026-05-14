const mongoose = require('mongoose');

async function checkAmount() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const b = await Booking.findById('6a0327d4622469e7c697e68f').lean();
  console.log(`Booking Amount: ${b.totalAmount}`);
  console.log(`Razorpay Order ID: ${b.razorpayOrderId}`);
  console.log(`Payment ID: ${b.paymentId}`);
  
  process.exit();
}

checkAmount().catch(console.error);
