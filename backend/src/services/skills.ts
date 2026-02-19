import { eq, and } from 'drizzle-orm';
import { installedSkills } from '../db/schema';
import { v4 as uuid } from 'uuid';

// Define the full skill structure, including fields not in the DB
export interface SkillDefinition {
    id: string; // The "skillId" (e.g., "code-writer-pro")
    name: string;
    version: string;
    author: string;
    description: string;
    category: string;
    tags: string[];
    dependencies?: {
        env?: string[];
        bins?: string[];
        bg_process?: boolean;
    };
    instructions: string; // Markdown content
}

// Hardcoded library of default skills (acting as the "Marketplace" source)
export const DEFAULT_SKILLS: SkillDefinition[] = [
    {
        id: 'code-writer-pro',
        name: 'Code Writer Pro',
        version: '2.1.0',
        author: 'Antigravity',
        description: 'Advanced code generation with context awareness. Capable of refactoring entire files to support new features or fix bugs.',
        category: 'Coding',
        tags: ['coding', 'refactoring', 'typescript'],
        dependencies: {
            env: ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY'],
            bins: ['node', 'npm', 'git'],
        },
        instructions: `
# Code Writer Pro

This skill allows the agent to write and modify code in your project.

## Capabilities

- **Create New Files**: Can generate new source files with boilerplate.
- **Refactor Code**: Smartly analyzes dependencies and refactors code.
- **Fix Bugs**: Identifies syntax and logical errors.

## Usage

Ask the agent to "Create a new React component" or "Refactor this function to be async".

## Configuration

Ensure you have your LLM API keys set in the environment variables.
    `
    },
    {
        id: 'research-assistant',
        name: 'Research Assistant',
        version: '1.5.0',
        author: 'ResearchCorp',
        description: 'Autonomous web research and summarization. Can scrape websites, read PDFs, and synthesize information.',
        category: 'Productivity',
        tags: ['research', 'web-scraping', 'summary'],
        dependencies: {
            env: ['SERPAPI_KEY'],
            bins: ['python3'],
            bg_process: true
        },
        instructions: `
# Research Assistant

Automates the process of gathering information from the web.

## Features

1. **Deep Search**: Performs recursive searches to find rare info.
2. **Citation**: Auto-generates citations for all claims.
3. **Synthesis**: Compiles multiple sources into a single report.

## How to use

"Research the history of calculating machines" or "Find the latest trends in AI".
    `
    },
    {
        id: 'deployment-manager',
        name: 'Deployment Manager',
        version: '1.0.0',
        author: 'DevOps Inc',
        description: 'Automated deployment pipelines for AWS and Vercel. Handles build, test, and deploy cycles.',
        category: 'Tools',
        tags: ['devops', 'deployment', 'aws'],
        dependencies: {
            env: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'VERCEL_TOKEN'],
            bins: ['docker', 'terraform'],
        },
        instructions: `
# Deployment Manager

Manages your cloud infrastructure and deployments.

## Supported Platforms
- AWS (EC2, S3, Lambda)
- Vercel
- Netlify

## Commands

- "Deploy to staging"
- "Rollback last deployment"
- "Check build status"
    `
    },
    {
        id: 'ui-designer-v2',
        name: 'UI Designer V2',
        version: '2.2.1',
        author: 'DesignBot',
        description: 'Generates beautiful UI components and prototypes. Supports Tailwind CSS and various component libraries.',
        category: 'Creative',
        tags: ['design', 'ui', 'css', 'tailwind'],
        dependencies: {
            env: [],
            bins: [],
        },
        instructions: `
# UI Designer V2

Create stunning user interfaces with simple prompts.

## Features
- **Component Generation**: React, Vue, Svelte.
- **Design Systems**: Material UI, Tailwind UI, Shadcn.
- **Accessibility**: Ensures WCAG compliance.

## Example

"Design a login page with a dark theme"
    `
    },
    {
        id: 'security-auditor',
        name: 'Security Auditor',
        version: '1.1.0',
        author: 'SecOps Team',
        description: 'Scans code for vulnerabilities and secrets. Checks for common security issues like SQL injection and XSS.',
        category: 'Tools',
        tags: ['security', 'audit', 'safety'],
        dependencies: {
            env: [],
            bins: ['snyk', 'trivy'],
        },
        instructions: `
# Security Auditor

Protect your codebase from vulnerabilities.

## Scans
- **Static Analysis**: Code scanning.
- **Dependency Check**: Checks \`package.json\`.
- **Secret Detection**: Finds exposed API keys.

## Usage

"Audit my project for security issues."
    `
    }
];

export class SkillsService {
    /**
     * Get all installed skills for a user in a workspace.
     * Merges DB records with the static metadata (instructions, dependencies).
     */
    static async getInstalledSkills(db: any, userId: string, workspaceId?: string) {
        const conditions = [eq(installedSkills.userId, userId)];

        // Optional workspace filtering (if we want to scope skills to workspaces eventually)
        // For now, skills might be user-global or workspace-specific depending on requirements.
        // The table has workspaceId, so let's respect it if provided.
        if (workspaceId) {
            conditions.push(eq(installedSkills.workspaceId, workspaceId));
        }

        const installed = await db.select()
            .from(installedSkills)
            .where(and(...conditions));

        // Merge with static definition to get instructions and dependencies
        return installed.map((record: any) => {
            const def = DEFAULT_SKILLS.find(s => s.id === record.skillId);
            return {
                ...record,
                // Fields from definition that aren't in DB or overrides
                dependencies: def?.dependencies,
                instructions: def?.instructions,
                tags: def?.tags,
                // Fallbacks for display if DB record update lags behind definition
                description: record.description || def?.description,
                author: record.author || def?.author,
                version: record.version || def?.version,
            };
        });
    }

    /**
     * Get details for a specific installed skill
     */
    static async getInstalledSkill(db: any, id: string, userId: string) {
        const [record] = await db.select()
            .from(installedSkills)
            .where(and(eq(installedSkills.id, id), eq(installedSkills.userId, userId)));

        if (!record) return null;

        const def = DEFAULT_SKILLS.find(s => s.id === record.skillId);
        return {
            ...record,
            dependencies: def?.dependencies,
            instructions: def?.instructions,
            tags: def?.tags,
        };
    }

    /**
     * Install default skills for a user/workspace if they don't exist
     */
    static async installDefaultSkills(db: any, userId: string, workspaceId: string) {
        const now = new Date().toISOString();

        for (const skillDef of DEFAULT_SKILLS) {
            // Check if already installed
            const [existing] = await db.select()
                .from(installedSkills)
                .where(and(
                    eq(installedSkills.userId, userId),
                    eq(installedSkills.workspaceId, workspaceId),
                    eq(installedSkills.skillId, skillDef.id)
                ));

            if (!existing) {
                await db.insert(installedSkills).values({
                    id: uuid(),
                    workspaceId,
                    userId,
                    skillId: skillDef.id,
                    name: skillDef.name,
                    version: skillDef.version,
                    author: skillDef.author,
                    description: skillDef.description,
                    category: skillDef.category,
                    source: 'system-default',
                    config: '{}',
                    isEnabled: 1,
                    securityStatus: 'verified',
                    installDate: now,
                });
            }
        }
    }
}
