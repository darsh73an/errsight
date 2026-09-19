import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { ProjectModel } from '../models/Project';

export interface AuthenticatedRequest extends Request {
  user?: { id: string; email: string };
  project?: { id: string; ownerId: string };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as { id: string; email: string };
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authenticates ingestion requests via project API key (header: x-api-key).
 * Used on the public ingestion endpoint instead of JWT auth.
 */
export async function requireApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  const project = await ProjectModel.findByApiKey(apiKey);
  if (!project) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  req.project = { id: project.id, ownerId: project.owner_id };
  next();
}

/**
 * Ensures the authenticated user owns the :projectId route param.
 * Must run after requireAuth.
 */
export async function requireProjectOwnership(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId) return res.status(400).json({ error: 'Missing project id' });

  const project = await ProjectModel.findById(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.owner_id !== req.user?.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  (req as any).loadedProject = project;
  next();
}
