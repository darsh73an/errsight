import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { ErrorGroupModel } from '../models/ErrorGroup';
import { ErrorEventModel } from '../models/ErrorEvent';

const router = Router();

router.use(requireAuth);

// GET /api/projects/:projectId/errors
router.get('/projects/:projectId/errors', async (req: AuthenticatedRequest, res) => {
  try {
    const { status, level, limit = 50, offset = 0 } = req.query;
    
    const groups = await ErrorGroupModel.findByProject(
      req.params.projectId,
      {
        status: status as string,
        level: level as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }
    );

    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/errors/:groupId
router.get('/errors/:groupId', async (req: AuthenticatedRequest, res) => {
  try {
    const group = await ErrorGroupModel.findById(req.params.groupId);
    
    if (!group) {
      return res.status(404).json({ error: 'Not found' });
    }

    const events = await ErrorEventModel.findByGroup(req.params.groupId, 20);

    res.json({ group, events });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/errors/:groupId/resolve
router.post('/errors/:groupId/resolve', async (req: AuthenticatedRequest, res) => {
  try {
    await ErrorGroupModel.updateStatus(req.params.groupId, 'resolved');
    res.json({ success: true, status: 'resolved' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;