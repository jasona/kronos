import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import {
	authenticateUser,
	createSession,
	getSessionCookieName,
	getSessionCookieOptions
} from '$lib/server/auth';

const loginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect if already logged in
	if (locals.user) {
		redirect(302, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const data = {
			username: formData.get('username'),
			password: formData.get('password')
		};

		// Validate input
		const result = loginSchema.safeParse(data);
		if (!result.success) {
			return fail(400, {
				error: result.error.errors[0].message,
				username: data.username as string
			});
		}

		// Authenticate user
		const user = await authenticateUser(result.data.username, result.data.password);
		if (!user) {
			return fail(401, {
				error: 'Invalid username or password',
				username: result.data.username
			});
		}

		// Create session
		const session = createSession(user.id);

		// Set session cookie
		cookies.set(getSessionCookieName(), session.id, getSessionCookieOptions(session.expiresAt));

		redirect(302, '/dashboard');
	}
};
