import { eq, and } from 'drizzle-orm';

import * as schema from '../db/schema';

/**
 * Service to handle skill security scanning and installation
 */
export const SecurityService = {
    /**
     * Mock security scan for a skill
     */
    async scanSkill(skillData: any): Promise<'verified' | 'flagged'> {
        console.log(`Scanning skill: ${skillData.name}`);
        // Simulate scan delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Simple heuristic for mock: skills with 'malware' in description are flagged
        if (skillData.description?.toLowerCase().includes('malware')) {
            return 'flagged';
        }

        return 'verified';
    },

    /**
     * Install a skill for a user
     */
    async installSkill(db: any, userId: string, skillData: any): Promise<schema.InstalledSkill> {
        const scanResult = await this.scanSkill(skillData);
        const id = crypto.randomUUID();

        const newSkill: schema.NewInstalledSkill = {
            id,
            userId,
            skillId: skillData.id,
            name: skillData.name,
            version: skillData.version || '1.0.0',
            author: skillData.author,
            description: skillData.description,
            category: skillData.category,
            source: 'clawhub',
            config: JSON.stringify(skillData.defaultConfig || {}),
            isEnabled: 1,
            securityStatus: scanResult,
            installDate: new Date().toISOString()
        };

        try {
            await db.insert(schema.installedSkills).values(newSkill);

            // Log activity
            await db.insert(schema.activities).values({
                id: crypto.randomUUID(),
                type: 'agent_updated',
                userId,
                content: `Installed skill: ${skillData.name} (${scanResult})`,
                timestamp: new Date().toISOString(),
            });

            // Fetch the inserted record to ensure compatibility across all D1/Drizzle versions
            const [inserted] = await db
                .select()
                .from(schema.installedSkills)
                .where(eq(schema.installedSkills.id, id));

            return inserted;
        } catch (error) {
            console.error('Database error during skill installation:', error);
            throw error;
        }
    },

    /**
     * Uninstall a skill
     */
    async uninstallSkill(db: any, userId: string, skillId: string): Promise<boolean> {
        const existing = await db
            .select()
            .from(schema.installedSkills)
            .where(and(
                eq(schema.installedSkills.userId, userId),
                eq(schema.installedSkills.id, skillId)
            ))
            .get();

        if (!existing) return false;

        await db
            .delete(schema.installedSkills)
            .where(and(
                eq(schema.installedSkills.userId, userId),
                eq(schema.installedSkills.id, skillId)
            ));

        await db.insert(schema.activities).values({
            id: crypto.randomUUID(),
            type: 'agent_updated',
            userId,
            content: `Uninstalled skill: ${existing.name}`,
            timestamp: new Date().toISOString(),
        });

        return true;
    }
};
