const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// TEST API
app.get("/", (req, res) => {
  res.send("API Working 🚀");
});

// ROOMS API (dummy for now)
app.get("/api/rooms", (req, res) => {
  res.json([
    { room_id: 1, room_type: "Deluxe Room", price_per_night: 2000 },
    { room_id: 2, room_type: "Luxury Room", price_per_night: 3500 }
  ]);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});