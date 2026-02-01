import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { testNotification } from '$lib/server/notifications';
import { z } from 'zod';

const webhookSchema = z.object({
	name: z.string().min(1),
	type: z.literal('webhook'),
	url: z.string().url(),
	headers: z.string().optional(),
	events: z.array(z.string()).min(1),
	jobIds: z.array(z.string()).optional()
});

const emailSchema = z.object({
	name: z.string().min(1),
	type: z.literal('email'),
	to: z.string().min(1),
	subject: z.string().optional(),
	events: z.array(z.string()).min(1),
	jobIds: z.array(z.string()).optional()
});

export const load: PageServerLoad = async () => {
	const [notifications, jobs] = await Promise.all([
		db.notification.findMany({
			orderBy: { createdAt: 'desc' }
		}),
		db.job.findMany({
			select: { id: true, name: true },
			orderBy: { name: 'asc' }
		})
	]);

	return {
		notifications: notifications.map((n) => ({
			...n,
			config: JSON.parse(n.config),
			events: JSON.parse(n.events),
			jobIds: JSON.parse(n.jobIds)
		})),
		jobs
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const type = formData.get('type') as string;
		const name = formData.get('name') as string;
		const events = formData.getAll('events') as string[];
		const jobIds = formData.getAll('jobIds') as string[];

		let config: Record<string, unknown>;

		if (type === 'webhook') {
			const url = formData.get('url') as string;
			const headersStr = formData.get('headers') as string;

			const result = webhookSchema.safeParse({
				name,
				type,
				url,
				headers: headersStr,
				events,
				jobIds
			});

			if (!result.success) {
				return fail(400, { error: result.error.errors[0].message });
			}

			config = {
				url,
				headers: headersStr ? JSON.parse(headersStr) : undefined
			};
		} else if (type === 'email') {
			const to = formData.get('to') as string;
			const subject = formData.get('subject') as string;

			const result = emailSchema.safeParse({
				name,
				type,
				to,
				subject,
				events,
				jobIds
			});

			if (!result.success) {
				return fail(400, { error: result.error.errors[0].message });
			}

			config = {
				to: to.split(',').map((e) => e.trim()),
				subject: subject || undefined
			};
		} else {
			return fail(400, { error: 'Invalid notification type' });
		}

		await db.notification.create({
			data: {
				name,
				type,
				config: JSON.stringify(config),
				events: JSON.stringify(events),
				jobIds: JSON.stringify(jobIds.filter(Boolean)),
				enabled: true
			}
		});

		return { success: true };
	},

	delete: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		await db.notification.delete({ where: { id } });

		return { success: true };
	},

	toggle: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		const notification = await db.notification.findUnique({ where: { id } });
		if (!notification) {
			return fail(404, { error: 'Notification not found' });
		}

		await db.notification.update({
			where: { id },
			data: { enabled: !notification.enabled }
		});

		return { success: true };
	},

	test: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		const result = await testNotification(id);

		if (!result.success) {
			return fail(400, { error: result.error || 'Test failed' });
		}

		return { success: true, message: 'Test notification sent successfully' };
	}
};
