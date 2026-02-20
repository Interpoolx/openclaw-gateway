export interface SeoMeta {
  title: string;
  description: string;
  keywords?: string;
  canonicalPath?: string;
  robots?: string;
  ogType?: 'website' | 'article' | 'product';
}

const SITE_NAME = 'Clawpute.com';
const SITE_URL = (import.meta as any).env?.VITE_SITE_URL || 'https://clawpute.com';

function absoluteUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }
  return new URL(path, SITE_URL).toString();
}

function ensureMetaByName(name: string): HTMLMetaElement {
  let tag = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', name);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureMetaByProperty(property: string): HTMLMetaElement {
  let tag = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('property', property);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureCanonicalLink(): HTMLLinkElement {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  return link;
}

function titleCase(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => titleCase(part))
    .join(' ');
}

export function applySeoMeta(meta: SeoMeta): void {
  if (typeof document === 'undefined') return;

  const {
    title,
    description,
    keywords = 'AI agent builder, OpenClaw config, Clawpute.com',
    robots = 'index,follow',
    canonicalPath = typeof window !== 'undefined' ? window.location.pathname : '/',
    ogType = 'website',
  } = meta;

  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const canonicalUrl = absoluteUrl(canonicalPath);

  document.title = fullTitle;

  ensureMetaByName('description').setAttribute('content', description);
  ensureMetaByName('keywords').setAttribute('content', keywords);
  ensureMetaByName('robots').setAttribute('content', robots);

  ensureMetaByProperty('og:title').setAttribute('content', fullTitle);
  ensureMetaByProperty('og:description').setAttribute('content', description);
  ensureMetaByProperty('og:type').setAttribute('content', ogType);
  ensureMetaByProperty('og:url').setAttribute('content', canonicalUrl);
  ensureMetaByProperty('og:site_name').setAttribute('content', SITE_NAME);

  ensureMetaByName('twitter:card').setAttribute('content', 'summary_large_image');
  ensureMetaByName('twitter:title').setAttribute('content', fullTitle);
  ensureMetaByName('twitter:description').setAttribute('content', description);

  ensureCanonicalLink().setAttribute('href', canonicalUrl);
}

function isWorkspacePath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length < 2) return false;
  const route = parts[1];
  return [
    'dashboard',
    'projects',
    'agents',
    'sessions',
    'command-center',
    'devlogs',
    'skills',
    'channels',
    'cron',
    'settings',
    'deck',
  ].includes(route);
}

export function getSeoMetaForPath(pathname: string, search: string = ''): SeoMeta {
  const searchParams = new URLSearchParams(search);

  if (pathname === '/') {
    return {
      title: 'Clawpute.com - AI Agent Command Center',
      description: 'Deploy and manage AI agent workspaces, templates, sessions, and project workflows from one control center.',
      canonicalPath: pathname,
    };
  }

  if (pathname.startsWith('/config-builder/templates/')) {
    const slug = pathname.split('/').pop() || 'template';
    const templateName = slugToTitle(slug);
    return {
      title: `${templateName} Template`,
      description: `Explore the ${templateName} template on Clawpute.com and launch it directly in the Config Builder.`,
      canonicalPath: pathname,
      ogType: 'product',
    };
  }

  if (pathname === '/config-builder') {
    const tab = searchParams.get('tab');
    const tabLabel = tab ? ` (${titleCase(tab)})` : '';
    return {
      title: `Config Builder${tabLabel}`,
      description: 'Build, preview, and export OpenClaw-ready AI agent configs with guided templates and validation.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/pricing') {
    return {
      title: 'Pricing',
      description: 'Compare Clawpute.com plans and choose the right tier for your AI agent operations.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/openclaw-cheatsheet') {
    return {
      title: 'OpenClaw Cheatsheet',
      description: 'Reference commands, setup tips, and operational shortcuts for OpenClaw environments.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/openclaw-configuration') {
    return {
      title: 'OpenClaw Configuration Guide',
      description: 'Configure OpenClaw integrations, runtime settings, and deployment options for production use.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/terms') {
    return {
      title: 'Terms of Service',
      description: 'Read the terms governing use of Clawpute.com services.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/privacy') {
    return {
      title: 'Privacy Policy',
      description: 'Learn how Clawpute.com handles data, privacy, and security controls.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/refunds') {
    return {
      title: 'Refund Policy',
      description: 'Review Clawpute.com billing and refund terms.',
      canonicalPath: pathname,
    };
  }

  if (pathname === '/login') {
    return {
      title: 'Login',
      description: 'Sign in to Clawpute.com and access your AI agent command center.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/onboarding') {
    return {
      title: 'Onboarding',
      description: 'Set up your Clawpute.com workspace and start launching AI agents quickly.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname.startsWith('/setup/')) {
    const platform = pathname.split('/').pop() || 'platform';
    return {
      title: `Setup ${slugToTitle(platform)}`,
      description: `Follow the ${slugToTitle(platform)} setup flow to connect your Clawpute.com deployment.`,
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/user/dashboard') {
    return {
      title: 'User Dashboard',
      description: 'Manage your personal Clawpute.com workspace activity and account preferences.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/installer') {
    return {
      title: 'Installer',
      description: 'Install and connect your Clawpute.com instance using the guided web installer.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/account') {
    return {
      title: 'Account',
      description: 'Manage account profile, authentication, and preferences for Clawpute.com.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (pathname === '/users' || pathname === '/hpanel' || pathname.startsWith('/direct-test')) {
    return {
      title: 'Admin Tools',
      description: 'Internal administration tools for Clawpute.com operations.',
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  if (isWorkspacePath(pathname)) {
    const parts = pathname.split('/').filter(Boolean);
    const section = parts[1] || 'workspace';
    return {
      title: `${slugToTitle(section)} Workspace`,
      description: `Clawpute.com workspace section for ${slugToTitle(section)} operations and management.`,
      canonicalPath: pathname,
      robots: 'noindex,nofollow',
    };
  }

  return {
    title: 'Clawpute.com',
    description: 'Clawpute.com AI agent management platform.',
    canonicalPath: pathname || '/',
  };
}
