const mongoose = require('mongoose');

async function checkBookings() {
  const uri = "mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/";
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection('bookings');
  
  const bookings = await collection.find({ venue: new mongoose.Types.ObjectId('69e7c21bb6b9881bf4eb6637') }).toArray();
  console.log('Total bookings found for venue:', bookings.length);
  
  bookings.forEach(b => {
    console.log(`ID: ${b._id}, Date: ${b.date}, DateType: ${typeof b.date}, Status: ${b.status}`);
  });
  
  // Also check without ObjectId cast just in case they are strings
  const bookingsStr = await collection.find({ venue: '69e7c21bb6b9881bf4eb6637' }).toArray();
  console.log('Total bookings found for venue (string ID):', bookingsStr.length);
  bookingsStr.forEach(b => {
    console.log(`ID: ${b._id}, Date: ${b.date}, DateType: ${typeof b.date}, Status: ${b.status}`);
  });

  process.exit();
}

checkBookings().catch(console.error);
