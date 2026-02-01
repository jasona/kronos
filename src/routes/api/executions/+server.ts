import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

// GET /api/executions - List executions with optional filtering
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const jobId = url.searchParams.get('jobId');
	const status = url.searchParams.get('status');
	const limit = parseInt(url.searchParams.get('limit') || '50');
	const offset = parseInt(url.searchParams.get('offset') || '0');

	const where: Record<string, unknown> = {};

	if (jobId) {
		where.jobId = jobId;
	}

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
				job: {
					select: { id: true, name: true }
				}
			}
		}),
		db.execution.count({ where })
	]);

	return json({
		executions,
		pagination: {
			total,
			limit,
			offset,
			hasMore: offset + limit < total
		}
	});
};
