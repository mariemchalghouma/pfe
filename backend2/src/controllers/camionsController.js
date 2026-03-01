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

/* ═══ Gantt data — activity segments for all camions on a given date ═══ */
export const getCamionsGantt = async (date) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // 1) Get all camions
    const camionsResult = await pool.query(`
      SELECT DISTINCT ON ("PLAMOTI") "PLAMOTI" AS camion, "SALNOM" AS chauffeur
      FROM voyage_chauffeur WHERE "PLAMOTI" IS NOT NULL ORDER BY "PLAMOTI"
    `);

    // 2) Get stops for the date
    const stopsResult = await pool.query(`
      SELECT camion, beginstoptime, endstoptime, stopduration, latitude, longitude, address
      FROM voyage_tracking_stops
      WHERE DATE(beginstoptime) = $1
      ORDER BY camion, beginstoptime ASC
    `, [targetDate]);

    // 3) Get first/last GPS readings per camion for the date (activity window)
    const gpsResult = await pool.query(`
      SELECT camion,
        MIN(gps_timestamp) AS first_seen,
        MAX(gps_timestamp) AS last_seen,
        SUM(CASE WHEN speed > 0 THEN 1 ELSE 0 END) AS moving_points,
        COUNT(*) AS total_points
      FROM local_histo_gps_all
      WHERE DATE(gps_timestamp) = $1
      GROUP BY camion
    `, [targetDate]);

    const gpsMap = {};
    gpsResult.rows.forEach(r => {
      gpsMap[r.camion?.toUpperCase()?.trim()] = r;
    });

    const stopsMap = {};
    stopsResult.rows.forEach(s => {
      const key = s.camion?.toUpperCase()?.trim();
      if (!stopsMap[key]) stopsMap[key] = [];
      stopsMap[key].push(s);
    });

    const ganttData = camionsResult.rows.map(c => {
      const key = c.camion?.toUpperCase()?.trim();
      const gps = gpsMap[key];
      const stops = stopsMap[key] || [];

      if (!gps) {
        return { camion: c.camion, chauffeur: c.chauffeur || '—', segments: [], hasData: false };
      }

      const segments = [];
      const dayStart = new Date(`${targetDate}T00:00:00`);
      const dayEnd = new Date(`${targetDate}T23:59:59`);
      const firstSeen = new Date(gps.first_seen);
      const lastSeen = new Date(gps.last_seen);

      // Sort stops by start time
      const sortedStops = [...stops].sort((a, b) => new Date(a.beginstoptime) - new Date(b.beginstoptime));

      // Before first GPS → inactive
      if (firstSeen > dayStart) {
        segments.push({ type: 'inactive', start: dayStart.toISOString(), end: firstSeen.toISOString() });
      }

      // Build segments from stops
      let cursor = firstSeen;
      sortedStops.forEach(stop => {
        const stopStart = new Date(stop.beginstoptime);
        const stopEnd = new Date(stop.endstoptime || stopStart.getTime() + (stop.stopduration || 0) * 60000);

        if (stopStart > cursor) {
          segments.push({ type: 'driving', start: cursor.toISOString(), end: stopStart.toISOString() });
        }
        const stopDuration = Number(stop.stopduration) || 0;
        segments.push({
          type: stopDuration > 30 ? 'stop_long' : 'stop',
          start: stopStart.toISOString(),
          end: stopEnd.toISOString(),
          duration: stopDuration,
          address: stop.address || '—',
          lat: stop.latitude ? Number(stop.latitude) : null,
          lng: stop.longitude ? Number(stop.longitude) : null,
        });
        cursor = stopEnd > cursor ? stopEnd : cursor;
      });

      // After last stop → driving until last seen
      if (cursor < lastSeen) {
        segments.push({ type: 'driving', start: cursor.toISOString(), end: lastSeen.toISOString() });
      }

      // After last seen → inactive
      if (lastSeen < dayEnd) {
        segments.push({ type: 'inactive', start: lastSeen.toISOString(), end: dayEnd.toISOString() });
      }

      return {
        camion: c.camion,
        chauffeur: c.chauffeur || '—',
        firstSeen: gps.first_seen,
        lastSeen: gps.last_seen,
        movingPct: gps.total_points > 0 ? Math.round((gps.moving_points / gps.total_points) * 100) : 0,
        segments,
        hasData: true,
      };
    });

    return Response.json({ success: true, data: ganttData, date: targetDate });
  } catch (error) {
    console.error('Error getCamionsGantt:', error);
    return Response.json({ success: false, message: 'Erreur Gantt', error: process.env.NODE_ENV === 'development' ? error.message : undefined }, { status: 500 });
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
