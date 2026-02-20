import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './__root';
import LandingPage from './landing.lazy';

// Safety wrapper to ensure component is defined
function LandingWrapper() {
  if (!LandingPage) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: LandingPage component not loaded</div>;
  }
  return <LandingPage />;
}

export const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingWrapper,
}) as any;
