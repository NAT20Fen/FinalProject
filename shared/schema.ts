import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
});

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  amount: text("amount").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFileSchema = createInsertSchema(files).pick({
  filename: true,
  filepath: true,
});

export const insertNoteSchema = createInsertSchema(notes).pick({
  title: true,
  content: true,
});

export const updateNoteSchema = createInsertSchema(notes).pick({
  title: true,
  content: true,
});

export const insertPaymentSchema = createInsertSchema(payments).pick({
  amount: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type UpdateNote = z.infer<typeof updateNoteSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type User = typeof users.$inferSelect;
export type File = typeof files.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Payment = typeof payments.$inferSelect;