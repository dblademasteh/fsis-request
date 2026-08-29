import pool from "./pool";
import bcrypt from "bcrypt";

async function setupAuth() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    const adminPassword = process.env.ADMIN_PASSWORD || "@dmin123!";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET password = $2`,
      ["admin", hashedPassword, "admin"]
    );

    console.log("Auth setup complete. Default admin user created/updated.");
  } catch (err) {
    console.error("Auth setup failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

setupAuth();
