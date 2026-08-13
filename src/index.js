// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "./generated/prisma/index.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const app = express();

// --- middleware ---
app.use(cors());            // dopušta pozive s frontenda (druga adresa)
app.use(express.json());    // parsira JSON tijelo dolaznih zahtjeva

// --- rute: prostori ---

// GET /api/spaces — popis svih prostora (s filtrima)
app.get("/api/spaces", async (req, res) => {
  const { location, type, minCapacity, search } = req.query;

  const where = {};
  if (location) where.location = { contains: location };
  if (type) where.type = type;
  if (minCapacity) where.capacity = { gte: Number(minCapacity) };
  if (search) where.name = { contains: search };

  const spaces = await prisma.space.findMany({ where });
  res.json(spaces);
});

// GET /api/spaces/:id — dohvat jednog prostora
app.get("/api/spaces/:id", async (req, res) => {
  const space = await prisma.space.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }
  res.json(space);
});

// GET /api/spaces/:id/availability — dostupnost za dan
app.get("/api/spaces/:id/availability", async (req, res) => {
  const id = Number(req.params.id);
  const space = await prisma.space.findUnique({ where: { id } });
  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  const { date } = req.query; // ?date=2026-03-15
  if (!date) {
    return res.status(400).json({ error: "Nedostaje query parametar 'date' (YYYY-MM-DD)." });
  }

  // aktivne rezervacije za taj prostor na taj dan
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(`${date}T23:59:59`);

  const reserved = await prisma.reservation.findMany({
    where: {
      spaceId: id,
      status: "ACTIVE",
      startTime: { gte: start, lte: end },
    },
    select: { startTime: true, endTime: true },
  });

  res.json({
    spaceId: id,
    date,
    openFrom: space.openFrom,
    openTo: space.openTo,
    reservedSlots: reserved,
  });
});

// POST /api/spaces — kreiranje prostora
app.post("/api/spaces", async (req, res) => {
  const { name, description, location, type, capacity, openFrom, openTo } = req.body;

  if (!name || !location || !type) {
    return res.status(400).json({ error: "Nedostaju obavezna polja (name, location, type)." });
  }

  const newSpace = await prisma.space.create({
    data: {
      name,
      description: description || "",
      location,
      type,
      capacity: capacity || 1,
      openFrom: openFrom || "08:00",
      openTo: openTo || "22:00",
      providerId: 2, // privremeno fiksno
    },
  });

  res.status(201).json(newSpace);
});

// PUT /api/spaces/:id — izmjena prostora
app.put("/api/spaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  const postoji = await prisma.space.findUnique({ where: { id } });
  if (!postoji) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  const { name, description, location, type, capacity, openFrom, openTo } = req.body;

  const updated = await prisma.space.update({
    where: { id },
    data: { name, description, location, type, capacity, openFrom, openTo },
  });

  res.json(updated);
});

// DELETE /api/spaces/:id — brisanje prostora
app.delete("/api/spaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  const postoji = await prisma.space.findUnique({ where: { id } });
  if (!postoji) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  await prisma.space.delete({ where: { id } });
  res.json({ message: "Prostor uspješno obrisan." });
});

// --- rute: rezervacije ---

// POST /api/reservations — kreiranje rezervacije
app.post("/api/reservations", async (req, res) => {
  const { spaceId, startTime, endTime } = req.body;

  // 1. validacija - jesu li polja tu
  if (!spaceId || !startTime || !endTime) {
    return res.status(400).json({ error: "Nedostaju polja (spaceId, startTime, endTime)." });
  }

  // 2. postoji li prostor
  const space = await prisma.space.findUnique({ where: { id: Number(spaceId) } });
  if (!space) {
    return res.status(404).json({ error: "Prostor nije pronađen." });
  }

  // 3. je li kraj nakon početka
  const noviStart = new Date(startTime);
  const noviEnd = new Date(endTime);
  if (noviEnd <= noviStart) {
    return res.status(400).json({ error: "Kraj termina mora biti nakon početka." });
  }

  // 4. provjera preklapanja - traži aktivnu rezervaciju koja se preklapa
  //    uvjet: postojeci.start < novi.end  I  postojeci.end > novi.start
  const konflikt = await prisma.reservation.findFirst({
    where: {
      spaceId: Number(spaceId),
      status: "ACTIVE",
      startTime: { lt: noviEnd },
      endTime: { gt: noviStart },
    },
  });

  if (konflikt) {
    return res.status(409).json({ error: "Odabrani termin se preklapa s postojećom rezervacijom." });
  }

  // 5. kreiraj
  const novaRezervacija = await prisma.reservation.create({
    data: {
      spaceId: Number(spaceId),
      userId: 1, // privremeno fiksno
      startTime: noviStart,
      endTime: noviEnd,
      status: "ACTIVE",
    },
  });

  res.status(201).json(novaRezervacija);
});

// GET /api/reservations/me — moje rezervacije
app.get("/api/reservations/me", async (req, res) => {
  const userId = 1; // privremeno fiksno

  const rezervacije = await prisma.reservation.findMany({
    where: { userId },
    include: { space: true }, // dohvati i povezani prostor
  });

  // oblikuj odgovor (naziv/lokacija iz povezanog prostora)
  const rezultat = rezervacije.map((r) => ({
    id: r.id,
    spaceId: r.spaceId,
    spaceName: r.space ? r.space.name : null,
    location: r.space ? r.space.location : null,
    startTime: r.startTime,
    endTime: r.endTime,
    status: r.status,
  }));

  res.json(rezultat);
});

// DELETE /api/reservations/:id — otkazivanje vlastite rezervacije
app.delete("/api/reservations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const rezervacija = await prisma.reservation.findUnique({ where: { id } });

  if (!rezervacija) {
    return res.status(404).json({ error: "Rezervacija nije pronađena." });
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: "CANCELLED" }, // ne brišemo, samo mijenjamo status
  });

  res.json({ message: "Rezervacija otkazana.", id: updated.id, status: updated.status });
});

// --- pokretanje servera ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server radi na http://localhost:${PORT}`);
});