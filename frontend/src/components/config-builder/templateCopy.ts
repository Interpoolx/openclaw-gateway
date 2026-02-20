import { ConfigTemplate } from '../../lib/api';

interface TemplateDetailCopy {
  short: string;
  long: string;
  idealFor: string[];
  includes: string[];
}

const TEMPLATE_COPY: Record<string, TemplateDetailCopy> = {
  'openclaw-starter': {
    short: 'Fast personal-assistant baseline with practical defaults and minimal setup overhead.',
    long: 'A clean starter setup for teams that want to launch quickly. It keeps configuration simple while still providing reliable defaults for model, tools, and channel wiring.',
    idealFor: ['First-time OpenClaw setup', 'Single-agent personal workflows', 'Quick proof-of-concept launches'],
    includes: ['Pre-wired Telegram channel', 'Balanced OpenAI default model', 'Lightweight tool permissions'],
  },
  'customer-support-rag': {
    short: 'Support-first template with memory enabled for consistent, context-aware customer replies.',
    long: 'Designed for support teams that need reliable FAQ handling, continuity across conversations, and smoother escalation readiness. The baseline keeps response quality stable while supporting long-running context.',
    idealFor: ['Customer help desks', 'FAQ-heavy operations', 'Support queues with repeat questions'],
    includes: ['Memory-ready configuration', 'Support-oriented defaults', 'Provider flexibility for quality/cost tuning'],
  },
  'developer-box': {
    short: 'Engineering-focused setup with safer command defaults, verbose logs, and coding tools enabled.',
    long: 'Built for developer productivity. This template is tuned for code-heavy workflows where observability, tool access, and controlled execution matter.',
    idealFor: ['Internal developer copilots', 'Code review and debugging support', 'Rapid implementation workflows'],
    includes: ['Read/write/edit/exec toolset', 'Verbose logging defaults', 'Safety flags for command execution'],
  },
  'content-creator': {
    short: 'Content production workflow tuned for drafting, iteration, and channel-friendly output.',
    long: 'A practical content pipeline template that balances speed and quality for repeat publishing. It supports drafting, rewrites, and message tone consistency.',
    idealFor: ['Marketing content teams', 'Social post generation', 'Editorial workflow acceleration'],
    includes: ['Content-first prompt defaults', 'Provider options for style/quality control', 'Reusable channel setup'],
  },
  'telegram-community-manager': {
    short: 'Community moderation and engagement baseline optimized for ongoing Telegram interactions.',
    long: 'Purpose-built for community-led teams that need moderation consistency, onboarding guidance, and scalable response patterns across recurring member conversations.',
    idealFor: ['Community support channels', 'Founder-led Telegram groups', 'Moderation + onboarding workflows'],
    includes: ['Telegram-focused channel setup', 'Moderation-ready prompt direction', 'Context continuity defaults'],
  },
  'research-briefing-bot': {
    short: 'Research workflow template for scan, synthesis, and concise briefing-style outputs.',
    long: 'Great for teams that need structured insights quickly. It is tuned for collecting information, synthesizing findings, and returning clear briefings with fewer manual passes.',
    idealFor: ['Market and competitor analysis', 'Strategy and planning research', 'Weekly insight summaries'],
    includes: ['Research-oriented defaults', 'Fallback-capable model strategy', 'Briefing-friendly response structure'],
  },
  'sales-qualifier': {
    short: 'Lead intake template that captures intent and routes conversations toward conversion steps.',
    long: 'Built for inbound sales conversations where qualification speed matters. It helps standardize discovery questions and move prospects toward the right next action.',
    idealFor: ['Lead qualification workflows', 'Sales triage channels', 'Inbound conversion funnels'],
    includes: ['Telegram + WhatsApp channel defaults', 'Sales qualification framing', 'Action-driven conversation flow'],
  },
  'founder-exec-assistant': {
    short: 'Executive assistant setup for prioritization, concise updates, and decision support.',
    long: 'A decision-support template for founders and operators who need concise responses, clearer next actions, and structured follow-up assistance.',
    idealFor: ['Daily executive planning', 'Priority management', 'Decision support and follow-up tracking'],
    includes: ['Personal assistant tone defaults', 'High-signal response style', 'Memory-enabled planning support'],
  },
  'local-ollama-low-cost': {
    short: 'Cost-efficient local-first setup using Ollama to avoid recurring cloud model spend.',
    long: 'Optimized for teams that want dependable local execution with predictable cost. Keeps setup straightforward while enabling practical day-to-day assistant workflows.',
    idealFor: ['Budget-conscious deployments', 'Self-hosted internal assistants', 'Low-cost experimentation'],
    includes: ['Ollama provider defaults', 'Local endpoint configuration', 'No cloud dependency requirement'],
  },
  'privacy-first-local': {
    short: 'Privacy-first local template with zero cloud fallback and data residency control.',
    long: 'Designed for teams with strict privacy requirements. This configuration avoids cloud providers and keeps processing local for stronger data control.',
    idealFor: ['Privacy-sensitive workflows', 'Internal policy-constrained deployments', 'Local-only regulated environments'],
    includes: ['Cloud-free model strategy', 'Local execution baseline', 'Privacy-oriented defaults'],
  },
  'ecommerce-helper': {
    short: 'E-commerce support baseline for product questions, order guidance, and policy replies.',
    long: 'Purpose-built for storefront operations where quick, clear customer assistance drives conversion and retention. It keeps messaging practical across common support scenarios.',
    idealFor: ['Storefront support teams', 'Order and policy Q&A', 'Pre-sale and post-sale messaging'],
    includes: ['WhatsApp-friendly support setup', 'Commerce-oriented response prompts', 'Memory support for recurring interactions'],
  },
  'multi-model-fallback': {
    short: 'Resilience-focused template with primary + fallback model chain for higher uptime.',
    long: 'Use this when reliability matters most. It provides a baseline strategy for handling provider limits or outages while keeping user experience consistent.',
    idealFor: ['High-availability assistants', 'Traffic spike handling', 'Reliability-focused customer experiences'],
    includes: ['Configured fallback model chain', 'Failover-friendly defaults', 'Stable support workflow baseline'],
  },
  'claude-assistant': {
    short: 'Anthropic-first support assistant tuned for nuanced, high-quality conversation output.',
    long: 'A focused baseline for teams that prefer Claude-class reasoning and writing quality. Ideal when response clarity and tone consistency are top priorities.',
    idealFor: ['High-quality support responses', 'Nuanced conversational assistants', 'Anthropic-first deployments'],
    includes: ['Anthropic provider defaults', 'Support-ready prompt baseline', 'Simple deployment footprint'],
  },
  'whatsapp-business-bot': {
    short: 'WhatsApp-centric sales and intake template for customer-facing business messaging.',
    long: 'Designed for teams operating primarily over WhatsApp, with defaults that support intake, qualification, and transactional follow-up flows.',
    idealFor: ['WhatsApp lead intake', 'Business messaging operations', 'Sales-assisted chat workflows'],
    includes: ['WhatsApp-first channel configuration', 'Sales-oriented conversation framing', 'Quick-launch messaging defaults'],
  },
};

function titleCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function readStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // No-op: fall back to comma-split below.
    }

    if (trimmed.includes(',')) {
      return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return [trimmed];
  }

  return [];
}

function joinNatural(values: string[]) {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

export function getTemplateCopy(template: ConfigTemplate): TemplateDetailCopy {
  const templateSlug = typeof template.slug === 'string' ? template.slug : '';
  const channels = readStringList((template as unknown as Record<string, unknown>).channels);
  const providers = readStringList((template as unknown as Record<string, unknown>).providers);
  const tags = readStringList((template as unknown as Record<string, unknown>).tags).slice(0, 3).map(titleCase);
  const goal = typeof template.goal === 'string' ? template.goal : 'general';

  const fromMap = TEMPLATE_COPY[templateSlug];
  if (fromMap) {
    return {
      short: fromMap.short || `${titleCase(goal)} workflow template with practical defaults.`,
      long: fromMap.long || `${titleCase(goal)} template with guided setup and reliable defaults.`,
      idealFor: Array.isArray(fromMap.idealFor) ? fromMap.idealFor : [],
      includes: Array.isArray(fromMap.includes) ? fromMap.includes : [],
    };
  }

  const channelsLabel = joinNatural(channels.map(titleCase));
  const providersLabel = joinNatural(providers.map(titleCase));

  return {
    short: `${titleCase(goal)} workflow for ${channelsLabel || 'chat channels'} using ${providersLabel || 'supported providers'}.`,
    long: `${titleCase(goal)} template built for teams that want a reliable baseline and fast customization in the builder.`,
    idealFor: [
      `${titleCase(goal)}-oriented assistant launches`,
      `Teams delivering through ${channelsLabel || 'chat channels'}`,
      'Fast setup with guided customization',
    ],
    includes: [
      `Provider strategy: ${providersLabel || 'multi-provider ready'}`,
      `Primary channels: ${channelsLabel || 'channel-agnostic baseline'}`,
      tags.length > 0 ? `Focus areas: ${joinNatural(tags)}` : 'Config builder-ready defaults',
    ],
  };
}
