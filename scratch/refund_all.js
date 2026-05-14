const mongoose = require('mongoose');
const Razorpay = require('razorpay');

async function refundAll() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const razorpay = new Razorpay({
    key_id: 'rzp_live_SoSe8AhxbHVoxV',
    key_secret: 'Vkd2twda19MqrudMw1vjKTyB',
  });

  // Find all CANCELLED bookings that were auto-refunded today but don't have a refund confirmation? 
  // Actually, I'll just check all that I just updated.
  const ids = ['6a0327d4622469e7c697e68f', '6a0599444c57a6fd5120d5e1'];
  
  for (const id of ids) {
    const b = await Booking.findById(id).lean();
    if (b.paymentId) {
      console.log(`Checking payment ${b.paymentId} for booking ${id}...`);
      try {
        const payment = await razorpay.payments.fetch(b.paymentId);
        if (payment.status === 'captured' && payment.amount_refunded === 0) {
          console.log(`Refunding ₹${payment.amount/100}...`);
          await razorpay.payments.refund(b.paymentId, { amount: payment.amount });
          console.log(`Refunded ${id} successfully.`);
        } else {
          console.log(`Payment for ${id} is already ${payment.status} or refunded.`);
        }
      } catch (e) {
        console.error(`Failed to refund ${id}:`, e.message);
      }
    }
  }
  
  process.exit();
}

refundAll().catch(console.error);
