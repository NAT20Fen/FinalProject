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
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=your_s3_bucket_name

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=your_user_pool_id
COGNITO_CLIENT_ID=your_client_id
COGNITO_CLIENT_SECRET=your_client_secret

# Frontend Environment Variables (must be prefixed with VITE_)
VITE_AWS_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=your_user_pool_id
VITE_COGNITO_CLIENT_ID=your_client_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key

# Session Configuration (use a secure random string)
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
   - Make sure to include both backend (AWS_, STRIPE_, etc.) and frontend (VITE_) variables
   - Double-check that all frontend variables are prefixed with VITE_

4. Deploy your site:
   - Netlify will automatically deploy when you push to your repository
   - You can also trigger manual deploys from the Netlify dashboard

### Troubleshooting
- Check the Netlify deployment logs for any build errors
- Verify all environment variables are set correctly
- Ensure your AWS and Stripe credentials have the necessary permissions
- Check that the API endpoints are being correctly proxied through Netlify Functions
- If you see a white screen, check the browser console for errors and verify that all VITE_ prefixed environment variables are set

## Local Development
Create a `.env` file for local development:
```env
# Frontend Variables (must be prefixed with VITE_)
VITE_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}
VITE_AWS_REGION=${AWS_REGION}
VITE_COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
VITE_COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
AWS_S3_BUCKET=${AWS_S3_BUCKET}

# AWS Cognito Configuration
COGNITO_USER_POOL_ID=${COGNITO_USER_POOL_ID}
COGNITO_CLIENT_ID=${COGNITO_CLIENT_ID}
COGNITO_CLIENT_SECRET=${COGNITO_CLIENT_SECRET}

# Stripe Configuration
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}

# Session Configuration
SESSION_SECRET=replit_session_secret_123

# Node Environment
NODE_ENV=development
```

## License
MIT