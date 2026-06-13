import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import ProjectsPage from "@/pages/projects";
import ProjectNewPage from "@/pages/project-new";
import ProjectDetailPage from "@/pages/project-detail";
import DeploymentsPage from "@/pages/deployments";
import DeploymentDetailPage from "@/pages/deployment-detail";
import DomainsPage from "@/pages/domains";
import DomainSearchPage from "@/pages/domain-search";
import DomainDetailPage from "@/pages/domain-detail";
import InfrastructurePage from "@/pages/infrastructure";
import AnalyticsPage from "@/pages/analytics";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard">
        <Layout><DashboardPage /></Layout>
      </Route>
      <Route path="/projects/new">
        <Layout><ProjectNewPage /></Layout>
      </Route>
      <Route path="/projects/:id">
        <Layout><ProjectDetailPage /></Layout>
      </Route>
      <Route path="/projects">
        <Layout><ProjectsPage /></Layout>
      </Route>
      <Route path="/deployments/:id">
        <Layout><DeploymentDetailPage /></Layout>
      </Route>
      <Route path="/deployments">
        <Layout><DeploymentsPage /></Layout>
      </Route>
      <Route path="/domains/search">
        <Layout><DomainSearchPage /></Layout>
      </Route>
      <Route path="/domains/:id">
        <Layout><DomainDetailPage /></Layout>
      </Route>
      <Route path="/domains">
        <Layout><DomainsPage /></Layout>
      </Route>
      <Route path="/infrastructure">
        <Layout><InfrastructurePage /></Layout>
      </Route>
      <Route path="/analytics">
        <Layout><AnalyticsPage /></Layout>
      </Route>
      <Route path="/settings">
        <Layout><SettingsPage /></Layout>
      </Route>
      <Route>
        <Layout><NotFound /></Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
