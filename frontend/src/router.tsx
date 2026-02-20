import { createRouter } from '@tanstack/react-router';
import { rootRoute, workspaceLayoutRoute } from './routes/__root';
import { landingRoute } from './routes/landing';
import { loginRoute } from './routes/login';
import { onboardingRoute } from './routes/onboarding';
import { setupRoute } from './routes/setup';
import { connectRoute } from './routes/connect';
import { hpanelRoute } from './routes/hpanel';
import { usersRoute } from './routes/users';
import { openclawCheatsheetRoute } from './routes/openclaw-cheatsheet';
import { openclawConfigurationRoute } from './routes/openclaw-configuration';

// Workspace routes
import { dashboardRoute } from './routes/dashboard';
import { dashboardRedirectRoute } from './routes/dashboard-redirect';
import { projectsRoute } from './routes/projects';
import { agentsListRoute } from './routes/agents-list';
import { agentDetailRoute } from './routes/agent-detail';
import { sessionsRoute } from './routes/sessions';
import { commandCenterRoute } from './routes/command-center';
import { devlogsRoute } from './routes/devlogs';
import { skillsRoute } from './routes/skills';
import { channelsRoute } from './routes/channels';
import { cronRoute } from './routes/cron';
import { settingsRoute } from './routes/settings';

// User routes
import { installerRoute } from './routes/installer';
import { userDashboardRoute } from './routes/user-dashboard';
import { userCompletingRoute } from './routes/user-completing';
import { accountRoute } from './routes/account';
import { termsRoute } from './routes/terms';
import { privacyRoute } from './routes/privacy';
import { refundsRoute } from './routes/refunds';
import { pricingRoute } from './routes/pricing';
import { deckRoute } from './routes/deck';
import { directTestRoute } from './routes/direct-test';
import { directTestV2Route } from './routes/direct-test-v2';
import { configBuilderRoute } from './routes/config-builder';
import { configTemplateDetailRoute } from './routes/config-template-detail';

const routeTree = rootRoute.addChildren([
  workspaceLayoutRoute.addChildren([
    dashboardRoute,
    projectsRoute,
    agentsListRoute,
    agentDetailRoute,
    sessionsRoute,
    commandCenterRoute,
    devlogsRoute,
    skillsRoute,
    channelsRoute,
    cronRoute,
    settingsRoute,
    deckRoute,
  ]),
  dashboardRedirectRoute,
  landingRoute,
  loginRoute,
  onboardingRoute,
  setupRoute,
  connectRoute,
  hpanelRoute,
  usersRoute,
  openclawCheatsheetRoute,
  openclawConfigurationRoute,
  installerRoute,
  userDashboardRoute,
  userCompletingRoute,
  accountRoute,
  termsRoute,
  privacyRoute,
  refundsRoute,
  pricingRoute,
  configBuilderRoute,
  configTemplateDetailRoute,
  directTestRoute,
  directTestV2Route,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
