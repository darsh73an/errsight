import { Router } from 'express';
import { Project } from '../models/Project';
import { authMiddleware } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/projects - list user's projects
router.get('/', async (req, res) => {
  const projects = await Project.findAll({
    where: { ownerId: req.user.id },
    order: [['createdAt', 'DESC']],
  });
  res.json(projects);
});

// POST /api/projects - create new project
router.post('/', async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name required' });
  }

  const project = await Project.create({
    name,
    ownerId: req.user.id,
    apiKey: uuidv4(), // auto-generate API key
  });

  res.status(201).json(project);
});

// GET /api/projects/:id - get single project
router.get('/:id', async (req, res) => {
  const project = await Project.findOne({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  
  if (!project) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  const deleted = await Project.destroy({
    where: { id: req.params.id, ownerId: req.user.id },
  });
  
  if (!deleted) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({ success: true });
});

export default router;