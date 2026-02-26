import pool from '../config/database.js';

export const getCamions = async () => {
  try {
    const result = await pool.query(`
      WITH camions_source AS (
          SELECT DISTINCT ON ("PLAMOTI")
              "PLAMOTI" AS camion,
              "SALNOM" AS chauffeur,
              "SALTEL" AS phone
          FROM voyage_chauffeur
          WHERE "PLAMOTI" IS NOT NULL
          ORDER BY "PLAMOTI"
      ),
      gps_latest AS (
          SELECT DISTINCT ON (UPPER(TRIM(h.camion::text)))
              UPPER(TRIM(h.camion::text)) AS camion_norm,
              h.gps_timestamp,
              h.latitude,
              h.longitude,
              h.speed,
              h.odometer,
              h.ignition
          FROM local_histo_gps_all h
          WHERE h.camion IS NOT NULL
          ORDER BY UPPER(TRIM(h.camion::text)), h.gps_timestamp DESC
      ),
      ravit_latest AS (
          SELECT DISTINCT ON (UPPER(TRIM(r.matricule_camion::text)))
              UPPER(TRIM(r.matricule_camion::text)) AS camion_norm,
              r.qtt AS carburant
          FROM voyagetracking_ravitaillement r
          WHERE r.matricule_camion IS NOT NULL
          ORDER BY UPPER(TRIM(r.matricule_camion::text)), COALESCE(r.date_trans, r.date) DESC NULLS LAST
      )
      SELECT
          v.camion,
          v.chauffeur,
          v.phone,
          g.gps_timestamp AS derniere_maj,
          g.latitude AS lat,
          g.longitude AS lng,
          g.speed AS vitesse,
          g.odometer AS kilometrage,
          g.ignition,
          r.carburant
      FROM camions_source v
      LEFT JOIN gps_latest g
          ON g.camion_norm = UPPER(TRIM(v.camion::text))
      LEFT JOIN ravit_latest r
          ON r.camion_norm = UPPER(TRIM(v.camion::text))
      WHERE g.gps_timestamp IS NOT NULL
      ORDER BY v.camion
    `);

    const camions = result.rows.map((row, index) => {
      const vitesse = row.vitesse != null ? Number(row.vitesse) : 0;
      let statut = 'arrete';
      if (vitesse > 0) statut = 'en_route';

      return {
        id: index + 1,
        plaque: row.camion,
        chauffeur: row.chauffeur || '—',
        telephone: row.phone || '—',
        localisation:
          row.lat != null && row.lng != null
            ? `${Number(row.lat).toFixed(4)}, ${Number(row.lng).toFixed(4)}`
            : '—',
        vitesse,
        statut,
        lat: row.lat != null ? Number(row.lat) : null,
        lng: row.lng != null ? Number(row.lng) : null,
        kilometrage: row.kilometrage != null ? Number(row.kilometrage) : 0,
        carburant: row.carburant != null ? Number(row.carburant) : null,
        derniereMaj: row.derniere_maj
          ? new Date(row.derniere_maj).toISOString().replace('T', ' ').slice(0, 16)
          : '—',
        ignition: row.ignition,
      };
    });

    return Response.json({ success: true, data: camions });
  } catch (error) {
    console.error('Error getCamions:', error);
    return Response.json(
      {
        success: false,
        message: 'Erreur lors de la récupération des camions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
};

export const getCamionTrajet = async (camion) => {
  try {
    const result = await pool.query(
      `SELECT latitude, longitude, gps_timestamp
       FROM local_histo_gps_all
       WHERE camion = $1
       ORDER BY gps_timestamp ASC`,
      [camion]
    );

    const trajet = result.rows
      .filter((item) => item.latitude != null && item.longitude != null)
      .map((item) => [Number(item.latitude), Number(item.longitude)]);

    return Response.json({ success: true, data: trajet });
  } catch (error) {
    console.error('Error getCamionTrajet:', error);
    return Response.json(
      {
        success: false,
        message: 'Erreur lors de la récupération du trajet',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
};
