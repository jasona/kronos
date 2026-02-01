import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	const job = await db.job.findUnique({
		where: { id: params.id },
		include: {
			executions: {
				take: 10,
				orderBy: { startedAt: 'desc' },
				select: {
					id: true,
					status: true,
					startedAt: true,
					finishedAt: true,
					trigger: true,
					exitCode: true
				}
			}
		}
	});

	if (!job) {
		error(404, 'Job not found');
	}

	return {
		job: {
			...job,
			tags: JSON.parse(job.tags) as string[],
			retryPolicy: JSON.parse(job.retryPolicy),
			envVars: JSON.parse(job.envVars),
			config: JSON.parse(job.config)
		}
	};
};

export const actions: Actions = {
	delete: async ({ params }) => {
		await db.job.delete({ where: { id: params.id } });
		redirect(302, '/jobs');
	},

	toggleStatus: async ({ params }) => {
		const job = await db.job.findUnique({ where: { id: params.id } });
		if (!job) {
			return fail(404, { error: 'Job not found' });
		}

		const newStatus = job.status === 'active' ? 'paused' : 'active';
		await db.job.update({
			where: { id: params.id },
			data: { status: newStatus }
		});

		return { success: true };
	}
};
