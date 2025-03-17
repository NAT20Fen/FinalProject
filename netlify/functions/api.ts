import express, { Router } from 'express';
import serverless from 'serverless-http';
import { storage } from '../../server/storage';
import session from 'express-session';
import MemoryStore from "memorystore";
import { registerRoutes } from '../../server/routes';

const api = express();
const SessionStore = MemoryStore(session);

// Session setup
api.use(express.json());
api.use(express.urlencoded({ extended: false }));
api.use(
  session({
    store: new SessionStore({
      checkPeriod: 86400000,
    }),
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Register all routes from the main application
(async () => {
  try {
    await registerRoutes(api);
  } catch (error) {
    console.error('Error registering routes:', error);
  }
})();

// Export handler for Netlify Functions
export const handler = serverless(api);