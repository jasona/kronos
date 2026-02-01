import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ url }) => {
	const status = url.searchParams.get('status');
	const search = url.searchParams.get('search');
	const sortBy = url.searchParams.get('sort') || 'createdAt';
	const order = url.searchParams.get('order') || 'desc';

	const where: Record<string, unknown> = {};

	if (status && status !== 'all') {
		where.status = status;
	}

	if (search) {
		where.OR = [
			{ name: { contains: search } },
			{ description: { contains: search } }
		];
	}

	const jobs = await db.job.findMany({
		where,
		orderBy: { [sortBy]: order },
		include: {
			executions: {
				take: 1,
				orderBy: { startedAt: 'desc' },
				select: {
					id: true,
					status: true,
					startedAt: true,
					finishedAt: true
				}
			}
		}
	});

	// Transform jobs for the UI
	const jobsWithStats = jobs.map((job) => {
		const lastExecution = job.executions[0];
		return {
			id: job.id,
			name: job.name,
			description: job.description,
			schedule: job.schedule,
			type: job.type,
			status: job.status,
			tags: JSON.parse(job.tags) as string[],
			createdAt: job.createdAt,
			lastExecution: lastExecution
				? {
						id: lastExecution.id,
						status: lastExecution.status,
						startedAt: lastExecution.startedAt,
						finishedAt: lastExecution.finishedAt
					}
				: null
		};
	});

	return {
		jobs: jobsWithStats,
		filters: { status, search, sortBy, order }
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Job ID is required' });
		}

		await db.job.delete({ where: { id } });

		return { success: true };
	},

	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Job ID is required' });
		}

		const job = await db.job.findUnique({ where: { id } });
		if (!job) {
			return fail(404, { error: 'Job not found' });
		}

		const newStatus = job.status === 'active' ? 'paused' : 'active';
		await db.job.update({
			where: { id },
			data: { status: newStatus }
		});

		return { success: true };
	}
};
