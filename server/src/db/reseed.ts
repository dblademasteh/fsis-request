import pool from "./pool";

export async function reseedStations() {
  try {
    console.log("⚠️  WARNING: This will DELETE all fire stations and transfer requests!");
    console.log("Type 'yes' to confirm: ");

    // Auto-confirm for automated runs - use carefully
    const confirm = process.argv[2] === 'yes';
    if (!confirm) {
      console.log("Abort. Pass 'yes' as argument to proceed.");
      process.exit(1);
    }

    // Drop constraints first
    await pool.query("DROP TABLE IF EXISTS transfer_requests CASCADE");
    await pool.query("DROP TABLE IF EXISTS fire_stations CASCADE");
    console.log("Tables dropped.");

    // Re-run main migration to recreate and seed
    const migrateResult = await pool.query(`
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
        email VARCHAR(255) NOT NULL,
        designation VARCHAR(255),
        new_rank VARCHAR(100),
        new_first_name VARCHAR(255),
        new_middle_name VARCHAR(255),
        new_last_name VARCHAR(255),
        new_suffix VARCHAR(50),
        new_email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
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
        account_number VARCHAR(100) UNIQUE,
        email VARCHAR(255) UNIQUE,
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

      INSERT INTO users (username, password, role)
      VALUES ('admin', '$2b$10$placeholder', 'admin')
      ON CONFLICT (username) DO NOTHING;

      CREATE INDEX IF NOT EXISTS idx_requests_account ON transfer_requests(account_number);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON transfer_requests(status);
      ALTER TABLE IF EXISTS transfer_requests ALTER COLUMN email DROP NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_fire_stations_station_name ON fire_stations(station_name);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_account ON personnel(account_number);
    `);
    console.log("Schema created.");

    // Seed stations with your provided data
    const stations = [
      { station_name: "Alcala FS", municipality: "Alcala", province: "Cagayan" },
      { station_name: "Allacapan FS", municipality: "Allacapan", province: "Cagayan" },
      { station_name: "Amulung FS", municipality: "Amulung", province: "Cagayan" },
      { station_name: "Aparri FS", municipality: "Aparri", province: "Cagayan" },
      { station_name: "Baggao FS", municipality: "Baggao", province: "Cagayan" },
      { station_name: "Ballesteros FS", municipality: "Ballesteros", province: "Cagayan" },
      { station_name: "Buguey FS", municipality: "Buguey", province: "Cagayan" },
      { station_name: "Camalaniugan FS", municipality: "Camalaniugan", province: "Cagayan" },
      { station_name: "Claveria FS", municipality: "Claveria", province: "Cagayan" },
      { station_name: "Enrile FS", municipality: "Enrile", province: "Cagayan" },
      { station_name: "Gattaran FS", municipality: "Gattaran", province: "Cagayan" },
      { station_name: "Gonzaga FS", municipality: "Gonzaga", province: "Cagayan" },
      { station_name: "Iguig FS", municipality: "Iguig", province: "Cagayan" },
      { station_name: "Lal-lo FS", municipality: "Lal-lo", province: "Cagayan" },
      { station_name: "Peñablanca FS", municipality: "Peñablanca", province: "Cagayan" },
      { station_name: "Piat FS", municipality: "Piat", province: "Cagayan" },
      { station_name: "Sanchez Mira FS", municipality: "Sanchez Mira", province: "Cagayan" },
      { station_name: "Sta. Ana FS", municipality: "Santa Ana", province: "Cagayan" },
      { station_name: "Sta. Praxedes FS", municipality: "Santa Praxedes", province: "Cagayan" },
      { station_name: "Solana FS", municipality: "Solana", province: "Cagayan" },
      { station_name: "Tuao FS", municipality: "Tuao", province: "Cagayan" },
      { station_name: "Tuguegarao City FS", municipality: "Tuguegarao City", province: "Cagayan" },
      { station_name: "Lasam FS", municipality: "Lasam", province: "Cagayan" },
      { station_name: "Pamplona FS", municipality: "Pamplona", province: "Cagayan" },
      { station_name: "Sto. Niño FS", municipality: "Santo Niño", province: "Cagayan" },
      { station_name: "Abulug FS", municipality: "Abulug", province: "Cagayan" },
      { station_name: "Rizal FS", municipality: "Rizal", province: "Cagayan" },
      { station_name: "Sta.Teresita FS", municipality: "Santa Teresita", province: "Cagayan" },
      { station_name: "Calayan FS", municipality: "Calayan", province: "Cagayan" },
      { station_name: "Alicia FS", municipality: "Alicia", province: "Isabela" },
      { station_name: "Angadanan FS", municipality: "Angadanan", province: "Isabela" },
      { station_name: "Aurora FS", municipality: "Aurora", province: "Isabela" },
      { station_name: "Cabagan FS", municipality: "Cabagan", province: "Isabela" },
      { station_name: "Cabatuan FS", municipality: "Cabatuan", province: "Isabela" },
      { station_name: "Cauayan City FS", municipality: "Cauayan City", province: "Isabela" },
      { station_name: "Delfin Albano FS", municipality: "Delfin Albano", province: "Isabela" },
      { station_name: "Echague FS", municipality: "Echague", province: "Isabela" },
      { station_name: "City of Ilagan FS", municipality: "Ilagan City", province: "Isabela" },
      { station_name: "Jones FS", municipality: "Jones", province: "Isabela" },
      { station_name: "Luna FS", municipality: "Luna", province: "Isabela" },
      { station_name: "Mallig FS", municipality: "Mallig", province: "Isabela" },
      { station_name: "Naguilian FS", municipality: "Naguilian", province: "Isabela" },
      { station_name: "Quezon FS", municipality: "Quezon", province: "Isabela" },
      { station_name: "Quirino FS", municipality: "Quirino", province: "Isabela" },
      { station_name: "Ramon FS", municipality: "Ramon", province: "Isabela" },
      { station_name: "Roxas FS", municipality: "Roxas", province: "Isabela" },
      { station_name: "City of Santiago FS", municipality: "Santiago City", province: "Isabela" },
      { station_name: "San Agustin FS", municipality: "San Agustin", province: "Isabela" },
      { station_name: "San Guillermo FS", municipality: "San Guillermo", province: "Isabela" },
      { station_name: "San Mariano FS", municipality: "San Mariano", province: "Isabela" },
      { station_name: "San Mateo FS", municipality: "San Mateo", province: "Isabela" },
      { station_name: "San Pablo FS", municipality: "San Pablo", province: "Isabela" },
      { station_name: "Sta. Maria FS", municipality: "Santa Maria", province: "Isabela" },
      { station_name: "Tumauini FS", municipality: "Tumauini", province: "Isabela" },
      { station_name: "Cordon FS", municipality: "Cordon", province: "Isabela" },
      { station_name: "Benito Soliven FS", municipality: "Benito Soliven", province: "Isabela" },
      { station_name: "Burgos FS", municipality: "Burgos", province: "Isabela" },
      { station_name: "Reina Mercedes FS", municipality: "Reina Mercedes", province: "Isabela" },
      { station_name: "San Isidro FS", municipality: "San Isidro", province: "Isabela" },
      { station_name: "Sto. Tomas FS", municipality: "Santo Tomas", province: "Isabela" },
      { station_name: "Dinapigue FS", municipality: "Dinapigue", province: "Isabela" },
      { station_name: "Divilacan FS", municipality: "Divilacan", province: "Isabela" },
      { station_name: "Gamu Fire Station", municipality: "Gamu", province: "Isabela" },
      { station_name: "San Manuel Fire Station", municipality: "San Manuel", province: "Isabela" },
      { station_name: "Maconacon FS", municipality: "Maconacon", province: "Isabela" },
      { station_name: "Palanan FS", municipality: "Palanan", province: "Isabela" },
      { station_name: "Alfonso Castañeda FS", municipality: "Alfonso Castañeda", province: "Nueva Vizcaya" },
      { station_name: "Aritao FS", municipality: "Aritao", province: "Nueva Vizcaya" },
      { station_name: "Bagabag FS", municipality: "Bagabag", province: "Nueva Vizcaya" },
      { station_name: "Bambang FS", municipality: "Bambang", province: "Nueva Vizcaya" },
      { station_name: "Bayombong FS", municipality: "Bayombong", province: "Nueva Vizcaya" },
      { station_name: "Diadi FS", municipality: "Diadi", province: "Nueva Vizcaya" },
      { station_name: "Solano FS", municipality: "Solano", province: "Nueva Vizcaya" },
      { station_name: "Sta. Fe FS", municipality: "Santa Fe", province: "Nueva Vizcaya" },
      { station_name: "Kasibu FS", municipality: "Kasibu", province: "Nueva Vizcaya" },
      { station_name: "Kayapa FS", municipality: "Kayapa", province: "Nueva Vizcaya" },
      { station_name: "Villaverde FS", municipality: "Villaverde", province: "Nueva Vizcaya" },
      { station_name: "Dupax del Sur FS", municipality: "Dupax del Sur", province: "Nueva Vizcaya" },
      { station_name: "Dupax del Norte FS", municipality: "Dupax del Norte", province: "Nueva Vizcaya" },
      { station_name: "Ambaguio FS", municipality: "Ambaguio", province: "Nueva Vizcaya" },
      { station_name: "Aglipay FS", municipality: "Aglipay", province: "Quirino" },
      { station_name: "Cabarroguis FS", municipality: "Cabarroguis", province: "Quirino" },
      { station_name: "Diffun FS", municipality: "Diffun", province: "Quirino" },
      { station_name: "Maddela FS", municipality: "Maddela", province: "Quirino" },
      { station_name: "Nagtipunan FS", municipality: "Nagtipunan", province: "Quirino" },
      { station_name: "Saguday FS", municipality: "Saguday", province: "Quirino" },
      { station_name: "Basco FS", municipality: "Basco", province: "Batanes" },
      { station_name: "Itbayat FPO", municipality: "Itbayat", province: "Batanes" },
      { station_name: "Mahatao FS", municipality: "Mahatao", province: "Batanes" },
      { station_name: "Sabtang FS", municipality: "Sabtang", province: "Batanes" },
      { station_name: "Ivana Fire Station", municipality: "Ivana", province: "Batanes" },
      { station_name: "Uyugan Fire Station", municipality: "Uyugan", province: "Batanes" },
      { station_name: "ORD Fire Station", municipality: "Cagayan", province: "Cagayan" },
      { station_name: "OPFM", municipality: "Cagayan", province: "Cagayan" },
    ];

    for (const s of stations) {
      await pool.query(
        "INSERT INTO fire_stations (station_name, municipality, province) VALUES ($1, $2, $3)",
        [s.station_name, s.municipality, s.province]
      );
    }
    console.log(`${stations.length} stations seeded.`);

    console.log("Reseed complete!");
  } catch (err) {
    console.error("Reseed failed:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  reseedStations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}