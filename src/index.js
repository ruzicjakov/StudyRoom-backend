// src/index.js
const express = require("express");
const cors = require("cors");

const app = express();

// --- middleware ---
app.use(cors());            // dopušta pozive s frontenda (druga adresa)
app.use(express.json());    // parsira JSON tijelo dolaznih zahtjeva

// --- mock podaci (privremeno, umjesto baze) ---
const spaces = [
  {
    id: 1,
    name: "Grupna soba A",
    description: "Soba za grupno učenje s pločom",
    location: "Pula, Zagrebačka 30",
    type: "GROUP_ROOM",
    capacity: 6,
    openFrom: "08:00",
    openTo: "22:00",
    providerId: 2,
  },
  {
    id: 2,
    name: "Tiha soba 1",
    description: "Individualno mjesto za učenje",
    location: "Pula, Zagrebačka 30",
    type: "QUIET_ROOM",
    capacity: 1,
    openFrom: "08:00",
    openTo: "20:00",
    providerId: 2,
  },
];

// --- rute ---
// GET /api/spaces — popis svih prostora
app.get("/api/spaces", (req, res) => {
  res.json(spaces);
});

// --- pokretanje servera ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});