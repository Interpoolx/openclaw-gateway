export interface SeedConfigTemplate {
  id: string;
  slug: string;
  name: string;
  goal: string;
  channels: string[];
  providers: string[];
}

export const seedConfigTemplates: SeedConfigTemplate[] = [
  { id: 'tmpl-openclaw-starter', slug: 'openclaw-starter', name: 'OpenClaw Starter', goal: 'personal', channels: ['telegram'], providers: ['openai'] },
  { id: 'tmpl-customer-support-rag', slug: 'customer-support-rag', name: 'Customer Support (RAG-ready)', goal: 'support', channels: ['telegram'], providers: ['openai', 'anthropic'] },
  { id: 'tmpl-developer-box', slug: 'developer-box', name: 'Developer Box', goal: 'dev', channels: ['telegram'], providers: ['openai'] },
  { id: 'tmpl-content-creator', slug: 'content-creator', name: 'Content Creator', goal: 'content', channels: ['telegram'], providers: ['openai', 'anthropic'] },
  { id: 'tmpl-telegram-community-manager', slug: 'telegram-community-manager', name: 'Community Manager (Telegram)', goal: 'community', channels: ['telegram'], providers: ['openai', 'minimax'] },
  { id: 'tmpl-research-briefing-bot', slug: 'research-briefing-bot', name: 'Research & Briefing Bot', goal: 'research', channels: ['telegram'], providers: ['openai', 'anthropic', 'minimax'] },
  { id: 'tmpl-sales-qualifier', slug: 'sales-qualifier', name: 'Sales Qualifier / Lead Intake', goal: 'sales', channels: ['telegram', 'whatsapp'], providers: ['openai', 'minimax'] },
  { id: 'tmpl-founder-exec-assistant', slug: 'founder-exec-assistant', name: 'Founder / Exec Assistant', goal: 'personal', channels: ['telegram'], providers: ['openai', 'anthropic'] },
  { id: 'tmpl-local-ollama-low-cost', slug: 'local-ollama-low-cost', name: 'Low Cost / Local (Ollama)', goal: 'personal', channels: ['telegram'], providers: ['ollama'] },
  { id: 'tmpl-privacy-first-local', slug: 'privacy-first-local', name: 'Privacy-First Local', goal: 'personal', channels: ['telegram'], providers: ['ollama'] },
  { id: 'tmpl-ecommerce-helper', slug: 'ecommerce-helper', name: 'E-commerce Helper', goal: 'support', channels: ['whatsapp'], providers: ['openai', 'anthropic'] },
  { id: 'tmpl-multi-model-fallback', slug: 'multi-model-fallback', name: 'Multi-Model Fallback', goal: 'support', channels: ['telegram'], providers: ['openai', 'anthropic'] },
  { id: 'tmpl-claude-assistant', slug: 'claude-assistant', name: 'Claude Assistant', goal: 'support', channels: ['telegram'], providers: ['anthropic'] },
  { id: 'tmpl-whatsapp-business-bot', slug: 'whatsapp-business-bot', name: 'WhatsApp Business Bot', goal: 'sales', channels: ['whatsapp'], providers: ['openai'] },
];

