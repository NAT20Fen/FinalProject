// AWS Configuration
export const AWS_REGION = import.meta.env.VITE_AWS_REGION;
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

// Stripe Configuration
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// API Configuration
export const API_URL = import.meta.env.PROD 
  ? '/.netlify/functions/api'
  : '/api';

// Ensure all required environment variables are present
if (!AWS_REGION) throw new Error('Missing required env var: VITE_AWS_REGION');
if (!COGNITO_USER_POOL_ID) throw new Error('Missing required env var: VITE_COGNITO_USER_POOL_ID');
if (!COGNITO_CLIENT_ID) throw new Error('Missing required env var: VITE_COGNITO_CLIENT_ID');
if (!STRIPE_PUBLISHABLE_KEY) throw new Error('Missing required env var: VITE_STRIPE_PUBLISHABLE_KEY');