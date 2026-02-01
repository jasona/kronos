import 'dotenv/config';
import { PrismaClient } from '@prisma/client/index';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';

const databaseUrl = process.env.DATABASE_URL || 'file:./dev.db';
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
	// Check if admin user already exists
	const existingAdmin = await prisma.user.findUnique({
		where: { username: 'admin' }
	});

	if (existingAdmin) {
		console.log('Admin user already exists, skipping user creation.');
	} else {
		// Create default admin user
		const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
		const passwordHash = await argon2.hash(defaultPassword);
		const apiKey = randomBytes(32).toString('hex');

		await prisma.user.create({
			data: {
				username: 'admin',
				passwordHash,
				apiKey
			}
		});

		console.log('Created admin user:');
		console.log(`  Username: admin`);
		console.log(`  Password: ${defaultPassword}`);
		console.log(`  API Key: ${apiKey}`);
		console.log('\nPlease change the default password after first login!');
	}

	// Create default settings (always run, upsert handles duplicates)
	const defaultSettings = [
		{ key: 'log_retention_days', value: JSON.stringify(30) },
		{ key: 'log_retention_runs', value: JSON.stringify(100) },
		{ key: 'timezone', value: JSON.stringify('UTC') }
	];

	for (const setting of defaultSettings) {
		await prisma.settings.upsert({
			where: { key: setting.key },
			update: {},
			create: setting
		});
	}

	console.log('Created default settings.');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
