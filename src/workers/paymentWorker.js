const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const connectDB = require("../config/db");
const { processPayment } = require("../services/paymentService");

connectDB();

const connection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null
});

const worker = new Worker(
  "paymentQueue",
  async (job) => {
    try {
      console.log("New Job Received");
      console.log(job.data);

      const { paymentId } = job.data;

      await processPayment(paymentId);

      console.log("Payment Processed");
    } catch (error) {
      console.error("Worker Error:", error);
    }
  },
  { connection }
);

console.log("Worker Started...");
