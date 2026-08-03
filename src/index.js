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

// --- mock rezervacije ---
const reservations = [
  {
    id: 1,
    userId: 1,
    spaceId: 1,
    startTime: "2026-03-15T10:00:00",
    endTime: "2026-03-15T12:00:00",
    status: "ACTIVE",
  },
];

// --- rute: prostori ---
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

// --- pomoćna funkcija: provjera preklapanja termina ---
function sePreklapa(spaceId, startTime, endTime) {
  const noviStart = new Date(startTime);
  const noviEnd = new Date(endTime);

  return reservations.some((r) => {
    if (r.spaceId !== spaceId) return false;   // drugi prostor - ne smeta
    if (r.status !== "ACTIVE") return false;    // otkazane ne broje

    const postojeciStart = new Date(r.startTime);
    const postojeciEnd = new Date(r.endTime);

    // preklapanje intervala: postojeci.start < novi.end  I  postojeci.end > novi.start
    return postojeciStart < noviEnd && postojeciEnd > noviStart;
  });
}

// --- rute: rezervacije ---
// POST /api/reservations — kreiranje rezervacije
app.post("/api/reservations", (req, res) => {
  const { spaceId, startTime, endTime } = req.body;

  // 1. validacija - jesu li polja tu
  if (!spaceId || !startTime || !endTime) {
    return res.status(400).json({ error: "Nedostaju polja (spaceId, startTime, endTime)." });
  }

  // 2. postoji li prostor
  const space = spaces.find((s) => s.id === Number(spaceId));
  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  // 3. je li kraj nakon početka
  if (new Date(endTime) <= new Date(startTime)) {
    return res.status(400).json({ error: "Kraj termina mora biti nakon početka." });
  }

  // 4. provjera preklapanja
  if (sePreklapa(Number(spaceId), startTime, endTime)) {
    return res.status(409).json({ error: "Odabrani termin se preklapa s postojećom rezervacijom." });
  }

  // 5. kreiraj
  const novaRezervacija = {
    id: reservations.length ? reservations[reservations.length - 1].id + 1 : 1,
    userId: 1, // privremeno fiksno (kasnije iz prijavljenog korisnika)
    spaceId: Number(spaceId),
    startTime,
    endTime,
    status: "ACTIVE",
  };

  reservations.push(novaRezervacija);
  res.status(201).json(novaRezervacija);
});

// GET /api/reservations/me — moje rezervacije
app.get("/api/reservations/me", (req, res) => {
  const userId = 1; // privremeno fiksno

  const mojeRezervacije = reservations
    .filter((r) => r.userId === userId)
    .map((r) => {
      const space = spaces.find((s) => s.id === r.spaceId);
      return {
        id: r.id,
        spaceId: r.spaceId,
        spaceName: space ? space.name : null,
        location: space ? space.location : null,
        startTime: r.startTime,
        endTime: r.endTime,
        status: r.status,
      };
    });

  res.json(mojeRezervacije);
});

// DELETE /api/reservations/:id — otkazivanje vlastite rezervacije
app.delete("/api/reservations/:id", (req, res) => {
  const id = Number(req.params.id);
  const rezervacija = reservations.find((r) => r.id === id);

  if (!rezervacija) {
    return res.status(404).json({ error: "Rezervacija nije pronađena." });
  }

  rezervacija.status = "CANCELLED"; // ne brišemo, samo mijenjamo status
  res.json({ message: "Rezervacija otkazana.", id: rezervacija.id, status: rezervacija.status });
});

// --- pokretanje servera ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});