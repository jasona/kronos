import type { Handle } from '@sveltejs/kit';
import { getSession, getSessionCookieName, validateApiKey } from '$lib/server/auth';
import { db } from '$lib/server/db';

export const handle: Handle = async ({ event, resolve }) => {
	// Try to get user from session cookie
	const sessionId = event.cookies.get(getSessionCookieName());
	if (sessionId) {
		const session = getSession(sessionId);
		if (session) {
			const user = await db.user.findUnique({
				where: { id: session.userId },
				select: { id: true, username: true }
			});
			if (user) {
				event.locals.user = user;
				event.locals.sessionId = session.id;
			}
		}
	}

	// Try to get user from API key header (for API routes)
	if (!event.locals.user) {
		const authHeader = event.request.headers.get('Authorization');
		if (authHeader?.startsWith('Bearer ')) {
			const apiKey = authHeader.slice(7);
			const user = await validateApiKey(apiKey);
			if (user) {
				event.locals.user = { id: user.id, username: user.username };
				event.locals.isApiKey = true;
			}
		}
	}

	return resolve(event);
};
