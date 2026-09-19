import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { ProjectModel } from '../models/Project';

const router = Router();

router.use(requireAuth);

// GET /api/projects
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const projects = await ProjectModel.findByOwner(req.user!.id);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/projects
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name required' });
    }

    const project = await ProjectModel.create({
      name,
      apiKey: uuidv4(),
      ownerId: req.user!.id,
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    
    if (!project || project.owner_id !== req.user!.id) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    
    if (!project || project.owner_id !== req.user!.id) {
      return res.status(404).json({ error: 'Not found' });
    }

    await ProjectModel.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;