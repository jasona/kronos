import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { generateApiKey } from '$lib/server/auth';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await db.user.findUnique({
		where: { id: locals.user!.id },
		select: { apiKey: true }
	});

	return {
		hasApiKey: !!user?.apiKey,
		// Only show masked version of API key
		apiKeyPreview: user?.apiKey ? `${user.apiKey.slice(0, 8)}...${user.apiKey.slice(-4)}` : null
	};
};

export const actions: Actions = {
	generate: async ({ locals }) => {
		const newApiKey = generateApiKey();

		await db.user.update({
			where: { id: locals.user!.id },
			data: { apiKey: newApiKey }
		});

		return {
			success: true,
			apiKey: newApiKey,
			message: 'API key generated successfully. Copy it now - it will not be shown again.'
		};
	},

	revoke: async ({ locals }) => {
		await db.user.update({
			where: { id: locals.user!.id },
			data: { apiKey: null }
		});

		return {
			success: true,
			message: 'API key revoked successfully.'
		};
	}
};
