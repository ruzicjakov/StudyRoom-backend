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

// GET /api/spaces/:id — dohvat jednog prostora po ID-u
app.get("/api/spaces/:id", (req, res) => {
  const id = Number(req.params.id);
  const space = spaces.find((s) => s.id === id);

  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }
  res.json(space);
});

// POST /api/spaces — kreiranje novog prostora
app.post("/api/spaces", (req, res) => {
  const { name, description, location, type, capacity, openFrom, openTo } = req.body;

  // osnovna validacija
  if (!name || !location || !type) {
    return res.status(400).json({ error: "Nedostaju obavezna polja (name, location, type)." });
  }

  const newSpace = {
    id: spaces.length ? spaces[spaces.length - 1].id + 1 : 1, // sljedeći ID
    name,
    description: description || "",
    location,
    type,
    capacity: capacity || 1,
    openFrom: openFrom || "08:00",
    openTo: openTo || "22:00",
    providerId: 2, // privremeno fiksno (kasnije iz prijavljenog korisnika)
  };

  spaces.push(newSpace);
  res.status(201).json(newSpace);
});

// PUT /api/spaces/:id — izmjena postojećeg prostora
app.put("/api/spaces/:id", (req, res) => {
  const id = Number(req.params.id);
  const space = spaces.find((s) => s.id === id);

  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  // ažuriramo samo poslana polja
  const { name, description, location, type, capacity, openFrom, openTo } = req.body;
  if (name !== undefined) space.name = name;
  if (description !== undefined) space.description = description;
  if (location !== undefined) space.location = location;
  if (type !== undefined) space.type = type;
  if (capacity !== undefined) space.capacity = capacity;
  if (openFrom !== undefined) space.openFrom = openFrom;
  if (openTo !== undefined) space.openTo = openTo;

  res.json(space);
});

// DELETE /api/spaces/:id — brisanje prostora
app.delete("/api/spaces/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = spaces.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  spaces.splice(index, 1); // makni iz niza
  res.json({ message: "Prostor uspješno obrisan." });
});

// --- pokretanje servera ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});