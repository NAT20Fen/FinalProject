# CritNote

A React-based web application with robust cloud service integrations, focusing on secure file storage, note management, and streamlined payment processing.

## Features
- Secure authentication with AWS Cognito
- File storage and management with AWS S3
- Note management system
- Secure payment processing with Stripe
- Responsive design with Bootstrap

## Tech Stack
- React.js frontend
- Express.js backend
- AWS Cognito for authentication
- AWS S3 for file storage
- PostgreSQL for data persistence
- Stripe for payments
- TypeScript for type safety

## Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Deployment on Netlify

### Required Environment Variables
Set these in your Netlify dashboard under Site settings > Build & deploy > Environment:

```env
# Frontend Variables (must be prefixed with VITE_ for client access)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Backend-only Variables (no VITE_ prefix)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name
COGNITO_CLIENT_SECRET=your_client_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
SESSION_SECRET=your_session_secret

# Node Environment
NODE_ENV=production
```

### Deployment Steps
1. Connect your repository to Netlify
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

3. Set all required environment variables in Netlify dashboard
   - Double-check that frontend variables have the VITE_ prefix
   - Ensure all backend variables are set without the VITE_ prefix
   - Make sure to use production credentials

4. Deploy your site:
   - Netlify will automatically deploy when you push to your repository
   - You can also trigger manual deploys from the Netlify dashboard

### Troubleshooting
- If you see a white screen:
  - Check browser console for JavaScript errors
  - Verify the publish directory is set to `dist`
  - Ensure all VITE_ prefixed environment variables are set
  - Check that API endpoints are correctly proxied through Netlify Functions
- If API calls fail:
  - Verify AWS and Stripe credentials are set correctly
  - Check the Functions log in Netlify dashboard
  - Ensure session cookie settings match your domain
  - Check CORS settings in netlify.toml

## Local Development
Create a `.env` file for local development:
```env
# Frontend Variables (must be prefixed with VITE_)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
VITE_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}

# Backend Variables (no VITE_ prefix)
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_S3_BUCKET=${AWS_S3_BUCKET}
COGNITO_CLIENT_SECRET=${COGNITO_CLIENT_SECRET}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
SESSION_SECRET=local_session_secret_123

# Node Environment
NODE_ENV=development
```

## License
MIT