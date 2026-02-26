import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Test database connection
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize database tables
export const initDatabase = async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create poi table
        await client.query(`
      CREATE TABLE IF NOT EXISTS poi (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        groupe TEXT,
        type VARCHAR(50) DEFAULT 'Point',
        lat NUMERIC(10,6),
        lng NUMERIC(10,6),
        adresse VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create poi_historique table
        await client.query(`
      CREATE TABLE IF NOT EXISTS poi_historique (
        id SERIAL PRIMARY KEY,
        poi_id INTEGER,
        poi_nom VARCHAR(100),
        action VARCHAR(50), -- CREATE, UPDATE, DELETE
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_local_histo_gps_camion_ts
            ON local_histo_gps_all (camion, gps_timestamp DESC)
        `);

        // Données de test si voyage est vide
        const countResult = await client.query('SELECT COUNT(*) AS count FROM voyage');
        if (parseInt(countResult.rows[0].count, 10) === 0) {
            await client.query(`
                INSERT INTO voyage (chauffeur, camion, phone) VALUES
                ('Mohamed Ben Ali', '120 TDS 4578', '+216 98 123 456'),
                ('Ahmed Trabelsi', '185 TDS 9321', '+216 97 456 789')
            `);
            await client.query(`
                INSERT INTO local_histo_gps_all (gps_timestamp, latitude, longitude, speed, odometer, ignition, camion) VALUES
                (NOW() - INTERVAL '10 minutes', 36.8065, 10.1815, 72, 145230, 1, '120 TDS 4578'),
                (NOW() - INTERVAL '30 minutes', 36.8101, 10.0863, 0, 98450, 0, '185 TDS 9321')
            `);
            console.log('✅ Données de test (voyage + GPS) insérées.');
        }

        await client.query('COMMIT');
        console.log('✅ Database tables initialized successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error initializing database:', error);
        throw error;
    } finally {
        client.release();
    }
};

export default pool;
