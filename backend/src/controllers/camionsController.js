import pool from '../config/database.js';

/**
 * Liste des camions : jointure Voyage + dernière position GPS (local_histo_gps_all).
 * Statut dérivé : en_route (vitesse > 0), arrete (vitesse = 0), arrete_nc si besoin.
 */
export const getCamions = async (req, res) => {
    try {
        const result = await pool.query(`
             SELECT
                v.camion,
                v.chauffeur,
                v.phone,
                g.gps_timestamp AS derniere_maj,
                g.latitude AS lat,
                g.longitude AS lng,
                g.speed AS vitesse,
                g.odometer AS kilometrage,
                g.ignition
            FROM voyage v
            LEFT JOIN LATERAL (
                SELECT gps_timestamp, latitude, longitude, speed, odometer, ignition
                FROM local_histo_gps_all
                WHERE local_histo_gps_all.camion = v.camion
                ORDER BY gps_timestamp DESC
                LIMIT 1
            ) g ON true
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
                localisation: row.lat != null && row.lng != null
                    ? `${Number(row.lat).toFixed(4)}, ${Number(row.lng).toFixed(4)}`
                    : '—',
                vitesse,
                statut,
                lat: row.lat != null ? Number(row.lat) : null,
                lng: row.lng != null ? Number(row.lng) : null,
                kilometrage: row.kilometrage != null ? Number(row.kilometrage) : 0,
                derniereMaj: row.derniere_maj
                    ? new Date(row.derniere_maj).toISOString().replace('T', ' ').slice(0, 16)
                    : '—',
                ignition: row.ignition,
            };
        });

        res.json({ success: true, data: camions });
    } catch (error) {
        console.error('Error getCamions:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des camions',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Trajet (polyline) pour un camion : historique des positions par gps_timestamp.
 */
export const getCamionTrajet = async (req, res) => {
    try {
        const { camion } = req.params;
        const result = await pool.query(
            `SELECT latitude, longitude, gps_timestamp
             FROM local_histo_gps_all
             WHERE camion = $1
             ORDER BY gps_timestamp ASC`,
            [camion]
        );

        const trajet = result.rows
            .filter((r) => r.latitude != null && r.longitude != null)
            .map((r) => [Number(r.latitude), Number(r.longitude)]);

        res.json({ success: true, data: trajet });
    } catch (error) {
        console.error('Error getCamionTrajet:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération du trajet',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};
