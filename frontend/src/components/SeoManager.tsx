import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { applySeoMeta, getSeoMetaForPath } from '../lib/seo';

export function SeoManager() {
  const location = useLocation();

  useEffect(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    applySeoMeta(getSeoMetaForPath(location.pathname, search));
  }, [location.pathname, location.search]);

  return null;
}
