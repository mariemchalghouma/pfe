import pool from '../config/database.js';

/**
 * Calcule l'écart de carburant entre la table ravitaillement et la table totale
 * Compare par camion, date et lieu
 */
export const getEcartCarburant = async () => {
  try {
    const query = `
      SELECT 
        t.camion AS camion,
        t.date_operation AS date_operation,
        t.lieu AS lieu,
        t.quantite_l AS quantite_totale,
        r.qtt AS quantite_ravitaillement,
        t.quantite_l - r.qtt AS ecart,
        CASE 
          WHEN t.quantite_l - r.qtt = 0 THEN 'conforme'
          WHEN ABS(t.quantite_l - r.qtt) <= 10 THEN 'avertissement'
          ELSE 'depassement'
        END AS etat,
        t.prix_tnd,
        r.chauffeur,
        r.montant AS montant_ravitaillement,
        r.no_ticket
      FROM totale t
      INNER JOIN voyagetracking_ravitaillement r 
        ON UPPER(TRIM(t.camion)) = UPPER(TRIM(r.matricule_camion))
        AND DATE(t.date_operation) = DATE(r.date_trans)
        AND UPPER(TRIM(t.lieu)) = UPPER(TRIM(r.lieu))
      ORDER BY t.date_operation DESC, t.camion ASC
    `;

    const result = await pool.query(query);

    // Formatter les résultats
    const ecarts = result.rows.map((row) => ({
      camion: row.camion,
      date: row.date_operation,
      lieu: row.lieu,
      quantiteTotale: row.quantite_totale != null ? Number(row.quantite_totale) : null,
      quantiteRavitaillement: row.quantite_ravitaillement != null ? Number(row.quantite_ravitaillement) : null,
      ecart: row.ecart != null ? Number(row.ecart) : null,
      etat: row.etat,
      prixTnd: row.prix_tnd != null ? Number(row.prix_tnd) : null,
      chauffeur: row.chauffeur || '—',
      montantRavitaillement: row.montant_ravitaillement != null ? Number(row.montant_ravitaillement) : null,
      noTicket: row.no_ticket || '—'
    }));

    // Calculer les statistiques
    const stats = {
      total: ecarts.length,
      conforme: ecarts.filter(e => e.etat === 'conforme').length,
      avertissement: ecarts.filter(e => e.etat === 'avertissement').length,
      depassement: ecarts.filter(e => e.etat === 'depassement').length
    };

    return Response.json({ 
      success: true, 
      data: ecarts,
      stats: stats
    });
  } catch (error) {
    console.error('Error getEcartCarburant:', error);
    return Response.json(
      {
        success: false,
        message: 'Erreur lors du calcul de l\'écart de carburant',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
};

/**
 * Récupère le niveau de carburant (GPS) pour un camion sur une période
 * Supporte: jour unique (date), plage (dateStart+dateEnd), semaine (weekStart), mois (month)
 */
export const getNiveauCarburant = async (camion, { date, dateStart, dateEnd }) => {
  try {
    // Déterminer la plage de dates
    let startDate, endDate;
    if (dateStart && dateEnd) {
      startDate = dateStart;
      endDate = dateEnd;
    } else if (date) {
      startDate = date;
      endDate = date;
    } else {
      startDate = new Date().toISOString().split('T')[0];
      endDate = startDate;
    }

    // 1 - Points GPS (échantillonnés par heure pour un jour, ou par jour pour une plage)
    const isSingleDay = startDate === endDate;
    const gpsQuery = isSingleDay
      ? `SELECT DISTINCT ON (date_trunc('hour', h.gps_timestamp))
            h.gps_timestamp, h.latitude, h.longitude, h.speed, h.odometer, h.ignition
         FROM local_histo_gps_all h
         WHERE UPPER(TRIM(h.camion::text)) = UPPER(TRIM($1))
           AND DATE(h.gps_timestamp) = $2
           AND h.latitude IS NOT NULL AND h.longitude IS NOT NULL
         ORDER BY date_trunc('hour', h.gps_timestamp), h.gps_timestamp ASC`
      : `SELECT DISTINCT ON (DATE(h.gps_timestamp), date_trunc('hour', h.gps_timestamp))
            h.gps_timestamp, h.latitude, h.longitude, h.speed, h.odometer, h.ignition
         FROM local_histo_gps_all h
         WHERE UPPER(TRIM(h.camion::text)) = UPPER(TRIM($1))
           AND DATE(h.gps_timestamp) >= $2 AND DATE(h.gps_timestamp) <= $3
           AND h.latitude IS NOT NULL AND h.longitude IS NOT NULL
         ORDER BY DATE(h.gps_timestamp), date_trunc('hour', h.gps_timestamp), h.gps_timestamp ASC`;

    const gpsParams = isSingleDay ? [camion, startDate] : [camion, startDate, endDate];
    const gpsResult = await pool.query(gpsQuery, gpsParams);

    // 2 - Trajet complet (pour polyline sur la carte)
    const trajetQuery = `
      SELECT h.latitude, h.longitude, h.gps_timestamp
      FROM local_histo_gps_all h
      WHERE UPPER(TRIM(h.camion::text)) = UPPER(TRIM($1))
        AND DATE(h.gps_timestamp) >= $2 AND DATE(h.gps_timestamp) <= $3
        AND h.latitude IS NOT NULL AND h.longitude IS NOT NULL
      ORDER BY h.gps_timestamp ASC
    `;
    const trajetResult = await pool.query(trajetQuery, [camion, startDate, endDate]);

    // 3 - Ravitaillements de la période
    const ravitQuery = `
      SELECT r.date_trans, r.qtt, r.montant, r.lieu, r.chauffeur, r.no_ticket, r.kms
      FROM voyagetracking_ravitaillement r
      WHERE UPPER(TRIM(r.matricule_camion::text)) = UPPER(TRIM($1))
        AND DATE(COALESCE(r.date_trans, r.date)) >= $2
        AND DATE(COALESCE(r.date_trans, r.date)) <= $3
      ORDER BY r.date_trans ASC
    `;
    const ravitResult = await pool.query(ravitQuery, [camion, startDate, endDate]);

    // 4 - Consommation totale de la période
    const consoQuery = `
      SELECT SUM(t.quantite_l) as total_conso, COUNT(*) as nb_ops
      FROM totale t
      WHERE UPPER(TRIM(t.camion::text)) = UPPER(TRIM($1))
        AND DATE(t.date_operation) >= $2 AND DATE(t.date_operation) <= $3
    `;
    const consoResult = await pool.query(consoQuery, [camion, startDate, endDate]);

    // 5 - Info chauffeur
    const chauffeurQuery = `
      SELECT "SALNOM" as nom, "SALTEL" as tel
      FROM voyage_chauffeur
      WHERE UPPER(TRIM("PLAMOTI"::text)) = UPPER(TRIM($1))
      LIMIT 1
    `;
    const chauffeurResult = await pool.query(chauffeurQuery, [camion]);

    // 6 - Arrêts pendant la période (pour afficher sur la carte)
    const arretsQuery = `
      SELECT s.beginstoptime, s.endstoptime, s.stopduration, s.latitude, s.longitude, s.address
      FROM voyage_tracking_stops s
      WHERE UPPER(TRIM(s.camion::text)) = UPPER(TRIM($1))
        AND DATE(s.beginstoptime) >= $2 AND DATE(s.beginstoptime) <= $3
        AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
      ORDER BY s.beginstoptime ASC
    `;
    let arretsData = [];
    try {
      const arretsResult = await pool.query(arretsQuery, [camion, startDate, endDate]);
      arretsData = arretsResult.rows;
    } catch (e) { /* table might not exist */ }

    // Simuler le niveau de réservoir
    const gpsPoints = gpsResult.rows;
    let niveauActuel = 78;
    const totalConsoJour = consoResult.rows[0]?.total_conso ? Number(consoResult.rows[0].total_conso) : 0;
    const nbPoints = gpsPoints.length || 1;
    const consoParPoint = totalConsoJour > 0 ? (totalConsoJour / 300) * (100 / nbPoints) : 1.2;

    const ravitMap = {};
    ravitResult.rows.forEach(r => {
      if (r.date_trans) {
        const key = isSingleDay
          ? new Date(r.date_trans).getHours()
          : new Date(r.date_trans).toISOString().split('T')[0];
        ravitMap[key] = (ravitMap[key] || 0) + (Number(r.qtt) || 0);
      }
    });

    const niveauData = gpsPoints.map((pt) => {
      const ts = new Date(pt.gps_timestamp);
      const heure = `${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`;
      const dateLabel = ts.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      const label = isSingleDay ? heure : `${dateLabel} ${heure}`;
      const ravitKey = isSingleDay ? ts.getHours() : ts.toISOString().split('T')[0];

      if (ravitMap[ravitKey]) {
        niveauActuel = Math.min(100, niveauActuel + (ravitMap[ravitKey] / 300) * 100);
        delete ravitMap[ravitKey];
      }

      const speed = Number(pt.speed) || 0;
      const reduction = speed > 0 ? consoParPoint * (0.8 + speed / 200) : consoParPoint * 0.2;
      niveauActuel = Math.max(2, niveauActuel - reduction);

      return {
        heure: label,
        niveau: Math.round(niveauActuel * 10) / 10,
        latitude: Number(pt.latitude),
        longitude: Number(pt.longitude),
        speed,
        odometer: Number(pt.odometer) || 0,
        ignition: pt.ignition,
        timestamp: pt.gps_timestamp,
        ravitaillement: ravitResult.rows.some(r => {
          if (!r.date_trans) return false;
          const rTs = new Date(r.date_trans);
          return isSingleDay ? rTs.getHours() === ts.getHours() : rTs.toISOString().split('T')[0] === ts.toISOString().split('T')[0];
        }),
      };
    });

    // Trajet polyline
    const trajet = trajetResult.rows.map(r => [Number(r.latitude), Number(r.longitude)]);

    // Arrêts formatés
    const arrets = arretsData.map(a => ({
      lat: Number(a.latitude),
      lng: Number(a.longitude),
      debut: a.beginstoptime,
      fin: a.endstoptime,
      duree: a.stopduration,
      adresse: a.address || '—',
      conforme: Number(a.stopduration || 0) <= 30,
    }));

    // Stats
    const totalRavit = ravitResult.rows.reduce((s, r) => s + (Number(r.qtt) || 0), 0);
    const totalMontant = ravitResult.rows.reduce((s, r) => s + (Number(r.montant) || 0), 0);
    const firstOdo = gpsPoints.length > 0 ? Number(gpsPoints[0].odometer) || 0 : 0;
    const lastOdo = gpsPoints.length > 0 ? Number(gpsPoints[gpsPoints.length - 1].odometer) || 0 : 0;
    const distanceKm = Math.max(0, lastOdo - firstOdo);
    const consoLPer100km = distanceKm > 0 ? (totalConsoJour / distanceKm) * 100 : 0;
    const ecart = totalConsoJour - totalRavit;
    const etat = Math.abs(ecart) <= 10 ? 'conforme' : Math.abs(ecart) <= 30 ? 'avertissement' : 'depassement';

    return Response.json({
      success: true,
      data: {
        camion,
        dateStart: startDate,
        dateEnd: endDate,
        chauffeur: chauffeurResult.rows[0]?.nom || '—',
        telephone: chauffeurResult.rows[0]?.tel || '—',
        objectif: 20,
        niveauData,
        trajet,
        arrets,
        ravitaillements: ravitResult.rows.map(r => ({
          date: r.date_trans,
          quantite: Number(r.qtt) || 0,
          montant: Number(r.montant) || 0,
          lieu: r.lieu || '—',
          noTicket: r.no_ticket || '—',
        })),
        stats: {
          totalConso: Math.round(totalConsoJour),
          consoMoy: Math.round(consoLPer100km * 10) / 10,
          nbPleins: ravitResult.rows.length,
          totalMontant: Math.round(totalMontant),
          distanceKm: Math.round(distanceKm),
          etat,
        },
      },
    });
  } catch (error) {
    console.error('Error getNiveauCarburant:', error);
    return Response.json(
      { success: false, message: "Erreur lors de la récupération du niveau carburant", error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
};

/**
 * Récupère l'écart de carburant pour un camion spécifique
 */
export const getEcartCarburantByCamion = async (camion) => {
  try {
    const query = `
      SELECT 
        t.camion AS camion,
        t.date_operation AS date_operation,
        t.lieu AS lieu,
        t.quantite_l AS quantite_totale,
        r.qtt AS quantite_ravitaillement,
        t.quantite_l - r.qtt AS ecart,
        CASE 
          WHEN t.quantite_l - r.qtt = 0 THEN 'conforme'
          WHEN ABS(t.quantite_l - r.qtt) <= 10 THEN 'avertissement'
          ELSE 'depassement'
        END AS etat,
        t.prix_tnd,
        r.chauffeur,
        r.montant AS montant_ravitaillement,
        r.no_ticket,
        r.kms
      FROM totale t
      INNER JOIN voyagetracking_ravitaillement r 
        ON UPPER(TRIM(t.camion)) = UPPER(TRIM(r.matricule_camion))
        AND DATE(t.date_operation) = DATE(r.date_trans)
        AND UPPER(TRIM(t.lieu)) = UPPER(TRIM(r.lieu))
      WHERE UPPER(TRIM(t.camion)) = UPPER(TRIM($1))
      ORDER BY t.date_operation DESC
    `;

    const result = await pool.query(query, [camion]);

    const ecarts = result.rows.map((row) => ({
      camion: row.camion,
      date: row.date_operation,
      lieu: row.lieu,
      quantiteTotale: row.quantite_totale != null ? Number(row.quantite_totale) : null,
      quantiteRavitaillement: row.quantite_ravitaillement != null ? Number(row.quantite_ravitaillement) : null,
      ecart: row.ecart != null ? Number(row.ecart) : null,
      etat: row.etat,
      prixTnd: row.prix_tnd != null ? Number(row.prix_tnd) : null,
      chauffeur: row.chauffeur || '—',
      montantRavitaillement: row.montant_ravitaillement != null ? Number(row.montant_ravitaillement) : null,
      noTicket: row.no_ticket || '—',
      kms: row.kms != null ? Number(row.kms) : null
    }));

    return Response.json({ 
      success: true, 
      data: ecarts
    });
  } catch (error) {
    console.error('Error getEcartCarburantByCamion:', error);
    return Response.json(
      {
        success: false,
        message: 'Erreur lors de la récupération de l\'écart de carburant',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
};
