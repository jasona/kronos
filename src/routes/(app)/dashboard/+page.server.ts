import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	const now = new Date();
	const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

	// Get total jobs count
	const totalJobs = await db.job.count();

	// Get running executions
	const runningJobs = await db.execution.count({
		where: { status: 'running' }
	});

	// Get executions in the last 24 hours
	const recentExecutions = await db.execution.findMany({
		where: {
			startedAt: { gte: yesterday }
		},
		select: { status: true }
	});

	const successCount = recentExecutions.filter((e) => e.status === 'success').length;
	const failedCount = recentExecutions.filter((e) => e.status === 'failed').length;
	const total = recentExecutions.length;

	const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

	return {
		stats: {
			totalJobs,
			successRate,
			runningJobs,
			failedJobs: failedCount
		}
	};
};
