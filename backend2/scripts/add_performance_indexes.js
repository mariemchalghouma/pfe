const pool = require("../src/config/database.js").default;
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const statements = [
  {
    name: "voyage_chauffeur_date_idx",
    sql: 'CREATE INDEX IF NOT EXISTS voyage_chauffeur_date_idx ON voyage_chauffeur ("VOYDTD")',
  },
  {
    name: "voyage_chauffeur_camion_date_idx",
    sql: 'CREATE INDEX IF NOT EXISTS voyage_chauffeur_camion_date_idx ON voyage_chauffeur ("PLAMOTI", "VOYDTD")',
  },
  {
    name: "local_histo_gps_timestamp_idx",
    sql: "CREATE INDEX IF NOT EXISTS local_histo_gps_timestamp_idx ON local_histo_gps_all (gps_timestamp)",
  },
  {
    name: "local_histo_gps_camion_ts_idx",
    sql: "CREATE INDEX IF NOT EXISTS local_histo_gps_camion_ts_idx ON local_histo_gps_all (camion, gps_timestamp)",
  },
  {
    name: "local_histo_gps_camion_norm_ts_idx",
    sql: "CREATE INDEX IF NOT EXISTS local_histo_gps_camion_norm_ts_idx ON local_histo_gps_all (UPPER(TRIM(camion::text)), gps_timestamp)",
  },
  {
    name: "voyage_tracking_stops_begin_idx",
    sql: "CREATE INDEX IF NOT EXISTS voyage_tracking_stops_begin_idx ON voyage_tracking_stops (beginstoptime)",
  },
  {
    name: "voyage_tracking_stops_end_idx",
    sql: "CREATE INDEX IF NOT EXISTS voyage_tracking_stops_end_idx ON voyage_tracking_stops (endstoptime)",
  },
  {
    name: "voyage_tracking_stops_camion_time_idx",
    sql: "CREATE INDEX IF NOT EXISTS voyage_tracking_stops_camion_time_idx ON voyage_tracking_stops (camion, beginstoptime, endstoptime)",
  },
  {
    name: "voyage_tracking_stops_camion_norm_time_idx",
    sql: "CREATE INDEX IF NOT EXISTS voyage_tracking_stops_camion_norm_time_idx ON voyage_tracking_stops (REPLACE(camion, ' ', ''), beginstoptime, endstoptime)",
  },
  {
    name: "ravit_coalesce_date_idx",
    sql: 'CREATE INDEX IF NOT EXISTS ravit_coalesce_date_idx ON voyagetracking_ravitaillement (COALESCE(date_trans, "date"::timestamp))',
  },
  {
    name: "port_ouvert_date_ouverture_idx",
    sql: "CREATE INDEX IF NOT EXISTS port_ouvert_date_ouverture_idx ON voyagetracking_port_ouvert (date_ouverture)",
  },
];

const run = async () => {
  try {
    console.log("Starting performance index migration...");

    for (const stmt of statements) {
      try {
        await pool.query(stmt.sql);
        console.log(`OK: ${stmt.name}`);
      } catch (error) {
        console.warn(`Skipped ${stmt.name}: ${error.message}`);
      }
    }

    console.log("Done.");
  } catch (error) {
    console.error("Failed to apply indexes:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
