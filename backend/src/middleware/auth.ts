import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import * as schema from '../db/schema';

export function getDb(env: any) {
    return drizzle(env.DB, { schema });
}

export async function getUserFromToken(c: any): Promise<{ userId: string; isDemo: boolean } | null> {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.slice(7);
    const userId = token;

    const db = getDb(c.env);
    try {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId));
        if (!user) {
            // Fallback for demo users not yet in DB or if DB lookup fails
            return token.startsWith('demo-') ? { userId, isDemo: true } : { userId, isDemo: false };
        }
        return { userId: user.id, isDemo: !!user.isDemo };
    } catch (error) {
        console.error('Error fetching user from DB:', error);
        return token.startsWith('demo-') ? { userId, isDemo: true } : { userId, isDemo: false };
    }
}
