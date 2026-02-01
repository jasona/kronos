import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { db } from './db';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}

// Session management
const SESSION_COOKIE_NAME = 'kronos_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

// In-memory session store (for MVP - in production, use Redis or DB)
const sessions = new Map<string, Session>();

export function createSession(userId: string): Session {
	const sessionId = randomBytes(32).toString('hex');
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + SESSION_DURATION_MS)
	};
	sessions.set(sessionId, session);
	return session;
}

export function getSession(sessionId: string): Session | null {
	const session = sessions.get(sessionId);
	if (!session) return null;

	if (new Date() > session.expiresAt) {
		sessions.delete(sessionId);
		return null;
	}

	return session;
}

export function deleteSession(sessionId: string): void {
	sessions.delete(sessionId);
}

export function getSessionCookieName(): string {
	return SESSION_COOKIE_NAME;
}

export function getSessionCookieOptions(expiresAt: Date) {
	return {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax' as const,
		expires: expiresAt
	};
}

// API key validation
export async function validateApiKey(apiKey: string) {
	if (!apiKey) return null;

	const user = await db.user.findUnique({
		where: { apiKey }
	});

	return user;
}

// Generate new API key
export function generateApiKey(): string {
	return randomBytes(32).toString('hex');
}

// User authentication
export async function authenticateUser(username: string, password: string) {
	const user = await db.user.findUnique({
		where: { username }
	});

	if (!user) return null;

	const isValid = await verifyPassword(user.passwordHash, password);
	if (!isValid) return null;

	return user;
}
