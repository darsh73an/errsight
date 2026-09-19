import { query, queryOne } from '../config/database';

export interface Project {
  id: string;
  name: string;
  api_key: string;
  owner_id: string;
  alert_email: string | null;
  slack_webhook_url: string | null;
  alert_threshold: number;
  created_at: string;
  updated_at: string;
}

export const ProjectModel = {
  async create(data: {
    name: string;
    apiKey: string;
    ownerId: string;
    alertEmail?: string;
  }): Promise<Project> {
    return queryOne<Project>(
      `INSERT INTO projects (name, api_key, owner_id, alert_email)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.apiKey, data.ownerId, data.alertEmail ?? null]
    ) as Promise<Project>;
  },

  async findByOwner(ownerId: string): Promise<Project[]> {
    return query<Project>(
      `SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId]
    );
  },

  async findById(id: string): Promise<Project | null> {
    return queryOne<Project>(`SELECT * FROM projects WHERE id = $1`, [id]);
  },

  async findByApiKey(apiKey: string): Promise<Project | null> {
    return queryOne<Project>(`SELECT * FROM projects WHERE api_key = $1`, [apiKey]);
  },

  async update(
    id: string,
    data: Partial<{
      name: string;
      alertEmail: string | null;
      slackWebhookUrl: string | null;
      alertThreshold: number;
    }>
  ): Promise<Project | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${i++}`);
      values.push(data.name);
    }
    if (data.alertEmail !== undefined) {
      fields.push(`alert_email = $${i++}`);
      values.push(data.alertEmail);
    }
    if (data.slackWebhookUrl !== undefined) {
      fields.push(`slack_webhook_url = $${i++}`);
      values.push(data.slackWebhookUrl);
    }
    if (data.alertThreshold !== undefined) {
      fields.push(`alert_threshold = $${i++}`);
      values.push(data.alertThreshold);
    }
    if (!fields.length) return this.findById(id);

    fields.push(`updated_at = now()`);
    values.push(id);

    return queryOne<Project>(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
  },

  async delete(id: string): Promise<void> {
    await query(`DELETE FROM projects WHERE id = $1`, [id]);
  },
};
