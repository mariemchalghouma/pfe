import express from 'express';
import { getCamions, getCamionTrajet } from '../controllers/camionsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getCamions);
router.get('/:camion/trajet', protect, getCamionTrajet);

export default router;
