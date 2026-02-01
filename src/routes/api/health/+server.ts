import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { scheduler } from '$lib/server/scheduler';

// GET /api/health - Health check endpoint
export const GET: RequestHandler = async () => {
	const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

	// Check database
	try {
		await db.user.count();
		checks.database = { status: 'ok' };
	} catch (err) {
		checks.database = {
			status: 'error',
			message: err instanceof Error ? err.message : 'Database connection failed'
		};
	}

	// Check scheduler
	const schedulerStatus = scheduler.getStatus();
	checks.scheduler = {
		status: schedulerStatus.running ? 'ok' : 'error',
		message: schedulerStatus.running
			? `Running with ${schedulerStatus.jobCount} jobs`
			: 'Scheduler not running'
	};

	// Determine overall health
	const isHealthy = Object.values(checks).every((check) => check.status === 'ok');

	return json(
		{
			status: isHealthy ? 'healthy' : 'unhealthy',
			timestamp: new Date().toISOString(),
			checks
		},
		{ status: isHealthy ? 200 : 503 }
	);
};
