const express = require("express");
const router = express.Router();

const Payment = require("../models/paymentModel");
const paymentQueue = require("../queue/paymentQueue");

router.post("/create-payment", async (req, res) => {
    try {
        // 1. Get amount from request body
        const { amount } = req.body;

        // 2. Get idempotency key from request header
        const idempotencyKey = req.headers["idempotency-key"];

        // 3. Check whether key was provided
        if (!idempotencyKey) {
            return res.status(400).json({
                message: "Idempotency-Key header is required"
            });
        }

        // 4. Check if this request was already made
        const existingPayment = await Payment.findOne({
            idempotencyKey
        });

        // 5. If it already exists, return the SAME payment
        if (existingPayment) {
            return res.status(200).json({
                message: "Existing payment returned",
                paymentId: existingPayment._id,
                status: existingPayment.status
            });
        }

        // 6. Otherwise create a new payment
        const payment = new Payment({
            amount,
            status: "pending",
            idempotencyKey
        });

        // 7. Save payment in MongoDB
        await payment.save();

        // 8. Add payment to BullMQ
        await paymentQueue.add("processPayment", {
            paymentId: payment._id.toString()
        });

        // 9. Return immediately
        return res.status(202).json({
            message: "Payment accepted for processing",
            paymentId: payment._id,
            status: payment.status
        });

    } catch (error) {
        console.error("Create Payment Error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
});

router.get("/payments/:id", async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);

        if (!payment) {
            return res.status(404).json({
                message: "Payment not found"
            });
        }

        res.json({
            paymentId: payment._id,
            amount: payment.amount,
            status: payment.status
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;