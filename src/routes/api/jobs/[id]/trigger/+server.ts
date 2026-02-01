import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { triggerJob } from '$lib/server/executor';

// POST /api/jobs/[id]/trigger - Manually trigger a job
export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const result = await triggerJob(params.id);

	if ('error' in result) {
		error(400, result.error);
	}

	return json({
		message: 'Job triggered successfully',
		executionId: result.executionId
	});
};
