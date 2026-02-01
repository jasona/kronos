import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scheduler } from '$lib/server/scheduler';

// GET /api/scheduler - Get scheduler status
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	const status = scheduler.getStatus();

	return json(status);
};

// POST /api/scheduler/start - Start the scheduler
export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		error(401, 'Unauthorized');
	}

	await scheduler.start();

	return json({
		message: 'Scheduler started',
		status: scheduler.getStatus()
	});
};
