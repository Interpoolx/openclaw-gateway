import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ConfigTemplate, getConfigTemplate, getConfigTemplates } from '../../lib/api';
import { useEffect } from 'react';
import { applySeoMeta } from '../../lib/seo';
import { getTemplateCopy, readStringList } from './templateCopy';

interface TemplateDetailPageProps {
  templateSlug: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTitle(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function slugToTitle(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => toTitle(part))
    .join(' ');
}

function normalizeTemplatePayload(payload: unknown, templateSlug: string): ConfigTemplate | null {
  if (!payload) return null;

  let candidate: unknown = payload;
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return null;
    }
  }
  if (Array.isArray(candidate) && candidate.length === 1) {
    candidate = candidate[0];
  }
  if (isRecord(candidate) && isRecord(candidate.template)) {
    candidate = candidate.template;
  }
  if (isRecord(candidate) && isRecord(candidate.data)) {
    candidate = candidate.data;
  }
  if (!isRecord(candidate)) return null;

  const slug = typeof candidate.slug === 'string' && candidate.slug.trim()
    ? candidate.slug
    : templateSlug;

  return {
    id: typeof candidate.id === 'string' ? candidate.id : `tmpl-${slug}`,
    workspaceId: null,
    slug,
    name: typeof candidate.name === 'string' && candidate.name.trim()
      ? candidate.name
      : slugToTitle(slug),
    description: typeof candidate.description === 'string' ? candidate.description : null,
    goal: typeof candidate.goal === 'string' && candidate.goal.trim() ? candidate.goal : 'general',
    category: typeof candidate.category === 'string' && candidate.category.trim() ? candidate.category : 'general',
    templateType: typeof candidate.templateType === 'string' ? candidate.templateType : 'assistant',
    channels: readStringList(candidate.channels),
    providers: readStringList(candidate.providers),
    tags: readStringList(candidate.tags),
    baseConfigJson: typeof candidate.baseConfigJson === 'string' ? candidate.baseConfigJson : '{}',
    defaultOptionsJson: typeof candidate.defaultOptionsJson === 'string' ? candidate.defaultOptionsJson : '{}',
    schemaJson: typeof candidate.schemaJson === 'string' ? candidate.schemaJson : '{}',
    isOfficial: Boolean(candidate.isOfficial),
    isFeatured: Boolean(candidate.isFeatured),
    isActive: typeof candidate.isActive === 'boolean' ? candidate.isActive : true,
  };
}

export function TemplateDetailPage({ templateSlug }: TemplateDetailPageProps) {
  const navigate = useNavigate();
  const {
    data: templateRaw,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ConfigTemplate | null>({
    queryKey: ['config-builder-template', templateSlug],
    queryFn: async () => {
      try {
        // Primary source: list endpoint has proven more stable in local dev.
        const listResponse = await getConfigTemplates({ limit: 200, offset: 0, search: templateSlug });
        const match = listResponse.templates.find((entry) => entry.slug === templateSlug);
        if (match) return match;
      } catch {
        // Continue to detail endpoint fallback below.
      }

      try {
        return await getConfigTemplate(templateSlug);
      } catch (err: unknown) {
        const status = (err as any)?.response?.status as number | undefined;
        if (status === 404) return null;
        throw err;
      }
    },
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });
  const template = normalizeTemplatePayload(templateRaw, templateSlug);
  const hasRawResponse = templateRaw !== undefined;
  const isNotFound = !isLoading && !isError && templateRaw === null;
  const isMalformedPayload = !isLoading && !isError && hasRawResponse && templateRaw !== null && !template;

  useEffect(() => {
    if (isLoading) return;

    if (isError) {
      applySeoMeta({
        title: 'Template Load Error',
        description: 'The template could not be loaded right now. Please retry.',
        canonicalPath: `/config-builder/templates/${templateSlug}`,
        robots: 'noindex,follow',
      });
      return;
    }

    if (isNotFound || !template) {
      applySeoMeta({
        title: 'Template Not Found',
        description: 'The requested template is not available in Clawpute.com Config Builder.',
        canonicalPath: `/config-builder/templates/${templateSlug}`,
        robots: 'noindex,follow',
      });
      return;
    }

    const detailCopy = getTemplateCopy(template);
    applySeoMeta({
      title: `${template.name} Template`,
      description: detailCopy.long || detailCopy.short,
      canonicalPath: `/config-builder/templates/${template.slug}`,
      ogType: 'product',
    });
  }, [isLoading, isError, isNotFound, template, templateSlug]);

  if (isLoading) {
    return (
      <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Loading template details...</p>
      </div>
    );
  }

  if (isError) {
    const message = (error as any)?.response?.status === 429
      ? 'Too many requests hit the template API. Please wait a few seconds and retry.'
      : 'The template API is temporarily unavailable. Please retry.';
    return (
      <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '22px', fontWeight: 800 }}>Unable to load template</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          {message}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              background: 'rgba(8, 145, 178, 0.35)',
              color: '#bae6fd',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/config-builder', search: { tab: 'templates' } as any })}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#e2e8f0',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  if (!isError && !hasRawResponse) {
    return (
      <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto' }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>Loading template details...</p>
      </div>
    );
  }

  if (isMalformedPayload) {
    return (
      <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '22px', fontWeight: 800 }}>Template data unavailable</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          Template data was returned in an unexpected format. Please retry.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => refetch()}
            style={{
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: '8px',
              background: 'rgba(8, 145, 178, 0.35)',
              color: '#bae6fd',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/config-builder', search: { tab: 'templates' } as any })}
            style={{
              border: '1px solid rgba(148, 163, 184, 0.3)',
              borderRadius: '8px',
              background: 'rgba(15, 23, 42, 0.5)',
              color: '#e2e8f0',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Back to templates
          </button>
        </div>
      </div>
    );
  }

  if (isNotFound || !template) {
    return (
      <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '12px' }}>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '22px', fontWeight: 800 }}>Template not found</h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          The requested template does not exist or is not available.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: '/config-builder', search: { tab: 'templates' } as any })}
          style={{
            width: 'fit-content',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '8px',
            background: 'rgba(15, 23, 42, 0.5)',
            color: '#e2e8f0',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Back to templates
        </button>
      </div>
    );
  }

  const copy = getTemplateCopy(template);
  const channels = readStringList(template.channels);
  const providers = readStringList(template.providers);
  const templateMetaChips = [
    { type: 'goal', value: template.goal },
    { type: 'category', value: template.category },
    ...channels.map((value) => ({ type: 'channel', value })),
    ...providers.map((value) => ({ type: 'provider', value })),
  ];
  const idealFor = Array.isArray(copy.idealFor) ? copy.idealFor : [];
  const includes = Array.isArray(copy.includes) ? copy.includes : [];
  const previewJson = (() => {
    try {
      return JSON.stringify(JSON.parse(template.baseConfigJson), null, 2);
    } catch {
      return template.baseConfigJson;
    }
  })();

  return (
    <div style={{ padding: '20px', maxWidth: '980px', margin: '0 auto', display: 'grid', gap: '14px' }}>
      <header style={{ display: 'grid', gap: '6px' }}>
        <p style={{ margin: 0, color: '#93c5fd', fontSize: '12px' }}>
          Config Builder / Templates / {template.name}
        </p>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '28px', fontWeight: 800 }}>
          Template Details
        </h1>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
          Review fit, included capabilities, and sample config before launching in the builder.
        </p>
      </header>

      <button
        type="button"
        onClick={() => navigate({ to: '/config-builder', search: { tab: 'templates' } as any })}
        style={{
          width: 'fit-content',
          border: 'none',
          background: 'transparent',
          color: '#93c5fd',
          padding: 0,
          cursor: 'pointer',
          fontSize: '12px',
          textDecoration: 'underline',
        }}
      >
        Back to templates
      </button>

      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.45)',
          padding: '16px',
          display: 'grid',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '24px', fontWeight: 800 }}>{template.name}</h2>
            <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '14px', lineHeight: 1.5 }}>{copy.long}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate({
                to: '/config-builder',
                search: { tab: 'builder', template: template.slug } as any,
              })
            }
            style={{
              border: '1px solid rgba(34, 197, 94, 0.45)',
              background: 'rgba(21, 128, 61, 0.4)',
              color: '#dcfce7',
              borderRadius: '8px',
              padding: '9px 12px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '12px',
              height: 'fit-content',
            }}
          >
            Use Template
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {templateMetaChips.map((chip, index) => (
            <span
              key={`${template.id}-${chip.type}-${chip.value}-${index}`}
              style={{
                padding: '4px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(148, 163, 184, 0.3)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#cbd5e1',
                fontSize: '11px',
              }}
            >
              {toTitle(chip.value)}
            </span>
          ))}
        </div>
      </section>

      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.45)',
          padding: '16px',
          display: 'grid',
          gap: '12px',
        }}
      >
        <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 700 }}>Why teams use this template</h2>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
          {idealFor.map((point) => (
            <li key={`${template.id}-ideal-${point}`}>{point}</li>
          ))}
        </ul>
        <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: '14px', fontWeight: 700 }}>What is included</h3>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.6 }}>
          {includes.map((point) => (
            <li key={`${template.id}-include-${point}`}>{point}</li>
          ))}
        </ul>
      </section>

      <section
        style={{
          border: '1px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.45)',
          padding: '16px',
        }}
      >
        <h2 style={{ margin: '0 0 10px', color: '#f8fafc', fontSize: '16px', fontWeight: 700 }}>Config preview</h2>
        <pre
          style={{
            margin: 0,
            background: '#020617',
            border: '1px solid rgba(30, 41, 59, 1)',
            borderRadius: '10px',
            padding: '12px',
            color: '#cbd5e1',
            fontSize: '12px',
            overflowX: 'auto',
            lineHeight: 1.5,
            maxHeight: '360px',
          }}
        >
          {previewJson}
        </pre>
      </section>
    </div>
  );
}
