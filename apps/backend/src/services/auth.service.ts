import bcrypt from 'bcryptjs';
import { query } from '../db/client.js';
import { logger } from '../utils/logger.js';

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  display_name: string;
  avatar_url?: string;
  preferences: Record<string, unknown>;
  contribution_count: number;
}

export class AuthService {
  async register(input: {
    email: string;
    password: string;
    username: string;
    displayName: string;
  }): Promise<Omit<UserRow, 'password_hash'>> {
    // Check existing
    const existing = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [input.email.toLowerCase(), input.username]
    );
    if (existing.rows.length > 0) {
      throw new Error('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const result = await query<UserRow>(
      `INSERT INTO users (email, username, password_hash, display_name, role, status)
       VALUES ($1, $2, $3, $4, 'viewer', 'active')
       RETURNING id, email, username, role, status, display_name, avatar_url, preferences, contribution_count`,
      [input.email.toLowerCase(), input.username, passwordHash, input.displayName]
    );

    logger.info({ email: input.email }, 'New user registered');
    return result.rows[0];
  }

  async login(email: string, password: string): Promise<Omit<UserRow, 'password_hash'> | null> {
    const result = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1 AND status = $2',
      [email.toLowerCase(), 'active']
    );

    const user = result.rows[0];
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return null;

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const { password_hash, ...safeUser } = user;
    return safeUser;
  }

  async findById(id: string): Promise<Omit<UserRow, 'password_hash'> | null> {
    const result = await query<UserRow>(
      `SELECT id, email, username, role, status, display_name, avatar_url,
              preferences, contribution_count
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  formatUser(user: Omit<UserRow, 'password_hash'>) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      profile: {
        displayName: user.display_name,
        avatarUrl: user.avatar_url ?? null,
        contributionCount: user.contribution_count,
      },
      preferences: user.preferences ?? {},
    };
  }
}

export const authService = new AuthService();
