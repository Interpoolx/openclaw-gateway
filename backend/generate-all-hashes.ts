import { hashPassword } from './src/lib/crypto';

async function main() {
    const users = [
        { email: 'admin1$@clawpute.com', password: 'admin123##' },
        { email: 'manager@clawpute.com', password: 'manager123' },
        { email: 'demo@clawpute.com', password: 'user123' },
    ];

    for (const user of users) {
        const hash = await hashPassword(user.password);
        console.log(`${user.email}: ${hash}`);
    }
}

main().catch(console.error);
