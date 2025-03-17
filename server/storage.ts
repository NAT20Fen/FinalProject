import { type User, type InsertUser, type File, type InsertFile, type Payment, type InsertPayment, type Note, type InsertNote, type UpdateNote } from "@shared/schema";
import { uploadText, getSignedDownloadUrl, listUserObjects, type S3Object, deleteObject } from "./services/s3";
import { v4 as uuidv4 } from 'uuid';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  verifyUser(id: number): Promise<User>;

  // File operations
  createFile(userId: number, username: string, file: InsertFile): Promise<File>;
  getFiles(userId: number, username: string): Promise<File[]>;

  // Note operations
  createNote(userId: number, username: string, note: InsertNote): Promise<Note>;
  getNotes(userId: number, username: string): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  updateNote(id: number, note: UpdateNote, username: string): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  // Payment operations
  createPayment(userId: number, payment: InsertPayment): Promise<Payment>;
  getPayments(userId: number): Promise<Payment[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private notes: Map<number, Note>;
  private payments: Map<number, Payment>;
  private currentId: { users: number; files: number; notes: number; payments: number };
  private initialized: boolean;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.notes = new Map();
    this.payments = new Map();
    this.currentId = { users: 1, files: 1, notes: 1, payments: 1 };
    this.initialized = false;
  }

  private async ensureInitialized(username?: string) {
    if (!this.initialized && username) {
      await this.rebuildMetadata(username);
      this.initialized = true;
    }
  }

  private async rebuildMetadata(username: string) {
    try {
      const objects = await listUserObjects(username);

      for (const obj of objects) {
        const isNote = obj.key.startsWith('notes/');
        const id = this.currentId[isNote ? 'notes' : 'files']++;

        if (isNote) {
          const note: Note = {
            id,
            userId: 1, // Since we don't have real user IDs in memory storage
            title: obj.key.split('/').pop()?.replace('.txt', '') || 'Untitled',
            content: obj.key, // Store full S3 key
            createdAt: obj.lastModified || new Date(),
            updatedAt: obj.lastModified || new Date(),
          };
          this.notes.set(id, note);
        } else {
          // Extract original filename from the key (get last part of path)
          const filename = obj.key.split('/').pop() || 'unknown';
          const file: File = {
            id,
            userId: 1, // Since we don't have real user IDs in memory storage
            filename: filename,
            filepath: obj.key, // Store full S3 key
            uploadedAt: obj.lastModified || new Date(),
          };
          this.files.set(id, file);
        }
      }
    } catch (error) {
      console.error('Error rebuilding metadata:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const user: User = { ...insertUser, id, isVerified: false };
    this.users.set(id, user);
    return user;
  }

  async verifyUser(id: number): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = { ...user, isVerified: true };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async createFile(userId: number, username: string, insertFile: InsertFile): Promise<File> {
    const id = this.currentId.files++;
    const file: File = {
      ...insertFile,
      id,
      userId,
      uploadedAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async getFiles(userId: number, username: string): Promise<File[]> {
    await this.ensureInitialized(username);
    const objects = await listUserObjects(username);
    const fileKeys = objects.filter(obj => obj.key.startsWith('files/')).map(obj => obj.key);

    return Array.from(this.files.values()).filter(
      (file) => fileKeys.some(key => file.filepath.includes(key))
    );
  }

  async createNote(userId: number, username: string, insertNote: InsertNote): Promise<Note> {
    await this.ensureInitialized(username);
    const id = this.currentId.notes++;
    const now = new Date();
    const safeName = insertNote.title.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitize note title
    const key = `notes/${username}/${safeName}.txt`;

    // Upload content to S3 with username tag
    await uploadText(insertNote.content, key, username);

    const note: Note = {
      ...insertNote,
      id,
      userId,
      content: key, // Store the S3 key in content field
      createdAt: now,
      updatedAt: now,
    };
    this.notes.set(id, note);

    // Return the note with actual content for display
    return {
      ...note,
      content: insertNote.content, // Return the original content for display
    };
  }

  async getNotes(userId: number, username: string): Promise<Note[]> {
    await this.ensureInitialized(username);
    const objects = await listUserObjects(username);
    const noteKeys = objects.filter(obj => obj.key.startsWith('notes/')).map(obj => obj.key);

    const notes = Array.from(this.notes.values()).filter(
      (note) => noteKeys.some(key => key === note.content)
    );

    // Fetch actual content for each note
    return Promise.all(
      notes.map(async (note) => {
        try {
          const signedUrl = await getSignedDownloadUrl(note.content); // note.content is the S3 key
          const response = await fetch(signedUrl);
          const content = await response.text();
          return {
            ...note,
            displayContent: content, // Add displayContent for UI
            content: note.content, // Keep the S3 key in content field
          };
        } catch (error) {
          console.error(`Error fetching note content: ${error}`);
          return note;
        }
      })
    );
  }

  async getNote(id: number): Promise<Note | undefined> {
    const note = this.notes.get(id);
    if (!note) return undefined;

    try {
      const signedUrl = await getSignedDownloadUrl(note.content); // note.content is the S3 key
      const response = await fetch(signedUrl);
      const content = await response.text();
      return {
        ...note,
        s3Key: note.content, // Keep track of the S3 key
        content: content, // Return actual content for editing
      };
    } catch (error) {
      console.error(`Error fetching note content: ${error}`);
      return note;
    }
  }

  async updateNote(id: number, updateNote: UpdateNote, username: string): Promise<Note> {
    const note = this.notes.get(id);
    if (!note) throw new Error("Note not found");

    // Generate a new key if title changed, otherwise use existing key
    const safeName = updateNote.title.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `notes/${username}/${safeName}.txt`;

    // Upload new content to S3
    await uploadText(updateNote.content, key, username);

    const updatedNote: Note = {
      ...note,
      title: updateNote.title,
      content: key, // Store the S3 key
      updatedAt: new Date(),
    };
    this.notes.set(id, updatedNote);

    // Return the note with actual content for display
    return {
      ...updatedNote,
      content: updateNote.content, // Return the actual content for display
    };
  }

  async deleteNote(id: number): Promise<void> {
    const note = this.notes.get(id);
    if (note) {
      try {
        console.log('Deleting note:', {
          id: note.id,
          content: note.content, // This should be the S3 key
          userId: note.userId
        });

        // Delete from S3 first
        await deleteObject(note.content); // Use the S3 key directly

        // Then remove from memory
        this.notes.delete(id);
      } catch (error) {
        console.error('Error deleting note:', error);
        throw error;
      }
    }
  }

  async createPayment(userId: number, insertPayment: InsertPayment): Promise<Payment> {
    const id = this.currentId.payments++;
    const payment: Payment = {
      ...insertPayment,
      id,
      userId,
      createdAt: new Date(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  async getPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.userId === userId,
    );
  }
}

export const storage = new MemStorage();