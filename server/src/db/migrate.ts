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
        ('Tuguegarao City Fire Station', 'Tuguegarao City', 'Cagayan'),
        ('Cagayan Provincial Fire Station', 'Tuguegarao City', 'Cagayan'),
        ('Aparri Fire Station', 'Aparri', 'Cagayan'),
        ('Lal-lo Fire Station', 'Lal-lo', 'Cagayan'),
        ('Camalaniugan Fire Station', 'Camalaniugan', 'Cagayan'),
        ('Buguey Fire Station', 'Buguey', 'Cagayan'),
        ('Santa Ana Fire Station', 'Santa Ana', 'Cagayan'),
        ('Santa Praxedes Fire Station', 'Santa Praxedes', 'Cagayan'),
        ('Claveria Fire Station', 'Claveria', 'Cagayan'),
        ('Sanchez Mira Fire Station', 'Sanchez Mira', 'Cagayan'),
        ('Pamplona Fire Station', 'Pamplona', 'Cagayan'),
        ('Allacapan Fire Station', 'Allacapan', 'Cagayan'),
        ('Lasam Fire Station', 'Lasam', 'Cagayan'),
        ('Gattaran Fire Station', 'Gattaran', 'Cagayan'),
        ('Bagao Fire Station', 'Bagao', 'Cagayan'),
        ('Peñablanca Fire Station', 'Peñablanca', 'Cagayan'),
        ('Iguig Fire Station', 'Iguig', 'Cagayan'),
        ('Amulung Fire Station', 'Amulung', 'Cagayan'),
        ('Solana Fire Station', 'Solana', 'Cagayan'),
        ('Enrile Fire Station', 'Enrile', 'Cagayan'),
        ('Tuao Fire Station', 'Tuao', 'Cagayan'),
        ('Piat Fire Station', 'Piat', 'Cagayan'),
        ('Rizal Fire Station', 'Rizal', 'Cagayan'),

        ('Ilagan City Fire Station', 'Ilagan City', 'Isabela'),
        ('Isabela Provincial Fire Station', 'Ilagan', 'Isabela'),
        ('Santiago City Fire Station', 'Santiago City', 'Isabela'),
        ('Cauayan City Fire Station', 'Cauayan City', 'Isabela'),
        ('Santiago Fire Station', 'Santiago', 'Isabela'),
        ('Cordon Fire Station', 'Cordon', 'Isabela'),
        ('Diffun Fire Station', 'Diffun', 'Isabela'),
        ('Cabarroguis Fire Station', 'Cabarroguis', 'Isabela'),
        ('Aurora Fire Station', 'Aurora', 'Isabela'),
        ('San Guillermo Fire Station', 'San Guillermo', 'Isabela'),
        ('Angadanan Fire Station', 'Angadanan', 'Isabela'),
        ('Alicia Fire Station', 'Alicia', 'Isabela'),
        ('San Mateo Fire Station', 'San Mateo', 'Isabela'),
        ('Jones Fire Station', 'Jones', 'Isabela'),
        ('San Isidro Fire Station', 'San Isidro', 'Isabela'),
        ('Echague Fire Station', 'Echague', 'Isabela'),
        ('Santiago Fire Station 2', 'Santiago', 'Isabela'),
        ('Cabatuan Fire Station', 'Cabatuan', 'Isabela'),
        ('Luna Fire Station', 'Luna', 'Isabela'),
        ('Ramon Fire Station', 'Ramon', 'Isabela'),
        ('San Manuel Fire Station', 'San Manuel', 'Isabela'),
        ('Roxas Fire Station', 'Roxas', 'Isabela'),
        ('Burgos Fire Station', 'Burgos', 'Isabela'),
        ('Mallig Fire Station', 'Mallig', 'Isabela'),
        ('Quezon Fire Station', 'Quezon', 'Isabela'),
        ('Naguilian Fire Station', 'Naguilian', 'Isabela'),
        ('Reina Mercedes Fire Station', 'Reina Mercedes', 'Isabela'),
        ('Benito Soliven Fire Station', 'Benito Soliven', 'Isabela'),
        ('San Mariano Fire Station', 'San Mariano', 'Isabela'),
        ('Divilacan Fire Station', 'Divilacan', 'Isabela'),
        ('Maconacon Fire Station', 'Maconacon', 'Isabela'),
        ('Palanan Fire Station', 'Palanan', 'Isabela'),

        ('Bayombong Fire Station', 'Bayombong', 'Nueva Vizcaya'),
        ('Solano Fire Station', 'Solano', 'Nueva Vizcaya'),
        ('Bagabag Fire Station', 'Bagabag', 'Nueva Vizcaya'),
        ('Bambang Fire Station', 'Bambang', 'Nueva Vizcaya'),
        ('Nueva Vizcaya Provincial Fire Station', 'Bayombong', 'Nueva Vizcaya'),
        ('Kasibu Fire Station', 'Kasibu', 'Nueva Vizcaya'),
        ('Kayapa Fire Station', 'Kayapa', 'Nueva Vizcaya'),
        ('Ambaguio Fire Station', 'Ambaguio', 'Nueva Vizcaya'),
        ('Aritao Fire Station', 'Aritao', 'Nueva Vizcaya'),
        ('Santa Fe Fire Station', 'Santa Fe', 'Nueva Vizcaya'),
        ('Villaverde Fire Station', 'Villaverde', 'Nueva Vizcaya'),
        ('Casem Fire Station', 'Casem', 'Nueva Vizcaya'),
        ('Alfonso Castaneda Fire Station', 'Alfonso Castaneda', 'Nueva Vizcaya'),
        ('Dupax del Norte Fire Station', 'Dupax del Norte', 'Nueva Vizcaya'),
        ('Dupax del Sur Fire Station', 'Dupax del Sur', 'Nueva Vizcaya'),

        ('Cabarroguis Fire Station', 'Cabarroguis', 'Quirino'),
        ('Quirino Provincial Fire Station', 'Cabarroguis', 'Quirino'),
        ('Diffun Fire Station 2', 'Diffun', 'Quirino'),
        ('Saguday Fire Station', 'Saguday', 'Quirino'),
        ('Maddela Fire Station', 'Maddela', 'Quirino'),
        ('Nagtipunan Fire Station', 'Nagtipunan', 'Quirino'),
        ('Aglipay Fire Station', 'Aglipay', 'Quirino')
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
