import { Router } from 'express';
import { ingestError } from '../services/ingestion';

const router = Router();

// POST /api/ingest
// Receives error events from SDK
router.post('/', ingestError);

export default router;