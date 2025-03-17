import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID, STRIPE_PUBLISHABLE_KEY } from "./lib/config";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Suspense } from 'react';

import Layout from "./components/Layout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import FileUpload from "./pages/FileUpload";
import Notes from "./pages/Notes";
import Payment from "./pages/Payment";
import NotFound from "./pages/not-found";

// Error Boundary Component
class ErrorBoundaryComponent extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container py-5 text-center">
          <h1 className="text-danger mb-4">Something went wrong</h1>
          <p className="text-muted">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button 
            className="btn btn-primary" 
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function ConfigurationError({ message }) {
  return (
    <div className="container py-5 text-center">
      <h1 className="text-danger mb-4">Configuration Error</h1>
      <p className="text-muted">{message}</p>
      <p className="text-muted small">
        Please ensure all required environment variables are set in the Netlify deployment settings.
      </p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}

function Router() {
  // Check for required environment variables
  if (!AWS_REGION || !COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
    return <ConfigurationError message="AWS configuration is missing. Please check environment variables." />;
  }

  if (!STRIPE_PUBLISHABLE_KEY) {
    return <ConfigurationError message="Stripe configuration is missing. Please check environment variables." />;
  }

  return (
    <Layout>
      <ErrorBoundaryComponent>
        <Suspense fallback={<LoadingSpinner />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/upload" component={FileUpload} />
            <Route path="/notes" component={Notes} />
            <Route path="/payment" component={Payment} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundaryComponent>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;