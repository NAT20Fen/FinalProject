import express, { Router } from 'express';
import serverless from 'serverless-http';
import { storage } from '../../server/storage';
import session from 'express-session';
import MemoryStore from "memorystore";
import { registerRoutes } from '../../server/routes';
import fileUpload from 'express-fileupload';

const api = express();
const SessionStore = MemoryStore(session);

// Basic middleware setup
api.use(express.json());
api.use(express.urlencoded({ extended: true }));
api.use(fileUpload());

// Session setup
api.use(
  session({
    store: new SessionStore({
      checkPeriod: 86400000,
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      sameSite: 'lax',
    },
  })
);

// Basic health check endpoint
api.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Enable CORS for development
if (process.env.NODE_ENV !== 'production') {
  api.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
}

// Register all routes from the main application
(async () => {
  try {
    await registerRoutes(api);
    console.log('Routes registered successfully');
  } catch (error) {
    console.error('Error registering routes:', error);
  }
})();

// Create serverless handler
const handler = serverless(api, {
  binary: ['application/octet-stream', 'image/*'],
});

// Export the handler with error logging
export const handler = async (event: any, context: any) => {
  console.log('Incoming request:', {
    path: event.path,
    httpMethod: event.httpMethod,
    headers: event.headers
  });

  try {
    return await handler(event, context);
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};