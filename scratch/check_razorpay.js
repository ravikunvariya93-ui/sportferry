const Razorpay = require('razorpay');

async function checkRazorpay() {
  const razorpay = new Razorpay({
    key_id: 'rzp_live_SoSe8AhxbHVoxV',
    key_secret: 'Vkd2twda19MqrudMw1vjKTyB',
  });
  
  try {
    const payment = await razorpay.payments.fetch('pay_SoSvzGDC11wHNk');
    console.log('Payment Status:', payment.status);
    console.log('Amount:', payment.amount);
    console.log('Refund Status:', payment.refund_status);
    console.log('Amount Refunded:', payment.amount_refunded);
  } catch (e) {
    console.error('Razorpay Error:', e.description || e.message);
  }
}

checkRazorpay().catch(console.error);
