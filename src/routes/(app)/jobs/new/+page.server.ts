import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { db } from '$lib/server/db';
import { jobSchema, validateJobConfig } from '$lib/utils/schemas';

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const data = {
			name: formData.get('name') as string,
			description: formData.get('description') as string || undefined,
			schedule: formData.get('schedule') as string,
			type: formData.get('type') as string,
			config: formData.get('config') as string,
			status: (formData.get('status') as string) || 'active',
			tags: JSON.parse((formData.get('tags') as string) || '[]'),
			timeout: parseInt((formData.get('timeout') as string) || '300000'),
			retryPolicy: JSON.parse((formData.get('retryPolicy') as string) || '{}'),
			envVars: JSON.parse((formData.get('envVars') as string) || '{}')
		};

		// Validate basic schema
		const result = jobSchema.safeParse(data);
		if (!result.success) {
			return fail(400, {
				error: result.error.errors[0].message,
				data
			});
		}

		// Validate config based on type
		try {
			validateJobConfig(data.type, data.config);
		} catch (e) {
			return fail(400, {
				error: e instanceof Error ? e.message : 'Invalid job configuration',
				data
			});
		}

		// Create job
		const job = await db.job.create({
			data: {
				name: data.name,
				description: data.description || null,
				schedule: data.schedule,
				type: data.type,
				config: data.config,
				status: data.status,
				tags: JSON.stringify(data.tags),
				timeout: data.timeout,
				retryPolicy: JSON.stringify(data.retryPolicy),
				envVars: JSON.stringify(data.envVars)
			}
		});

		redirect(302, `/jobs/${job.id}`);
	}
};
