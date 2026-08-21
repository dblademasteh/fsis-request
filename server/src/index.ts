import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "./db/pool";

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required. Create a server/.env file with JWT_SECRET=<random-secret>");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET!;

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

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
      LEFT JOIN fire_stations fs_from ON tr.station_from_id = fs_from.id
      LEFT JOIN fire_stations fs_to ON tr.station_to_id = fs_to.id
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
      LEFT JOIN fire_stations fs_from ON tr.station_from_id = fs_from.id
      LEFT JOIN fire_stations fs_to ON tr.station_to_id = fs_to.id
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
    new_rank,
    new_first_name,
    new_middle_name,
    new_last_name,
    new_suffix,
    new_email,
  } = req.body;

  if (!purpose_of_request || !first_name || !last_name) {
    return res.status(400).json({ error: "All required fields must be filled" });
  }

  const isTransfer = purpose_of_request === "Transfer of Unit Assignment";
  const isUpdatePurpose = purpose_of_request.startsWith("Update ");

  if (!isTransfer && !isUpdatePurpose && !email) {
    return res.status(400).json({ error: "Email is required for this request type" });
  }

  if (!isTransfer && !isUpdatePurpose && !account_number) {
    return res.status(400).json({ error: "Account number is required for this request type" });
  }

  if (isTransfer) {
    if (!station_from_id || !station_to_id) {
      return res.status(400).json({ error: "Both stations are required for transfer requests" });
    }
    if (station_from_id === station_to_id) {
      return res.status(400).json({ error: "Source and destination stations must be different" });
    }
  }

  try {
    const result = await pool.query(
      `INSERT INTO transfer_requests (station_from_id, station_to_id, purpose_of_request, account_number, rank, first_name, middle_name, last_name, suffix, email, designation, new_rank, new_first_name, new_middle_name, new_last_name, new_suffix, new_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
      [
        station_from_id || null,
        station_to_id || null,
        purpose_of_request,
        account_number || null,
        rank || null,
        first_name,
        middle_name || null,
        last_name,
        suffix || null,
        email,
        designation || null,
        new_rank || null,
        new_first_name || null,
        new_middle_name || null,
        new_last_name || null,
        new_suffix || null,
        new_email || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to create request" });
  }
});

app.patch("/api/requests/:id/status", authenticate, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "approved", "denied"].includes(status)) {
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

app.delete("/api/requests/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM transfer_requests WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({ message: "Request deleted", request: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete request" });
  }
});

app.get("/api/personnel", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM personnel ORDER BY last_name, first_name");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch personnel" });
  }
});

app.post("/api/personnel/import", authenticate, async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "No rows provided" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      await client.query(
        `INSERT INTO personnel (first_name, middle_name, last_name, suffix, rank, designation, account_number, email, station)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          row.first_name,
          row.middle_name || null,
          row.last_name,
          row.suffix || null,
          row.rank || null,
          row.designation || null,
          row.account_number || null,
          row.email || null,
          row.station || null,
        ]
      );
    }
    await client.query("COMMIT");
    res.json({ imported: rows.length });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to import personnel" });
  } finally {
    client.release();
  }
});

app.delete("/api/personnel/:id", authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM personnel WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Personnel not found" });
    }

    res.json({ message: "Personnel deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete personnel" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
