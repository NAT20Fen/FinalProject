import type { Express, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import session from "express-session";
import { storage } from "./storage";
import { signUp, signIn, signOut, confirmSignUp } from "./services/cognito";
import { uploadFile, getSignedDownloadUrl } from "./services/s3";
import { UploadedFile } from "express-fileupload";
import { insertPaymentSchema, insertNoteSchema, updateNoteSchema } from "@shared/schema";
import MemoryStore from "memorystore";
import Stripe from "stripe";
import { STRIPE_CONFIG } from "./config";

if (!STRIPE_CONFIG.secretKey) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(STRIPE_CONFIG.secretKey, {
  apiVersion: "2023-10-16",
});

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express) {
  // Session setup
  app.use(
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

  // Auth routes with Cognito
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;
      const result = await signUp(username, password, email);
      res.json({
        message: "Registration successful. Please check your email for verification code.",
        userSub: result.UserSub,
      });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/confirm", async (req: Request, res: Response) => {
    try {
      const { username, code } = req.body;
      await confirmSignUp(username, code);
      res.json({ message: "Email confirmed successfully" });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      const result = await signIn(username, password);

      if (result.AuthenticationResult) {
        req.session.accessToken = result.AuthenticationResult.AccessToken;
        req.session.refreshToken = result.AuthenticationResult.RefreshToken;
        req.session.username = username; // Store username in session
        res.json({
          accessToken: result.AuthenticationResult.AccessToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
        });
      } else {
        res.status(401).json({ message: "Authentication failed" });
      }
    } catch (err: any) {
      res.status(401).json({ message: err.message });
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      if (req.session.accessToken) {
        await signOut(req.session.accessToken);
        req.session.destroy((err) => {
          if (err) {
            res.status(500).json({ message: "Could not log out" });
          } else {
            res.json({ message: "Logged out successfully" });
          }
        });
      } else {
        res.status(401).json({ message: "Not authenticated" });
      }
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (req.session.accessToken) {
      res.json({ message: "Authenticated" });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // File routes
  app.post("/api/files", async (req: Request, res: Response) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.files?.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const file = req.files.file as UploadedFile;
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize filename
      const key = `files/${req.session.username}/${safeName}`;

      // Upload to S3 with username tag
      const s3Url = await uploadFile(file, key, req.session.username);

      // Store file metadata in our storage
      const fileData = {
        filename: req.body.filename || file.name,
        filepath: s3Url,
      };

      const savedFile = await storage.createFile(req.session.userId, req.session.username, fileData);
      res.json(savedFile);
    } catch (err: any) {
      console.error('File upload error:', err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.get("/api/files", async (req: Request, res: Response) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const files = await storage.getFiles(req.session.userId, req.session.username);

      // Generate signed URLs for each file
      const filesWithUrls = await Promise.all(
        files.map(async (file) => {
          const key = file.filepath.split('/').pop() || '';
          const signedUrl = await getSignedDownloadUrl(key);
          return {
            ...file,
            downloadUrl: signedUrl,
          };
        })
      );

      res.json(filesWithUrls);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Payment routes
  app.post("/api/payments", async (req: Request, res: Response) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const paymentData = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(req.session.userId, paymentData);
      res.json(payment);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/payments", async (req: Request, res: Response) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payments = await storage.getPayments(req.session.userId);
    res.json(payments);
  });

  // Note routes
  app.post("/api/notes", async (req: Request, res: Response) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(req.session.userId, req.session.username, noteData);
      res.json(note);
    } catch (err) {
      console.error('Note creation error:', err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get("/api/notes", async (req: Request, res: Response) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const notes = await storage.getNotes(req.session.userId, req.session.username);
    res.json(notes);
  });

  app.get("/api/notes/:id", async (req: Request, res: Response) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const note = await storage.getNote(parseInt(req.params.id));
    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    if (note.userId !== req.session.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(note);
  });

  app.put("/api/notes/:id", async (req: Request, res: Response) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const note = await storage.getNote(parseInt(req.params.id));
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Check if the note belongs to the user's directory using s3Key
      const userNotePath = `notes/${req.session.username}/`;
      if (!note.s3Key || !note.s3Key.startsWith(userNotePath)) {
        return res.status(403).json({ 
          message: "Unauthorized",
          details: `Note does not belong to user: ${req.session.username}`
        });
      }

      const updateData = updateNoteSchema.parse(req.body);
      const updatedNote = await storage.updateNote(note.id, updateData, req.session.username);
      res.json(updatedNote);
    } catch (err: any) {
      console.error('Error updating note:', err);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/notes/:id", async (req: Request, res: Response) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ 
        message: "Not authenticated",
        details: `Session state: accessToken=${!!req.session.accessToken}, username=${req.session.username}`
      });
    }

    const note = await storage.getNote(parseInt(req.params.id));
    if (!note) {
      return res.status(404).json({ 
        message: "Note not found",
        details: `Note ID: ${req.params.id}`
      });
    }

    // Check if the note belongs to the user's directory using s3Key
    const userNotePath = `notes/${req.session.username}/`;
    if (!note.s3Key || !note.s3Key.startsWith(userNotePath)) {
      return res.status(403).json({ 
        message: "Unauthorized",
        details: `Note does not belong to user: ${req.session.username}`
      });
    }

    try {
      await storage.deleteNote(note.id);
      res.json({ message: "Note deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ 
        message: error.message,
        details: error.details || 'Error occurred during note deletion'
      });
    }
  });

  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        payment_method_types: ['card'], // Only allow card payments
        automatic_payment_methods: {
          enabled: false, // Disable automatic payment methods
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ 
        message: "Error creating payment intent",
        details: error.message
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}