import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { deleteSession, getSessionCookieName } from '$lib/server/auth';

export const actions: Actions = {
	default: async ({ cookies, locals }) => {
		if (locals.sessionId) {
			deleteSession(locals.sessionId);
		}

		cookies.delete(getSessionCookieName(), { path: '/' });

		redirect(302, '/auth/login');
	}
};
