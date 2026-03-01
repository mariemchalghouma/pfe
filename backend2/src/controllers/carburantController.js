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
