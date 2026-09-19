import { Router } from 'express';
import { ErrorGroup } from '../models/ErrorGroup';
import { ErrorEvent } from '../models/ErrorEvent';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// GET /api/projects/:projectId/errors - list error groups
router.get('/projects/:projectId/errors', async (req, res) => {
  const { status, level, limit = 50, offset = 0 } = req.query;
  
  const where: any = { projectId: req.params.projectId };
  
  if (status) where.status = status;
  if (level) where.level = level;

  const groups = await ErrorGroup.findAll({
    where,
    order: [['lastSeen', 'DESC']],
    limit: parseInt(limit as string),
    offset: parseInt(offset as string),
  });

  res.json(groups);
});

// GET /api/errors/:groupId - get single group with recent events
router.get('/errors/:groupId', async (req, res) => {
  const group = await ErrorGroup.findByPk(req.params.groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Not found' });
  }

  const events = await ErrorEvent.findAll({
    where: { groupId: req.params.groupId },
    order: [['timestamp', 'DESC']],
    limit: 20,
  });

  res.json({ group, events });
});

// POST /api/errors/:groupId/resolve - mark as resolved
router.post('/errors/:groupId/resolve', async (req, res) => {
  const group = await ErrorGroup.findByPk(req.params.groupId);
  
  if (!group) {
    return res.status(404).json({ error: 'Not found' });
  }

  await group.update({ status: 'resolved' });
  res.json({ success: true, status: 'resolved' });
});

export default router;