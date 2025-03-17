// server/index.ts
import express2 from "express";
import fileUpload from "express-fileupload";

// server/routes.ts
import { createServer } from "http";
import session from "express-session";

// server/services/s3.ts
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, GetObjectTaggingCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
console.log("AWS Configuration:", {
  region: process.env.AWS_USER_REGION,
  bucket: process.env.AWS_USER_S3_BUCKET,
  hasAccessKey: !!process.env.AWS_USER_ACCESS_KEY_ID,
  hasSecretKey: !!process.env.AWS_USER_SECRET_ACCESS_KEY
});
if (!process.env.AWS_USER_REGION) {
  throw new Error("Missing required AWS configuration: AWS_USER_REGION");
}
if (!process.env.AWS_USER_ACCESS_KEY_ID || !process.env.AWS_USER_SECRET_ACCESS_KEY) {
  throw new Error("Missing required AWS credentials");
}
if (!process.env.AWS_USER_S3_BUCKET) {
  throw new Error("Missing required AWS configuration: AWS_USER_S3_BUCKET");
}
var s3Client = new S3Client({
  region: process.env.AWS_USER_REGION,
  credentials: {
    accessKeyId: process.env.AWS_USER_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_USER_SECRET_ACCESS_KEY
  }
});
var BUCKET_NAME = process.env.AWS_USER_S3_BUCKET;
async function getUniqueKey(baseKey) {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: baseKey.substring(0, baseKey.lastIndexOf("/"))
    // Get directory
  });
  try {
    const result = await s3Client.send(command);
    const existingFiles = result.Contents || [];
    const existingFilenames = new Set(
      existingFiles.map((file) => file.Key?.split("/").pop() || "")
    );
    let key = baseKey;
    let counter = 1;
    const ext = baseKey.includes(".") ? baseKey.substring(baseKey.lastIndexOf(".")) : "";
    const baseName = baseKey.includes(".") ? baseKey.substring(0, baseKey.lastIndexOf(".")) : baseKey;
    while (existingFilenames.has(key.split("/").pop() || "")) {
      key = `${baseName} (${counter})${ext}`;
      counter++;
    }
    return key;
  } catch (error) {
    console.error("Error checking for existing files:", error);
    return baseKey;
  }
}
async function uploadFile(file, baseKey, username) {
  const key = await getUniqueKey(baseKey);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.data,
    ContentType: file.mimetype,
    Tagging: `username=${username}`
  });
  await s3Client.send(command);
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_USER_REGION}.amazonaws.com/${key}`;
}
async function uploadText(content, key, username) {
  console.log("Attempting to upload text with key:", key);
  console.log("Using bucket:", BUCKET_NAME);
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content,
    ContentType: "text/plain",
    Tagging: `username=${username}`
  });
  try {
    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_USER_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error("Error uploading text to S3:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}
async function getSignedDownloadUrl(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
async function listUserObjects(username) {
  const objects = [];
  const filesCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `files/${username}/`
  });
  const notesCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `notes/${username}/`
  });
  try {
    const [filesResult, notesResult] = await Promise.all([
      s3Client.send(filesCommand),
      s3Client.send(notesCommand)
    ]);
    const allObjects = [...filesResult.Contents || [], ...notesResult.Contents || []];
    for (const object of allObjects) {
      if (object.Key) {
        const taggingCommand = new GetObjectTaggingCommand({
          Bucket: BUCKET_NAME,
          Key: object.Key
        });
        const tags = await s3Client.send(taggingCommand);
        const usernameTag = tags.TagSet?.find((tag) => tag.Key === "username" && tag.Value === username);
        if (usernameTag) {
          objects.push({
            key: object.Key,
            username,
            lastModified: object.LastModified
          });
        }
      }
    }
    return objects;
  } catch (error) {
    console.error("Error listing objects:", error);
    return [];
  }
}
async function deleteObject(key) {
  console.log("Attempting to delete S3 object with key:", key);
  console.log("Using bucket:", BUCKET_NAME);
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });
  try {
    const response = await s3Client.send(command);
    console.log("S3 delete response:", response);
  } catch (error) {
    console.error("Error deleting object from S3:", error);
    console.error("Full error details:", JSON.stringify(error, null, 2));
    throw error;
  }
}

// server/storage.ts
var MemStorage = class {
  users;
  files;
  notes;
  payments;
  currentId;
  initialized;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.files = /* @__PURE__ */ new Map();
    this.notes = /* @__PURE__ */ new Map();
    this.payments = /* @__PURE__ */ new Map();
    this.currentId = { users: 1, files: 1, notes: 1, payments: 1 };
    this.initialized = false;
  }
  async ensureInitialized(username) {
    if (!this.initialized && username) {
      await this.rebuildMetadata(username);
      this.initialized = true;
    }
  }
  async rebuildMetadata(username) {
    try {
      const objects = await listUserObjects(username);
      for (const obj of objects) {
        const isNote = obj.key.startsWith("notes/");
        const id = this.currentId[isNote ? "notes" : "files"]++;
        if (isNote) {
          const note = {
            id,
            userId: 1,
            // Since we don't have real user IDs in memory storage
            title: obj.key.split("/").pop()?.replace(".txt", "") || "Untitled",
            content: obj.key,
            // Store full S3 key
            createdAt: obj.lastModified || /* @__PURE__ */ new Date(),
            updatedAt: obj.lastModified || /* @__PURE__ */ new Date()
          };
          this.notes.set(id, note);
        } else {
          const filename = obj.key.split("/").pop() || "unknown";
          const file = {
            id,
            userId: 1,
            // Since we don't have real user IDs in memory storage
            filename,
            filepath: obj.key,
            // Store full S3 key
            uploadedAt: obj.lastModified || /* @__PURE__ */ new Date()
          };
          this.files.set(id, file);
        }
      }
    } catch (error) {
      console.error("Error rebuilding metadata:", error);
    }
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentId.users++;
    const user = { ...insertUser, id, isVerified: false };
    this.users.set(id, user);
    return user;
  }
  async verifyUser(id) {
    const user = await this.getUser(id);
    if (!user)
      throw new Error("User not found");
    const updatedUser = { ...user, isVerified: true };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  async createFile(userId, username, insertFile) {
    const id = this.currentId.files++;
    const file = {
      ...insertFile,
      id,
      userId,
      uploadedAt: /* @__PURE__ */ new Date()
    };
    this.files.set(id, file);
    return file;
  }
  async getFiles(userId, username) {
    await this.ensureInitialized(username);
    const objects = await listUserObjects(username);
    const fileKeys = objects.filter((obj) => obj.key.startsWith("files/")).map((obj) => obj.key);
    return Array.from(this.files.values()).filter(
      (file) => fileKeys.some((key) => file.filepath.includes(key))
    );
  }
  async createNote(userId, username, insertNote) {
    await this.ensureInitialized(username);
    const id = this.currentId.notes++;
    const now = /* @__PURE__ */ new Date();
    const safeName = insertNote.title.replace(/[^a-zA-Z0-9.-]/g, "_");
    const key = `notes/${username}/${safeName}.txt`;
    await uploadText(insertNote.content, key, username);
    const note = {
      ...insertNote,
      id,
      userId,
      content: key,
      // Store the S3 key in content field
      createdAt: now,
      updatedAt: now
    };
    this.notes.set(id, note);
    return {
      ...note,
      content: insertNote.content
      // Return the original content for display
    };
  }
  async getNotes(userId, username) {
    await this.ensureInitialized(username);
    const objects = await listUserObjects(username);
    const noteKeys = objects.filter((obj) => obj.key.startsWith("notes/")).map((obj) => obj.key);
    const notes2 = Array.from(this.notes.values()).filter(
      (note) => noteKeys.some((key) => key === note.content)
    );
    return Promise.all(
      notes2.map(async (note) => {
        try {
          const signedUrl = await getSignedDownloadUrl(note.content);
          const response = await fetch(signedUrl);
          const content = await response.text();
          return {
            ...note,
            displayContent: content,
            // Add displayContent for UI
            content: note.content
            // Keep the S3 key in content field
          };
        } catch (error) {
          console.error(`Error fetching note content: ${error}`);
          return note;
        }
      })
    );
  }
  async getNote(id) {
    const note = this.notes.get(id);
    if (!note)
      return void 0;
    try {
      const signedUrl = await getSignedDownloadUrl(note.content);
      const response = await fetch(signedUrl);
      const content = await response.text();
      return {
        ...note,
        displayContent: content,
        // Add displayContent for UI
        content: note.content
        // Keep the S3 key in content field
      };
    } catch (error) {
      console.error(`Error fetching note content: ${error}`);
      return note;
    }
  }
  async updateNote(id, updateNote, username) {
    const note = this.notes.get(id);
    if (!note)
      throw new Error("Note not found");
    const key = note.content;
    await uploadText(updateNote.content, key, username);
    const updatedNote = {
      ...note,
      ...updateNote,
      content: key,
      // Keep the S3 key
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.notes.set(id, updatedNote);
    return {
      ...updatedNote,
      displayContent: updateNote.content,
      // Add displayContent for UI
      content: key
      // Keep the S3 key
    };
  }
  async deleteNote(id) {
    const note = this.notes.get(id);
    if (note) {
      try {
        console.log("Deleting note:", {
          id: note.id,
          content: note.content,
          // This should be the S3 key
          userId: note.userId
        });
        await deleteObject(note.content);
        this.notes.delete(id);
      } catch (error) {
        console.error("Error deleting note:", error);
        throw error;
      }
    }
  }
  async createPayment(userId, insertPayment) {
    const id = this.currentId.payments++;
    const payment = {
      ...insertPayment,
      id,
      userId,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.payments.set(id, payment);
    return payment;
  }
  async getPayments(userId) {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.userId === userId
    );
  }
};
var storage = new MemStorage();

// server/services/cognito.ts
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  GlobalSignOutCommand
} from "@aws-sdk/client-cognito-identity-provider";

// server/config.ts
var AWS_CONFIG = {
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
};
var COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
};
var STRIPE_CONFIG = {
  secretKey: process.env.STRIPE_SECRET_KEY
};

// server/services/cognito.ts
import CryptoJS from "crypto-js";
var cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_CONFIG.region,
  credentials: {
    accessKeyId: AWS_CONFIG.credentials.accessKeyId || "",
    secretAccessKey: AWS_CONFIG.credentials.secretAccessKey || ""
  }
});
function calculateSecretHash(username) {
  const message = username + COGNITO_CONFIG.clientId;
  const secret = COGNITO_CONFIG.clientSecret || "";
  return CryptoJS.enc.Base64.stringify(
    CryptoJS.HmacSHA256(
      message,
      CryptoJS.enc.Utf8.parse(secret)
    )
  );
}
async function signUp(username, password, email) {
  const secretHash = calculateSecretHash(username);
  const command = new SignUpCommand({
    ClientId: COGNITO_CONFIG.clientId || "",
    Username: username,
    Password: password,
    SecretHash: secretHash,
    UserAttributes: [
      {
        Name: "email",
        Value: email
      }
    ]
  });
  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
}
async function signIn(username, password) {
  const secretHash = calculateSecretHash(username);
  const command = new InitiateAuthCommand({
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: COGNITO_CONFIG.clientId || "",
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
      SECRET_HASH: secretHash
    }
  });
  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}
async function signOut(accessToken) {
  const command = new GlobalSignOutCommand({
    AccessToken: accessToken
  });
  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}
async function confirmSignUp(username, code) {
  const secretHash = calculateSecretHash(username);
  const command = new ConfirmSignUpCommand({
    ClientId: COGNITO_CONFIG.clientId || "",
    Username: username,
    ConfirmationCode: code,
    SecretHash: secretHash
  });
  try {
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    console.error("Error confirming sign up:", error);
    throw error;
  }
}

// shared/schema.ts
import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false).notNull()
});
var files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});
var notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  amount: text("amount").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertFileSchema = createInsertSchema(files).pick({
  filename: true,
  filepath: true
});
var insertNoteSchema = createInsertSchema(notes).pick({
  title: true,
  content: true
});
var updateNoteSchema = createInsertSchema(notes).pick({
  title: true,
  content: true
});
var insertPaymentSchema = createInsertSchema(payments).pick({
  amount: true,
  status: true
});

// server/routes.ts
import MemoryStore from "memorystore";
import Stripe from "stripe";
if (!STRIPE_CONFIG.secretKey) {
  throw new Error("Missing required Stripe secret: STRIPE_SECRET_KEY");
}
var stripe = new Stripe(STRIPE_CONFIG.secretKey, {
  apiVersion: "2023-10-16"
});
var SessionStore = MemoryStore(session);
async function registerRoutes(app2) {
  app2.use(
    session({
      store: new SessionStore({
        checkPeriod: 864e5
      }),
      secret: process.env.SESSION_SECRET || "your-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" }
    })
  );
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password, email } = req.body;
      const result = await signUp(username, password, email);
      res.json({
        message: "Registration successful. Please check your email for verification code.",
        userSub: result.UserSub
      });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/auth/confirm", async (req, res) => {
    try {
      const { username, code } = req.body;
      await confirmSignUp(username, code);
      res.json({ message: "Email confirmed successfully" });
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await signIn(username, password);
      if (result.AuthenticationResult) {
        req.session.accessToken = result.AuthenticationResult.AccessToken;
        req.session.refreshToken = result.AuthenticationResult.RefreshToken;
        req.session.username = username;
        res.json({
          accessToken: result.AuthenticationResult.AccessToken,
          refreshToken: result.AuthenticationResult.RefreshToken
        });
      } else {
        res.status(401).json({ message: "Authentication failed" });
      }
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
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
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (req.session.accessToken) {
      res.json({ message: "Authenticated" });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  app2.post("/api/files", async (req, res) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    if (!req.files?.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    try {
      const file = req.files.file;
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const key = `files/${req.session.username}/${safeName}`;
      const s3Url = await uploadFile(file, key, req.session.username);
      const fileData = {
        filename: req.body.filename || file.name,
        filepath: s3Url
      };
      const savedFile = await storage.createFile(req.session.userId, req.session.username, fileData);
      res.json(savedFile);
    } catch (err) {
      console.error("File upload error:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
  app2.get("/api/files", async (req, res) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const files2 = await storage.getFiles(req.session.userId, req.session.username);
      const filesWithUrls = await Promise.all(
        files2.map(async (file) => {
          const key = file.filepath.split("/").pop() || "";
          const signedUrl = await getSignedDownloadUrl(key);
          return {
            ...file,
            downloadUrl: signedUrl
          };
        })
      );
      res.json(filesWithUrls);
    } catch (err) {
      console.error("Error fetching files:", err);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });
  app2.post("/api/payments", async (req, res) => {
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
  app2.get("/api/payments", async (req, res) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const payments2 = await storage.getPayments(req.session.userId);
    res.json(payments2);
  });
  app2.post("/api/notes", async (req, res) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const noteData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(req.session.userId, req.session.username, noteData);
      res.json(note);
    } catch (err) {
      console.error("Note creation error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });
  app2.get("/api/notes", async (req, res) => {
    if (!req.session.accessToken || !req.session.username) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const notes2 = await storage.getNotes(req.session.userId, req.session.username);
    res.json(notes2);
  });
  app2.get("/api/notes/:id", async (req, res) => {
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
  app2.put("/api/notes/:id", async (req, res) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const note = await storage.getNote(parseInt(req.params.id));
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      if (note.userId !== req.session.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const updateData = updateNoteSchema.parse(req.body);
      const updatedNote = await storage.updateNote(note.id, updateData, req.session.username);
      res.json(updatedNote);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });
  app2.delete("/api/notes/:id", async (req, res) => {
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
    const key = note.content.includes("amazonaws.com") ? note.content.split(".amazonaws.com/")[1] : note.content;
    const userNotePath = `notes/${req.session.username}/`;
    if (!key.startsWith(userNotePath)) {
      return res.status(403).json({
        message: "Unauthorized",
        details: `Expected path: ${userNotePath}, Actual key: ${key}`
      });
    }
    try {
      await storage.deleteNote(note.id);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({
        message: error.message,
        details: error.details || "Error occurred during note deletion"
      });
    }
  });
  app2.post("/api/create-payment-intent", async (req, res) => {
    if (!req.session.accessToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        // Convert to cents
        currency: "usd",
        payment_method_types: ["card"],
        // Only allow card payments
        automatic_payment_methods: {
          enabled: false
          // Disable automatic payment methods
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      res.status(500).json({
        message: "Error creating payment intent",
        details: error.message
      });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  abortOnLimit: true,
  createParentPath: true
}));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
