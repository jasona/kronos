import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

// GET /api/executions/[id] - Get execution details with logs
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const execution = await db.execution.findUnique({
		where: { id: params.id },
		include: {
			job: {
				select: { id: true, name: true }
			},
			logs: {
				orderBy: { createdAt: 'asc' }
			}
		}
	});

	if (!execution) {
		error(404, 'Execution not found');
	}

	return json(execution);
};

// DELETE /api/executions/[id] - Delete an execution and its logs
export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const existing = await db.execution.findUnique({ where: { id: params.id } });
	if (!existing) {
		error(404, 'Execution not found');
	}

	await db.execution.delete({ where: { id: params.id } });

	return new Response(null, { status: 204 });
};
