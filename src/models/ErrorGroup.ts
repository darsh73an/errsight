import { query, queryOne } from '../config/database';

export interface ErrorGroup {
  id: string;
  project_id: string;
  fingerprint: string;
  title: string;
  type: string | null;
  level: string;
  status: 'unresolved' | 'resolved' | 'ignored';
  event_count: number;
  first_seen: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

export const ErrorGroupModel = {
  async findByFingerprint(projectId: string, fingerprint: string): Promise<ErrorGroup | null> {
    return queryOne<ErrorGroup>(
      `SELECT * FROM error_groups WHERE project_id = $1 AND fingerprint = $2`,
      [projectId, fingerprint]
    );
  },

  async create(data: {
    projectId: string;
    fingerprint: string;
    title: string;
    type?: string;
    level: string;
  }): Promise<ErrorGroup> {
    return queryOne<ErrorGroup>(
      `INSERT INTO error_groups (project_id, fingerprint, title, type, level, event_count)
       VALUES ($1, $2, $3, $4, $5, 1)
       RETURNING *`,
      [data.projectId, data.fingerprint, data.title, data.type ?? null, data.level]
    ) as Promise<ErrorGroup>;
  },

  async incrementAndTouch(id: string): Promise<ErrorGroup> {
    return queryOne<ErrorGroup>(
      `UPDATE error_groups
       SET event_count = event_count + 1, last_seen = now(), updated_at = now(),
           status = CASE WHEN status = 'resolved' THEN 'unresolved' ELSE status END
       WHERE id = $1
       RETURNING *`,
      [id]
    ) as Promise<ErrorGroup>;
  },

  async listByProject(
    projectId: string,
    opts: { status?: string; limit: number; offset: number }
  ): Promise<ErrorGroup[]> {
    const params: any[] = [projectId];
    let statusClause = '';
    if (opts.status) {
      params.push(opts.status);
      statusClause = `AND status = $${params.length}`;
    }
    params.push(opts.limit, opts.offset);
    return query<ErrorGroup>(
      `SELECT * FROM error_groups
       WHERE project_id = $1 ${statusClause}
       ORDER BY last_seen DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
  },

  async countByProject(projectId: string, status?: string): Promise<number> {
    const params: any[] = [projectId];
    let statusClause = '';
    if (status) {
      params.push(status);
      statusClause = `AND status = $${params.length}`;
    }
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM error_groups WHERE project_id = $1 ${statusClause}`,
      params
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  },

  async findById(id: string): Promise<ErrorGroup | null> {
    return queryOne<ErrorGroup>(`SELECT * FROM error_groups WHERE id = $1`, [id]);
  },

  async setStatus(id: string, status: 'unresolved' | 'resolved' | 'ignored'): Promise<ErrorGroup | null> {
    return queryOne<ErrorGroup>(
      `UPDATE error_groups SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
      [id, status]
    );
  },
};
