import { query, queryOne } from '../config/database';

export interface ErrorEvent {
  id: string;
  error_group_id: string;
  project_id: string;
  message: string;
  stack_trace: string | null;
  level: string;
  environment: string | null;
  release: string | null;
  url: string | null;
  user_agent: string | null;
  context: Record<string, any>;
  tags: Record<string, any>;
  received_at: string;
}

export const ErrorEventModel = {
  async create(data: {
    errorGroupId: string;
    projectId: string;
    message: string;
    stackTrace?: string;
    level: string;
    environment?: string;
    release?: string;
    url?: string;
    userAgent?: string;
    context?: Record<string, any>;
    tags?: Record<string, any>;
  }): Promise<ErrorEvent> {
    return queryOne<ErrorEvent>(
      `INSERT INTO error_events
        (error_group_id, project_id, message, stack_trace, level, environment, release, url, user_agent, context, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.errorGroupId,
        data.projectId,
        data.message,
        data.stackTrace ?? null,
        data.level,
        data.environment ?? 'production',
        data.release ?? null,
        data.url ?? null,
        data.userAgent ?? null,
        JSON.stringify(data.context ?? {}),
        JSON.stringify(data.tags ?? {}),
      ]
    ) as Promise<ErrorEvent>;
  },

  async listByGroup(errorGroupId: string, limit = 50, offset = 0): Promise<ErrorEvent[]> {
    return query<ErrorEvent>(
      `SELECT * FROM error_events WHERE error_group_id = $1
       ORDER BY received_at DESC LIMIT $2 OFFSET $3`,
      [errorGroupId, limit, offset]
    );
  },

  async countLastHourByProject(projectId: string): Promise<number> {
    const rows = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM error_events
       WHERE project_id = $1 AND received_at > now() - interval '1 hour'`,
      [projectId]
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  },

  async dailyCounts(projectId: string, days = 14): Promise<{ day: string; count: number }[]> {
    const rows = await query<{ day: string; count: string }>(
      `SELECT to_char(date_trunc('day', received_at), 'YYYY-MM-DD') as day, COUNT(*)::text as count
       FROM error_events
       WHERE project_id = $1 AND received_at > now() - ($2 || ' days')::interval
       GROUP BY 1 ORDER BY 1 ASC`,
      [projectId, days]
    );
    return rows.map((r) => ({ day: r.day, count: parseInt(r.count, 10) }));
  },
};
