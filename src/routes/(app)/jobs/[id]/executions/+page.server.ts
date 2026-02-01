import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, url }) => {
	const job = await db.job.findUnique({
		where: { id: params.id },
		select: { id: true, name: true }
	});

	if (!job) {
		error(404, 'Job not found');
	}

	const status = url.searchParams.get('status');
	const page = parseInt(url.searchParams.get('page') || '1');
	const limit = 20;
	const offset = (page - 1) * limit;

	const where: Record<string, unknown> = {
		jobId: params.id
	};

	if (status && status !== 'all') {
		where.status = status;
	}

	const [executions, total] = await Promise.all([
		db.execution.findMany({
			where,
			orderBy: { startedAt: 'desc' },
			take: limit,
			skip: offset,
			include: {
				logs: {
					select: { id: true }
				}
			}
		}),
		db.execution.count({ where })
	]);

	const totalPages = Math.ceil(total / limit);

	return {
		job,
		executions: executions.map((e) => ({
			...e,
			hasLogs: e.logs.length > 0
		})),
		pagination: {
			page,
			totalPages,
			total
		},
		filters: { status }
	};
};
