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

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('App Configuration:', {
    env: import.meta.env.MODE,
    apiUrl: API_URL,
    hasAwsConfig: !!AWS_REGION && !!COGNITO_USER_POOL_ID && !!COGNITO_CLIENT_ID,
    hasStripeConfig: !!STRIPE_PUBLISHABLE_KEY,
  });
} else {
  // Log minimal config info in production to help with debugging
  console.log('Production Config:', {
    env: import.meta.env.MODE,
    apiUrl: API_URL,
    hasRequiredConfig: !!(AWS_REGION && COGNITO_USER_POOL_ID && COGNITO_CLIENT_ID && STRIPE_PUBLISHABLE_KEY),
    netlifyFunctionsUrl: '/.netlify/functions/api'
  });
}