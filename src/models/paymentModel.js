const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    default: "pending"
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
}
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);