import pool from "./pool";
import bcrypt from "bcrypt";

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS fire_stations (
        id SERIAL PRIMARY KEY,
        station_name VARCHAR(255) NOT NULL,
        municipality VARCHAR(255) NOT NULL,
        province VARCHAR(255) NOT NULL DEFAULT 'Cagayan Valley',
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Deduplicate existing rows (keep the lowest id), but never delete any
      -- station that is still referenced by a transfer request.
      DELETE FROM fire_stations
      WHERE id NOT IN (
        SELECT MIN(id) FROM fire_stations GROUP BY station_name, province
      )
      AND id NOT IN (
        SELECT station_from_id FROM transfer_requests WHERE station_from_id IS NOT NULL
        UNION
        SELECT station_to_id FROM transfer_requests WHERE station_to_id IS NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fire_stations_name_prov ON fire_stations(station_name, province);

      CREATE TABLE IF NOT EXISTS transfer_requests (
        id SERIAL PRIMARY KEY,
        station_from_id INTEGER REFERENCES fire_stations(id),
        station_to_id INTEGER REFERENCES fire_stations(id),
        purpose_of_request VARCHAR(255) NOT NULL,
        account_number VARCHAR(100),
        rank VARCHAR(100),
        first_name VARCHAR(255) NOT NULL,
        middle_name VARCHAR(255),
        last_name VARCHAR(255) NOT NULL,
        suffix VARCHAR(50),
        email VARCHAR(255),
        designation VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        new_rank VARCHAR(100),
        new_first_name VARCHAR(255),
        new_middle_name VARCHAR(255),
        new_last_name VARCHAR(255),
        new_suffix VARCHAR(50),
        new_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS personnel (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        middle_name VARCHAR(255),
        last_name VARCHAR(255) NOT NULL,
        suffix VARCHAR(50),
        rank VARCHAR(100),
        designation VARCHAR(255),
        account_number VARCHAR(100),
        email VARCHAR(255),
        station VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tutorials (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        youtube_url VARCHAR(500) NOT NULL,
        youtube_id VARCHAR(50) NOT NULL,
        duration VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        app_name VARCHAR(255) NOT NULL DEFAULT 'Unified BFP R2 eRequest Form',
        logo_url VARCHAR(500) DEFAULT '/logo.png',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Seed default app settings if not present
      INSERT INTO app_settings (id, app_name, logo_url)
      VALUES (1, 'Unified BFP R2 eRequest Form', '/logo.png')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO fire_stations (station_name, municipality, province) VALUES
        ('Alcala FS', 'Alcala', 'Cagayan'),
        ('Allacapan FS', 'Allacapan', 'Cagayan'),
        ('Amulung FS', 'Amulung', 'Cagayan'),
        ('Aparri FS', 'Aparri', 'Cagayan'),
        ('Baggao FS', 'Baggao', 'Cagayan'),
        ('Ballesteros FS', 'Ballesteros', 'Cagayan'),
        ('Buguey FS', 'Buguey', 'Cagayan'),
        ('Camalaniugan FS', 'Camalaniugan', 'Cagayan'),
        ('Claveria FS', 'Claveria', 'Cagayan'),
        ('Enrile FS', 'Enrile', 'Cagayan'),
        ('Gattaran FS', 'Gattaran', 'Cagayan'),
        ('Gonzaga FS', 'Gonzaga', 'Cagayan'),
        ('Iguig FS', 'Iguig', 'Cagayan'),
        ('Lal-lo FS', 'Lal-lo', 'Cagayan'),
        ('Peñablanca FS', 'Peñablanca', 'Cagayan'),
        ('Piat FS', 'Piat', 'Cagayan'),
        ('Sanchez Mira FS', 'Sanchez Mira', 'Cagayan'),
        ('Sta. Ana FS', 'Santa Ana', 'Cagayan'),
        ('Sta. Praxedes FS', 'Santa Praxedes', 'Cagayan'),
        ('Solana FS', 'Solana', 'Cagayan'),
        ('Tuao FS', 'Tuao', 'Cagayan'),
        ('Tuguegarao City FS', 'Tuguegarao City', 'Cagayan'),
        ('Lasam FS', 'Lasam', 'Cagayan'),
        ('Pamplona FS', 'Pamplona', 'Cagayan'),
        ('Sto. Niño FS', 'Santo Niño', 'Cagayan'),
        ('Abulug FS', 'Abulug', 'Cagayan'),
        ('Rizal FS', 'Rizal', 'Cagayan'),
        ('Sta.Teresita FS', 'Santa Teresita', 'Cagayan'),
        ('Calayan FS', 'Calayan', 'Cagayan'),
        ('ORD Fire Station', 'Cagayan', 'Cagayan'),
        ('OPFM', 'Cagayan', 'Cagayan'),

        ('Alicia FS', 'Alicia', 'Isabela'),
        ('Angadanan FS', 'Angadanan', 'Isabela'),
        ('Aurora FS', 'Aurora', 'Isabela'),
        ('Cabagan FS', 'Cabagan', 'Isabela'),
        ('Cabatuan FS', 'Cabatuan', 'Isabela'),
        ('Cauayan City FS', 'Cauayan City', 'Isabela'),
        ('Delfin Albano FS', 'Delfin Albano', 'Isabela'),
        ('Echague FS', 'Echague', 'Isabela'),
        ('City of Ilagan FS', 'Ilagan City', 'Isabela'),
        ('Jones FS', 'Jones', 'Isabela'),
        ('Luna FS', 'Luna', 'Isabela'),
        ('Mallig FS', 'Mallig', 'Isabela'),
        ('Naguilian FS', 'Naguilian', 'Isabela'),
        ('Quezon FS', 'Quezon', 'Isabela'),
        ('Quirino FS', 'Quirino', 'Isabela'),
        ('Ramon FS', 'Ramon', 'Isabela'),
        ('Roxas FS', 'Roxas', 'Isabela'),
        ('City of Santiago FS', 'Santiago City', 'Isabela'),
        ('San Agustin FS', 'San Agustin', 'Isabela'),
        ('San Guillermo FS', 'San Guillermo', 'Isabela'),
        ('San Mariano FS', 'San Mariano', 'Isabela'),
        ('San Mateo FS', 'San Mateo', 'Isabela'),
        ('San Pablo FS', 'San Pablo', 'Isabela'),
        ('Sta. Maria FS', 'Santa Maria', 'Isabela'),
        ('Tumauini FS', 'Tumauini', 'Isabela'),
        ('Cordon FS', 'Cordon', 'Isabela'),
        ('Benito Soliven FS', 'Benito Soliven', 'Isabela'),
        ('Burgos FS', 'Burgos', 'Isabela'),
        ('Reina Mercedes FS', 'Reina Mercedes', 'Isabela'),
        ('San Isidro FS', 'San Isidro', 'Isabela'),
        ('Sto. Tomas FS', 'Santo Tomas', 'Isabela'),
        ('Dinapigue FS', 'Dinapigue', 'Isabela'),
        ('Divilacan FS', 'Divilacan', 'Isabela'),
        ('Gamu Fire Station', 'Gamu', 'Isabela'),
        ('San Manuel Fire Station', 'San Manuel', 'Isabela'),
        ('Maconacon FS', 'Maconacon', 'Isabela'),
        ('Palanan FS', 'Palanan', 'Isabela'),

        ('Alfonso Castañeda FS', 'Alfonso Castañeda', 'Nueva Vizcaya'),
        ('Aritao FS', 'Aritao', 'Nueva Vizcaya'),
        ('Bagabag FS', 'Bagabag', 'Nueva Vizcaya'),
        ('Bambang FS', 'Bambang', 'Nueva Vizcaya'),
        ('Bayombong FS', 'Bayombong', 'Nueva Vizcaya'),
        ('Diadi FS', 'Diadi', 'Nueva Vizcaya'),
        ('Solano FS', 'Solano', 'Nueva Vizcaya'),
        ('Sta. Fe FS', 'Santa Fe', 'Nueva Vizcaya'),
        ('Kasibu FS', 'Kasibu', 'Nueva Vizcaya'),
        ('Kayapa FS', 'Kayapa', 'Nueva Vizcaya'),
        ('Villaverde FS', 'Villaverde', 'Nueva Vizcaya'),
        ('Dupax del Sur FS', 'Dupax del Sur', 'Nueva Vizcaya'),
        ('Dupax del Norte FS', 'Dupax del Norte', 'Nueva Vizcaya'),
        ('Ambaguio FS', 'Ambaguio', 'Nueva Vizcaya'),

        ('Aglipay FS', 'Aglipay', 'Quirino'),
        ('Cabarroguis FS', 'Cabarroguis', 'Quirino'),
        ('Diffun FS', 'Diffun', 'Quirino'),
        ('Maddela FS', 'Maddela', 'Quirino'),
        ('Nagtipunan FS', 'Nagtipunan', 'Quirino'),
        ('Saguday FS', 'Saguday', 'Quirino'),

        ('Basco FS', 'Basco', 'Batanes'),
        ('Itbayat FPO', 'Itbayat', 'Batanes'),
        ('Mahatao FS', 'Mahatao', 'Batanes'),
        ('Sabtang FS', 'Sabtang', 'Batanes'),
        ('Ivana Fire Station', 'Ivana', 'Batanes'),
        ('Uyugan Fire Station', 'Uyugan', 'Batanes')
      ON CONFLICT DO NOTHING;
    `);

    // Add new columns to existing transfer_requests (safe to run multiple times)
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_rank VARCHAR(100);
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_first_name VARCHAR(255);
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_middle_name VARCHAR(255);
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_last_name VARCHAR(255);
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_suffix VARCHAR(50);
        ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS new_email VARCHAR(255);
        ALTER TABLE transfer_requests ALTER COLUMN email DROP NOT NULL;
      EXCEPTION WHEN duplicate_column THEN null;
      END $$;
    `);

    // Add indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requests_account ON transfer_requests(account_number);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON transfer_requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_from ON transfer_requests(station_from_id);
      CREATE INDEX IF NOT EXISTS idx_requests_to ON transfer_requests(station_to_id);
      CREATE INDEX IF NOT EXISTS idx_personnel_account ON personnel(account_number);
    `);

    // Create/update the admin account (password comes from ADMIN_PASSWORD in .env)
    const adminPassword = process.env.ADMIN_PASSWORD || "changeme";
    const adminHash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO users (username, password, role)
       VALUES ('admin', $1, 'admin')
       ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
      [adminHash]
    );

    // Ensure app_settings row exists with defaults
    await client.query(
      `INSERT INTO app_settings (id, app_name, logo_url)
       VALUES (1, 'Unified BFP R2 eRequest Form', '/logo.png')
       ON CONFLICT (id) DO UPDATE SET
         app_name = EXCLUDED.app_name,
         logo_url = EXCLUDED.logo_url`
    ).catch(() => {});

    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
