import { useMemo, useState } from 'react';
import { ConfigTemplate } from '../../lib/api';
import { TemplateCard } from './TemplateCard';

interface TemplateGridProps {
  templates: ConfigTemplate[];
  onUseTemplate: (template: ConfigTemplate) => void;
  onOpenTemplateDetails: (template: ConfigTemplate) => void;
}

export function TemplateGrid({ templates, onUseTemplate, onOpenTemplateDetails }: TemplateGridProps) {
  const [search, setSearch] = useState('');
  const [goalFilter, setGoalFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');

  const goals = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((template) => set.add(template.goal));
    return ['all', ...Array.from(set).sort()];
  }, [templates]);

  const channels = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((template) => template.channels.forEach((channel) => set.add(channel)));
    return ['all', ...Array.from(set).sort()];
  }, [templates]);

  const providers = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((template) => template.providers.forEach((provider) => set.add(provider)));
    return ['all', ...Array.from(set).sort()];
  }, [templates]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return templates
      .filter((template) => {
        if (goalFilter !== 'all' && template.goal !== goalFilter) return false;
        if (channelFilter !== 'all' && !template.channels.includes(channelFilter)) return false;
        if (providerFilter !== 'all' && !template.providers.includes(providerFilter)) return false;
        if (needle) {
          const haystack = [
            template.name,
            template.description ?? '',
            template.goal,
            template.category,
            ...template.tags,
            ...template.channels,
            ...template.providers,
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(needle)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [templates, goalFilter, channelFilter, providerFilter, search]);

  const hasActiveFilters = search.trim() || goalFilter !== 'all' || channelFilter !== 'all' || providerFilter !== 'all';

  return (
    <div>
      <div
        style={{
          border: '1px solid rgba(148, 163, 184, 0.2)',
          borderRadius: '12px',
          background: 'rgba(15, 23, 42, 0.5)',
          padding: '12px',
          marginBottom: '12px',
        }}
      >
        <p style={{ margin: 0, color: '#e2e8f0', fontSize: '15px', fontWeight: 700 }}>
          Pick a starting template
        </p>
        <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '12px' }}>
          Search and filter, then open details or click <strong style={{ color: '#e2e8f0' }}>Use</strong>.
        </p>
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search templates..."
            aria-label="Search templates"
            style={{
              flex: '1 1 240px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(2, 6, 23, 0.7)',
              color: '#e2e8f0',
              fontSize: '12px',
              padding: '7px 10px',
            }}
          />
          <select
            aria-label="Filter templates by goal"
            value={goalFilter}
            onChange={(event) => setGoalFilter(event.target.value)}
            style={{
              flex: '1 1 150px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(2, 6, 23, 0.7)',
              color: '#e2e8f0',
              fontSize: '12px',
              padding: '7px',
            }}
          >
            {goals.map((goal) => (
              <option key={goal} value={goal}>
                Goal: {goal}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter templates by channel"
            value={channelFilter}
            onChange={(event) => setChannelFilter(event.target.value)}
            style={{
              flex: '1 1 150px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(2, 6, 23, 0.7)',
              color: '#e2e8f0',
              fontSize: '12px',
              padding: '7px',
            }}
          >
            {channels.map((channel) => (
              <option key={channel} value={channel}>
                Channel: {channel}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter templates by provider"
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            style={{
              flex: '1 1 150px',
              borderRadius: '8px',
              border: '1px solid rgba(148, 163, 184, 0.25)',
              background: 'rgba(2, 6, 23, 0.7)',
              color: '#e2e8f0',
              fontSize: '12px',
              padding: '7px',
            }}
          >
            {providers.map((provider) => (
              <option key={provider} value={provider}>
                Model: {provider}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, color: '#93c5fd', fontSize: '12px' }}>
            {filtered.length} template{filtered.length === 1 ? '' : 's'} found
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setGoalFilter('all');
                setChannelFilter('all');
                setProviderFilter('all');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 0,
                fontSize: '12px',
                textDecoration: 'underline',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            border: '1px dashed rgba(148, 163, 184, 0.35)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
          }}
        >
          No templates match the selected filters.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUseTemplate={onUseTemplate}
              onOpenDetails={onOpenTemplateDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}
