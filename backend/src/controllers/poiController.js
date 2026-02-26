import pool from '../config/database.js';

let poiHasRayonColumn = null;

const hasRayonColumn = async () => {
        if (poiHasRayonColumn !== null) return poiHasRayonColumn;
        const result = await pool.query(
                `SELECT 1
                 FROM information_schema.columns
                 WHERE table_schema = 'public'
                     AND table_name = 'poi'
                     AND column_name = 'rayon'
                 LIMIT 1`
        );
        poiHasRayonColumn = result.rows.length > 0;
        return poiHasRayonColumn;
};

/**
 * Récupérer tous les POI
 */
export const getPOIs = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM poi ORDER BY nom ASC');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getPOIs:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération des POI' });
    }
};

/**
 * Récupérer l'historique des POI
 */
export const getPOIHistory = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM poi_historique ORDER BY created_at DESC LIMIT 100');
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getPOIHistory:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la récupération de l\'historique' });
    }
};

/**
 * Créer un nouveau POI
 */
export const createPOI = async (req, res) => {
    try {
        const { nom, groupe, type, lat, lng, adresse, rayon } = req.body;
        const canSaveRayon = await hasRayonColumn();
        const result = canSaveRayon
            ? await pool.query(
                'INSERT INTO poi (nom, groupe, type, lat, lng, adresse, rayon) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [nom, groupe, type || 'Point', lat, lng, adresse, rayon]
            )
            : await pool.query(
                'INSERT INTO poi (nom, groupe, type, lat, lng, adresse) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [nom, groupe, type || 'Point', lat, lng, adresse]
            );

        const newPoi = result.rows[0];

        // Log action
        await pool.query(
            'INSERT INTO poi_historique (poi_id, poi_nom, action, details) VALUES ($1, $2, $3, $4)',
            [newPoi.id, newPoi.nom, 'CREATE', `Nouveau POI créé : ${newPoi.nom} (${newPoi.groupe})`]
        );

        res.status(201).json({ success: true, data: newPoi });
    } catch (error) {
        console.error('Error createPOI:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la création du POI' });
    }
};

/**
 * Mettre à jour un POI existant
 */
export const updatePOI = async (req, res) => {
    try {
        const { id } = req.params;
        const { nom, groupe, type, lat, lng, adresse, rayon } = req.body;
        const canSaveRayon = await hasRayonColumn();

        // Get old data for comparison
        const oldDataResult = await pool.query('SELECT * FROM poi WHERE id = $1', [id]);
        if (oldDataResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'POI non trouvé' });
        }
        const oldPoi = oldDataResult.rows[0];

        const result = canSaveRayon
            ? await pool.query(
                'UPDATE poi SET nom = $1, groupe = $2, type = $3, lat = $4, lng = $5, adresse = $6, rayon = $7 WHERE id = $8 RETURNING *',
                [nom, groupe, type, lat, lng, adresse, rayon, id]
            )
            : await pool.query(
                'UPDATE poi SET nom = $1, groupe = $2, type = $3, lat = $4, lng = $5, adresse = $6 WHERE id = $7 RETURNING *',
                [nom, groupe, type, lat, lng, adresse, id]
            );

        const updatedPoi = result.rows[0];

        // Detect changes
        let changes = [];
        if (oldPoi.nom !== updatedPoi.nom) changes.push(`Nom: ${oldPoi.nom} -> ${updatedPoi.nom}`);
        if (oldPoi.groupe !== updatedPoi.groupe) changes.push(`Groupe: ${oldPoi.groupe} -> ${updatedPoi.groupe}`);
        if (oldPoi.adresse !== updatedPoi.adresse) changes.push(`Adresse modifiée`);
        if (oldPoi.lat !== updatedPoi.lat || oldPoi.lng !== updatedPoi.lng) {
            changes.push(`Coords: (${oldPoi.lat}, ${oldPoi.lng}) -> (${updatedPoi.lat}, ${updatedPoi.lng})`);
        }
        if (canSaveRayon && oldPoi.rayon !== updatedPoi.rayon) {
            changes.push(`Rayon: ${oldPoi.rayon ?? '-'} -> ${updatedPoi.rayon ?? '-'}`);
        }

        // Log action
        await pool.query(
            'INSERT INTO poi_historique (poi_id, poi_nom, action, details) VALUES ($1, $2, $3, $4)',
            [id, updatedPoi.nom, 'UPDATE', changes.length > 0 ? changes.join(', ') : 'Modification générale']
        );

        res.json({ success: true, data: updatedPoi });
    } catch (error) {
        console.error('Error updatePOI:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour du POI' });
    }
};

/**
 * Supprimer un POI
 */
export const deletePOI = async (req, res) => {
    try {
        const { id } = req.params;

        // Get name before delete
        const poiResult = await pool.query('SELECT nom FROM poi WHERE id = $1', [id]);
        if (poiResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'POI non trouvé' });
        }
        const poiNom = poiResult.rows[0].nom;

        const result = await pool.query('DELETE FROM poi WHERE id = $1 RETURNING id', [id]);

        // Log action
        await pool.query(
            'INSERT INTO poi_historique (poi_id, poi_nom, action, details) VALUES ($1, $2, $3, $4)',
            [id, poiNom, 'DELETE', `POI supprimé : ${poiNom}`]
        );

        res.json({ success: true, message: 'POI supprimé avec succès' });
    } catch (error) {
        console.error('Error deletePOI:', error);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression du POI' });
    }
};
