import {
  users,
  userSettings,
  downloadJobs,
  type User,
  type UpsertUser,
  type UserSettings,
  type InsertUserSettings,
  type DownloadJob,
  type InsertDownloadJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createLocalUser(username: string, passwordHash: string, firstName?: string, lastName?: string, isAdmin?: number): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPreferences(id: string, language: string, theme: string): Promise<User | undefined>;
  
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  createDownloadJob(job: InsertDownloadJob): Promise<DownloadJob>;
  getDownloadJob(id: string): Promise<DownloadJob | undefined>;
  getDownloadJobsByUser(userId: string): Promise<DownloadJob[]>;
  updateDownloadJob(id: string, updates: Partial<DownloadJob>): Promise<DownloadJob | undefined>;
  deleteDownloadJob(id: string): Promise<void>;
  getUploadedToNasJobIds(userId: string): Promise<string[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createLocalUser(
    username: string,
    passwordHash: string,
    firstName?: string,
    lastName?: string,
    isAdmin: number = 0
  ): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        isAdmin,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserPreferences(id: string, language: string, theme: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ language, theme, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings;
  }

  async upsertUserSettings(settingsData: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settingsData.userId);
    
    if (existing) {
      const [settings] = await db
        .update(userSettings)
        .set({ ...settingsData, updatedAt: new Date() })
        .where(eq(userSettings.userId, settingsData.userId))
        .returning();
      return settings;
    } else {
      const [settings] = await db
        .insert(userSettings)
        .values(settingsData)
        .returning();
      return settings;
    }
  }

  async createDownloadJob(jobData: InsertDownloadJob): Promise<DownloadJob> {
    const [job] = await db
      .insert(downloadJobs)
      .values(jobData)
      .returning();
    return job;
  }

  async getDownloadJob(id: string): Promise<DownloadJob | undefined> {
    const [job] = await db
      .select()
      .from(downloadJobs)
      .where(eq(downloadJobs.id, id));
    return job;
  }

  async getDownloadJobsByUser(userId: string): Promise<DownloadJob[]> {
    return await db
      .select()
      .from(downloadJobs)
      .where(eq(downloadJobs.userId, userId))
      .orderBy(desc(downloadJobs.createdAt));
  }

  async updateDownloadJob(id: string, updates: Partial<DownloadJob>): Promise<DownloadJob | undefined> {
    const [job] = await db
      .update(downloadJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(downloadJobs.id, id))
      .returning();
    return job;
  }

  async deleteDownloadJob(id: string): Promise<void> {
    await db.delete(downloadJobs).where(eq(downloadJobs.id, id));
  }

  async getUploadedToNasJobIds(userId: string): Promise<string[]> {
    const { and } = await import("drizzle-orm");
    const jobs = await db
      .select({ id: downloadJobs.id })
      .from(downloadJobs)
      .where(and(
        eq(downloadJobs.userId, userId),
        eq(downloadJobs.uploadedToNas, 1)
      ));
    return jobs.map(job => job.id);
  }
}

export const storage = new DatabaseStorage();
