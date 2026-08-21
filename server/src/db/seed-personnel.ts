import pool from "./pool";
import { readFileSync } from "fs";

async function seed() {
  const csvPath = "C:\\Users\\itcub\\Downloads\\personnel_template.csv";
  const csv = readFileSync(csvPath, "utf-8");
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const client = await pool.connect();
  try {
    await client.query("DELETE FROM personnel");
    await client.query("BEGIN");

    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 3) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if (!row.first_name && !row.last_name) continue;

      await client.query(
        `INSERT INTO personnel (first_name, middle_name, last_name, suffix, rank, designation, account_number, email, station)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          row.first_name || null,
          row.middle_name || null,
          row.last_name || null,
          row.suffix || null,
          row.rank || null,
          row.designation || null,
          row.account_number || null,
          row.email || null,
          row.station || null,
        ]
      );
      count++;
    }

    await client.query(
      `INSERT INTO personnel (first_name, middle_name, last_name, suffix, rank, designation, account_number, email, station)
       VALUES ('DEMO', NULL, 'USER', NULL, 'FO1', 'Demo Officer', 'TEST001', 'demo@test.com', 'Demo Station')
       ON CONFLICT DO NOTHING`
    );

    await client.query("COMMIT");
    console.log(`Seeded ${count} personnel records.`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
