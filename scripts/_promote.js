const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ravikunvariya93_db_user:qwd5ZVXjhMN16IS5@cluster0.zbjd1az.mongodb.net/')
  .then(async () => {
    const result = await mongoose.connection.collection('users').findOneAndUpdate(
      { email: 'kunvariyaravi41@gmail.com' },
      { $set: { role: 'ADMIN' } },
      { returnDocument: 'after', projection: { name: 1, email: 1, role: 1 } }
    );
    console.log('Success! Updated user:', JSON.stringify(result, null, 2));
    await mongoose.disconnect();
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
