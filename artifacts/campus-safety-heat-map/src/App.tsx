import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

import { AppProvider, useAppContext } from './context/AppContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Report from './pages/Report';
import MapPage from './pages/Map';
import ReviewDashboard from './pages/ReviewDashboard';
import Help from './pages/Help';
import './styles/safemap-colors.css';

const queryClient = new QueryClient();

function Restoring() {
  return <div className="page-wrap" role="status">Restoring your session…</div>;
}

function RootRedirect() {
  const { role, sessionReady } = useAppContext();
  if (!sessionReady) return <Restoring />;
  return <Redirect to={role === 'analyst' ? '/review' : role === 'viewer' ? '/map' : role ? '/report' : '/login'} />;
}

function ReporterRoute() {
  const { role, sessionReady } = useAppContext();
  if (!sessionReady) return <Restoring />;
  return role === 'student' || role === 'resident'
    ? <Report />
    : <Redirect to={role === 'analyst' ? '/review' : '/login'} />;
}

function AnalystRoute() {
  const { role, sessionReady } = useAppContext();
  if (!sessionReady) return <Restoring />;
  return role === 'analyst' ? <ReviewDashboard /> : <Redirect to={role ? '/map' : '/login'} />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Layout>
        <Switch>
          <Route path="/" component={RootRedirect} />
          <Route path="/login" component={Login} />
          <Route path="/report" component={ReporterRoute} />
          <Route path="/review" component={AnalystRoute} />
          <Route path="/map" component={MapPage} />
          <Route path="/help" component={Help} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
