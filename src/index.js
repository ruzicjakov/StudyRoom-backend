// src/index.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import pool from "./db.js"; // Importiramo našu konekciju na MySQL

const app = express();

// --- middleware ---
app.use(cors());            // dopušta pozive s frontenda
app.use(express.json());    // parsira JSON tijelo dolaznih zahtjeva

// --- rute: prostori ---

// GET /api/spaces — popis svih prostora (s filtrima)
app.get("/api/spaces", async (req, res) => {
  const { location, type, minCapacity, search } = req.query;

  try {
    // Gradimo dinamički SQL upit
    let sql = "SELECT * FROM Space WHERE 1=1";
    const params = [];

    if (location) {
      sql += " AND location LIKE ?";
      params.push(`%${location}%`);
    }
    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }
    if (minCapacity) {
      sql += " AND capacity >= ?";
      params.push(Number(minCapacity));
    }
    if (search) {
      sql += " AND name LIKE ?";
      params.push(`%${search}%`);
    }

    const [spaces] = await pool.execute(sql, params);
    res.json(spaces);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// GET /api/spaces/:id — dohvat jednog prostora
app.get("/api/spaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rows] = await pool.execute("SELECT * FROM Space WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Prostor nije pronađen." });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// GET /api/spaces/:id/availability — dostupnost za dan
app.get("/api/spaces/:id/availability", async (req, res) => {
  const id = Number(req.params.id);
  const { date } = req.query;

  if (!date) return res.status(400).json({ error: "Nedostaje parametar date" });

  try {
    const [spaceRows] = await pool.execute("SELECT openFrom, openTo FROM Space WHERE id = ?", [id]);
    if (spaceRows.length === 0) return res.status(404).json({ error: "Prostor nije pronađen." });

    const start = `${date} 00:00:00`;
    const end = `${date} 23:59:59`;

    const [reserved] = await pool.execute(`
      SELECT startTime, endTime 
      FROM Reservation 
      WHERE spaceId = ? AND status = 'ACTIVE' AND startTime >= ? AND startTime <= ?
    `, [id, start, end]);

    res.json({
      spaceId: id,
      date,
      openFrom: spaceRows[0].openFrom,
      openTo: spaceRows[0].openTo,
      reservedSlots: reserved,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// POST /api/spaces — kreiranje prostora
app.post("/api/spaces", async (req, res) => {
  const { name, description, location, type, capacity, openFrom, openTo } = req.body;

  if (!name || !location || !type) {
    return res.status(400).json({ error: "Nedostaju obavezna polja." });
  }

  try {
    const [result] = await pool.execute(`
      INSERT INTO Space (name, description, location, type, capacity, openFrom, openTo, providerId) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      description || "", 
      location, 
      type, 
      capacity || 1, 
      openFrom || "08:00", 
      openTo || "22:00", 
      2 // providerId
    ]);

    res.status(201).json({ id: result.insertId, message: "Prostor kreiran" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška pri kreiranju" });
  }
});

// PUT /api/spaces/:id — izmjena prostora
app.put("/api/spaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, description, location, type, capacity, openFrom, openTo } = req.body;

  try {
    const [result] = await pool.execute(`
      UPDATE Space 
      SET name = ?, description = ?, location = ?, type = ?, capacity = ?, openFrom = ?, openTo = ?
      WHERE id = ?
    `, [name, description, location, type, capacity, openFrom, openTo, id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: "Prostor nije pronađen." });
    res.json({ message: "Prostor ažuriran" });
  } catch (error) {
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// DELETE /api/spaces/:id — brisanje prostora
app.delete("/api/spaces/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [result] = await pool.execute("DELETE FROM Space WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Prostor nije pronađen." });
    res.json({ message: "Prostor uspješno obrisan." });
  } catch (error) {
    // Ovdje će baza baciti grešku ako postoje vezane rezervacije!
    console.error(error);
    res.status(500).json({ error: "Greška pri brisanju (možda postoje rezervacije)" });
  }
});

// GET /api/spaces/:id/reservations — rezervacije za određeni prostor
app.get("/api/spaces/:id/reservations", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [rezervacije] = await pool.execute(
      "SELECT * FROM Reservation WHERE spaceId = ? AND status = 'ACTIVE' ORDER BY startTime ASC", 
      [id]
    );
    res.json(rezervacije);
  } catch (error) {
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// --- rute: rezervacije ---

// POST /api/reservations — kreiranje rezervacije
app.post("/api/reservations", async (req, res) => {
  const { spaceId, startTime, endTime } = req.body;

  if (!spaceId || !startTime || !endTime) {
    return res.status(400).json({ error: "Nedostaju polja." });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return res.status(400).json({ error: "Kraj mora biti nakon početka." });
  }

  try {
    const [konflikti] = await pool.execute(`
      SELECT id FROM Reservation 
      WHERE spaceId = ? AND status = 'ACTIVE' 
      AND startTime < ? AND endTime > ?
    `, [spaceId, end, start]);

    if (konflikti.length > 0) {
      return res.status(409).json({ error: "Preklapanje termina!" });
    }

    const [result] = await pool.execute(`
      INSERT INTO Reservation (spaceId, userId, startTime, endTime, status) 
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `, [spaceId, 1, start, end]); // userId fiksno 1

    res.status(201).json({ id: result.insertId, message: "Rezervacija kreirana" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// GET /api/reservations/me — moje rezervacije (sa JOIN)
app.get("/api/reservations/me", async (req, res) => {
  const userId = 1;
  try {
    const [rezervacije] = await pool.execute(`
      SELECT r.id, r.spaceId, s.name AS spaceName, s.location, r.startTime, r.endTime, r.status
      FROM Reservation r
      LEFT JOIN Space s ON r.spaceId = s.id
      WHERE r.userId = ?
    `, [userId]);
    res.json(rezervacije);
  } catch (error) {
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

// DELETE /api/reservations/:id — otkazivanje rezervacije
app.delete("/api/reservations/:id", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const [result] = await pool.execute(
      "UPDATE Reservation SET status = 'CANCELLED' WHERE id = ?", 
      [id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Rezervacija nije pronađena." });
    res.json({ message: "Rezervacija otkazana." });
  } catch (error) {
    res.status(500).json({ error: "Greška baze podataka" });
  }
});

export default app;