const Razorpay = require('razorpay');

async function performRefund() {
  const razorpay = new Razorpay({
    key_id: 'rzp_live_SoSe8AhxbHVoxV',
    key_secret: 'Vkd2twda19MqrudMw1vjKTyB',
  });
  
  const paymentId = 'pay_SoSvzGDC11wHNk';
  
  try {
    console.log(`Initiating refund for payment ${paymentId}...`);
    const refund = await razorpay.payments.refund(paymentId, {
      amount: 100, // 100 paisa = ₹1
      notes: {
        reason: 'Slot passed without reaching minimum players',
        system: 'Sportferry Auto-Refund'
      }
    });
    console.log('Refund Successful!');
    console.log('Refund ID:', refund.id);
    console.log('Status:', refund.status);
  } catch (e) {
    console.error('Refund Failed:', e.description || e.message);
  }
}

performRefund().catch(console.error);
