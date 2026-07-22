const express = require("express");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(express.json());

app.use("/api", paymentRoutes);

app.get("/", (req, res) => {
  res.send("Mini Payment System Running");
});

module.exports = app;