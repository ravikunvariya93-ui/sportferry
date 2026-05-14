const mongoose = require('mongoose');

async function refundExpiredBookings() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const Booking = mongoose.model('Booking', new mongoose.Schema({}, { strict: false }));
  
  const now = new Date();
  
  // Find PENDING bookings where slot time has passed
  // For simplicity, we check bookings where date is older than today or (today and startTime has passed)
  const bookings = await Booking.find({ status: 'PENDING' });
  
  let count = 0;
  for (const b of bookings) {
    const [h, m] = b.startTime.split(':').map(Number);
    const slotDate = new Date(b.date);
    slotDate.setHours(h, m, 0, 0);
    
    if (slotDate < now) {
      console.log(`Refunding expired booking ${b._id} (Slot: ${b.startTime}, Date: ${b.date.toISOString()})`);
      await Booking.findByIdAndUpdate(b._id, {
        status: 'CANCELLED',
        cancelledBy: 'ADMIN',
        cancellationReason: 'Slot passed without reaching minimum players (Auto-Refunded)',
        refundPercent: 100,
        refundAmount: b.totalAmount || 0
      });
      count++;
    }
  }
  
  console.log(`Total bookings auto-refunded: ${count}`);
  process.exit();
}

refundExpiredBookings().catch(console.error);
