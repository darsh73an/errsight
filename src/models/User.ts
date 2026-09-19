import { query, queryOne } from '../config/database';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export const UserModel = {
  async create(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    return queryOne<User>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.email, data.passwordHash, data.name]
    ) as Promise<User>;
  },

  async findByEmail(email: string): Promise<User | null> {
    return queryOne<User>(`SELECT * FROM users WHERE email = $1`, [email]);
  },

  async findById(id: string): Promise<User | null> {
    return queryOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
  },
};
