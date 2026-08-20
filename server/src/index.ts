import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./db/pool";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/api/stations", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM fire_stations ORDER BY station_name"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

app.get("/api/requests/track/:accountNumber", async (req, res) => {
  const { accountNumber } = req.params;
  try {
    const result = await pool.query(
      `SELECT
        tr.*,
        fs_from.station_name AS station_from_name,
        fs_to.station_name AS station_to_name
      FROM transfer_requests tr
      JOIN fire_stations fs_from ON tr.station_from_id = fs_from.id
      JOIN fire_stations fs_to ON tr.station_to_id = fs_to.id
      WHERE tr.account_number = $1
      ORDER BY tr.created_at DESC`,
      [accountNumber]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to track requests" });
  }
});

app.get("/api/requests", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tr.*,
        fs_from.station_name AS station_from_name,
        fs_to.station_name AS station_to_name
      FROM transfer_requests tr
      JOIN fire_stations fs_from ON tr.station_from_id = fs_from.id
      JOIN fire_stations fs_to ON tr.station_to_id = fs_to.id
      ORDER BY tr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

app.post("/api/requests", async (req, res) => {
  const {
    station_from_id,
    station_to_id,
    purpose_of_request,
    account_number,
    rank,
    first_name,
    middle_name,
    last_name,
    suffix,
    email,
    designation,
  } = req.body;

  if (!station_from_id || !station_to_id || !purpose_of_request || !first_name || !last_name || !email) {
    return res.status(400).json({ error: "All required fields must be filled" });
  }

  if (station_from_id === station_to_id) {
    return res.status(400).json({ error: "Source and destination stations must be different" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transfer_requests (station_from_id, station_to_id, purpose_of_request, account_number, rank, first_name, middle_name, last_name, suffix, email, designation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        station_from_id,
        station_to_id,
        purpose_of_request,
        account_number || null,
        rank || null,
        first_name,
        middle_name || null,
        last_name,
        suffix || null,
        email,
        designation || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create request" });
  }
});

app.patch("/api/requests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "approved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `UPDATE transfer_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update request" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
