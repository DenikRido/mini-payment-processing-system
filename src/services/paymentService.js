const Payment = require("../models/paymentModel");

const processPayment = async (paymentId) => {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new Error("Payment not found");
  }

  let attempts = 0;
  let success = false;

  while (attempts < 3 && !success) {
    attempts++;

    const isSuccess = Math.random() > 0.5;

    if (isSuccess) {
      success = true;
      payment.status = "success";
    } else {
      payment.status = "failed";
    }
  }

  await payment.save();

  return payment;
};

module.exports = { processPayment };