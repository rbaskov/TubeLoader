import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { downloadRequestSchema, updateSettingsSchema, updatePreferencesSchema, loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import bcrypt from "bcryptjs";
import * as fs from "fs";
import * as path from "path";
import { getVideoInfo, downloadVideo, getDownloadFilePath, cleanupDownloadFile, autoCleanupIfNeeded, saveCookies, ProxyConfig } from "./youtube";

const clients = new Map<string, Set<WebSocket>>();

export function broadcastToUser(userId: string, data: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    const message = JSON.stringify(data);
    userClients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    
    if (userId) {
      if (!clients.has(userId)) {
        clients.set(userId, new Set());
      }
      clients.get(userId)!.add(ws);

      ws.on('close', () => {
        const userClients = clients.get(userId);
        if (userClients) {
          userClients.delete(ws);
          if (userClients.size === 0) {
            clients.delete(userId);
          }
        }
      });
    }

    ws.on('error', console.error);
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        res.status(400).json({ message: "Username already exists" });
        return;
      }
      
      const passwordHash = await bcrypt.hash(validatedData.password, 10);
      const user = await storage.createLocalUser(
        validatedData.username,
        passwordHash,
        validatedData.firstName,
        validatedData.lastName
      );
      
      (req.session as any).userId = user.id;
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        firstName: user.firstName, 
        lastName: user.lastName,
        isAdmin: user.isAdmin 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid registration data", errors: error.errors });
        return;
      }
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user || !user.passwordHash) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }
      
      const isValid = await bcrypt.compare(validatedData.password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ message: "Invalid username or password" });
        return;
      }
      
      (req.session as any).userId = user.id;
      
      res.json({ 
        id: user.id, 
        username: user.username, 
        firstName: user.firstName, 
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        language: user.language,
        theme: user.theme
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid login data", errors: error.errors });
        return;
      }
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ message: "Failed to logout" });
        return;
      }
      res.json({ success: true });
    });
  });

  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      const user = await storage.getUser(userId);
      if (!user) {
        res.status(401).json({ message: "User not found" });
        return;
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    req.authUserId = userId;
    next();
  };

  app.get('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const settings = await storage.getUserSettings(userId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/settings', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const validatedData = updateSettingsSchema.parse(req.body);
      
      // Convert boolean to integer for database storage
      const settingsData: any = {
        userId,
        ...validatedData,
      };
      
      if (typeof validatedData.autoUploadToNas === 'boolean') {
        settingsData.autoUploadToNas = validatedData.autoUploadToNas ? 1 : 0;
      }
      
      if (typeof validatedData.proxyEnabled === 'boolean') {
        settingsData.proxyEnabled = validatedData.proxyEnabled ? 1 : 0;
      }
      
      // Save YouTube cookies to file if provided
      if (validatedData.youtubeCookies && validatedData.youtubeCookies.trim()) {
        saveCookies(validatedData.youtubeCookies);
      }
      
      const settings = await storage.upsertUserSettings(settingsData);
      
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid settings data", errors: error.errors });
        return;
      }
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.put('/api/preferences', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const validatedData = updatePreferencesSchema.parse(req.body);
      
      const user = await storage.updateUserPreferences(
        userId, 
        validatedData.language, 
        validatedData.theme
      );
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid preferences data", errors: error.errors });
        return;
      }
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.get('/api/jobs', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobs = await storage.getDownloadJobsByUser(userId);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/download', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const validatedData = downloadRequestSchema.parse(req.body);
      
      // Get user settings for proxy configuration
      const settings = await storage.getUserSettings(userId);
      const proxyConfig: ProxyConfig | undefined = settings?.proxyEnabled === 1 && settings?.proxyHost && settings?.proxyPort
        ? {
            enabled: true,
            type: (settings.proxyType || "http") as "http" | "https" | "socks4" | "socks5",
            host: settings.proxyHost,
            port: settings.proxyPort,
            username: settings.proxyUsername || undefined,
            password: settings.proxyPassword || undefined,
          }
        : undefined;
      
      let videoInfo;
      try {
        videoInfo = await getVideoInfo(validatedData.url, proxyConfig);
      } catch (infoError) {
        res.status(400).json({ message: `Cannot get video info: ${(infoError as Error).message}` });
        return;
      }
      
      const job = await storage.createDownloadJob({
        userId,
        youtubeUrl: validatedData.url,
        videoTitle: videoInfo.title,
        videoThumbnail: videoInfo.thumbnail,
        format: validatedData.format,
        quality: validatedData.quality || null,
        status: "queued",
        progress: 0,
      });
      
      processDownload(job.id, userId, validatedData.url, validatedData.format, validatedData.quality || null, proxyConfig);
      
      res.json(job);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid download request", errors: error.errors });
        return;
      }
      console.error("Error creating download job:", error);
      res.status(500).json({ message: "Failed to create download job" });
    }
  });

  app.post('/api/jobs/:id/cancel', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobId = req.params.id;
      
      const job = await storage.getDownloadJob(jobId);
      if (!job || job.userId !== userId) {
        res.status(404).json({ message: "Job not found" });
        return;
      }
      
      const updatedJob = await storage.updateDownloadJob(jobId, { 
        status: "failed",
        errorMessage: "Cancelled by user"
      });
      
      broadcastToUser(userId, { type: 'job_update', job: updatedJob });
      
      res.json(updatedJob);
    } catch (error) {
      console.error("Error cancelling job:", error);
      res.status(500).json({ message: "Failed to cancel job" });
    }
  });

  app.post('/api/jobs/:id/retry', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobId = req.params.id;
      
      const job = await storage.getDownloadJob(jobId);
      if (!job || job.userId !== userId) {
        res.status(404).json({ message: "Job not found" });
        return;
      }
      
      cleanupDownloadFile(jobId);
      
      const updatedJob = await storage.updateDownloadJob(jobId, { 
        status: "queued",
        progress: 0,
        errorMessage: null,
        filePath: null,
        fileSize: null,
        uploadedToNas: 0,
      });
      
      broadcastToUser(userId, { type: 'job_update', job: updatedJob });
      
      processDownload(jobId, userId, job.youtubeUrl, job.format as "video" | "audio", job.quality);
      
      res.json(updatedJob);
    } catch (error) {
      console.error("Error retrying job:", error);
      res.status(500).json({ message: "Failed to retry job" });
    }
  });

  app.delete('/api/jobs/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobId = req.params.id;
      
      const job = await storage.getDownloadJob(jobId);
      if (!job || job.userId !== userId) {
        res.status(404).json({ message: "Job not found" });
        return;
      }
      
      cleanupDownloadFile(jobId);
      
      await storage.deleteDownloadJob(jobId);
      
      broadcastToUser(userId, { type: 'job_deleted', jobId });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  app.get('/api/jobs/:id/download', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobId = req.params.id;
      
      const job = await storage.getDownloadJob(jobId);
      if (!job || job.userId !== userId) {
        res.status(404).json({ message: "Job not found" });
        return;
      }
      
      if (job.status !== "completed") {
        res.status(400).json({ message: "Job is not completed yet" });
        return;
      }
      
      const filePath = getDownloadFilePath(jobId, job.format as "video" | "audio");
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).json({ message: "File not found on server" });
        return;
      }
      
      const ext = job.format === "audio" ? "mp3" : "mp4";
      const safeTitle = (job.videoTitle || "video").replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s\-_]/g, "").substring(0, 100);
      const filename = `${safeTitle}.${ext}`;
      
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Content-Type", job.format === "audio" ? "audio/mpeg" : "video/mp4");
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  app.post('/api/jobs/:id/upload-to-nas', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const jobId = req.params.id;
      
      const job = await storage.getDownloadJob(jobId);
      if (!job || job.userId !== userId) {
        res.status(404).json({ message: "Job not found" });
        return;
      }
      
      if (job.status !== "completed") {
        res.status(400).json({ message: "Job is not completed yet" });
        return;
      }
      
      if (job.uploadedToNas === 1) {
        res.status(400).json({ message: "Already uploaded to NAS" });
        return;
      }
      
      const settings = await storage.getUserSettings(userId);
      if (!settings?.synologyEndpoint) {
        res.status(400).json({ message: "TUS server not configured" });
        return;
      }
      
      const filePath = getDownloadFilePath(jobId, job.format as "video" | "audio");
      if (!filePath || !fs.existsSync(filePath)) {
        res.status(404).json({ message: "Downloaded file not found on server" });
        return;
      }
      
      let endpoint = settings.synologyEndpoint.trim().replace(/\/$/, '');
      if (!endpoint.endsWith('/files')) {
        endpoint = endpoint + '/files/';
      } else {
        endpoint = endpoint + '/';
      }

      const fileStats = fs.statSync(filePath);
      const fileSize = fileStats.size;
      
      const ext = job.format === "audio" ? "mp3" : "mp4";
      const safeTitle = (job.videoTitle || "video").replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s\-_]/g, "").substring(0, 100);
      const filename = `${safeTitle}.${ext}`;
      
      const filenameBase64 = Buffer.from(filename).toString('base64');
      
      const headers: Record<string, string> = {
        'Tus-Resumable': '1.0.0',
      };

      console.log(`Uploading file to NAS: ${filename} (${fileSize} bytes)`);

      let createResponse: Response;
      try {
        createResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...headers,
            'Upload-Length': fileSize.toString(),
            'Upload-Metadata': `filename ${filenameBase64}`,
          },
        });
      } catch (fetchError) {
        res.status(400).json({ 
          success: false, 
          message: `Cannot connect to TUS server: ${(fetchError as Error).message}`
        });
        return;
      }

      if (createResponse.status !== 201) {
        const errorText = await createResponse.text().catch(() => '');
        res.status(400).json({ 
          success: false, 
          message: `Upload initialization failed (HTTP ${createResponse.status})`,
          details: errorText || createResponse.statusText
        });
        return;
      }

      const uploadUrl = createResponse.headers.get('Location');
      if (!uploadUrl) {
        res.status(400).json({ 
          success: false, 
          message: "Server did not return upload location"
        });
        return;
      }

      let fullUploadUrl: string;
      if (uploadUrl.startsWith('http://') || uploadUrl.startsWith('https://')) {
        fullUploadUrl = uploadUrl.replace(/^http:/, 'https:');
      } else {
        fullUploadUrl = new URL(uploadUrl, endpoint).toString();
      }
      
      // Set status to uploading and respond immediately
      const uploadingJob = await storage.updateDownloadJob(jobId, { 
        status: "uploading",
        progress: 0,
      });
      broadcastToUser(userId, { type: 'job_update', job: uploadingJob });
      
      // Respond to client that upload has started
      res.json({ 
        success: true, 
        message: "Upload started",
        filename,
        fileSize
      });
      
      // Upload in chunks with progress tracking (async, after response)
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
      let uploadOffset = 0;
      const fileHandle = fs.openSync(filePath, 'r');
      let lastChunkTime = Date.now();
      let lastUploadSpeed = "";
      
      try {
        while (uploadOffset < fileSize) {
          const remainingBytes = fileSize - uploadOffset;
          const chunkSize = Math.min(CHUNK_SIZE, remainingBytes);
          const buffer = Buffer.alloc(chunkSize);
          
          fs.readSync(fileHandle, buffer, 0, chunkSize, uploadOffset);
          
          const chunkStartTime = Date.now();
          const patchResponse = await fetch(fullUploadUrl, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Upload-Offset': uploadOffset.toString(),
              'Content-Type': 'application/offset+octet-stream',
            },
            body: buffer,
          });
          const chunkEndTime = Date.now();

          if (patchResponse.status !== 204 && patchResponse.status !== 200) {
            throw new Error(`TUS patch failed: ${patchResponse.status}`);
          }
          
          // Get new offset from response
          const newOffset = patchResponse.headers.get('Upload-Offset');
          if (newOffset) {
            uploadOffset = parseInt(newOffset, 10);
          } else {
            uploadOffset += chunkSize;
          }
          
          // Calculate upload speed
          const chunkDuration = (chunkEndTime - chunkStartTime) / 1000; // seconds
          if (chunkDuration > 0) {
            const speedBps = chunkSize / chunkDuration;
            if (speedBps >= 1024 * 1024) {
              lastUploadSpeed = `${(speedBps / (1024 * 1024)).toFixed(1)}MiB/s`;
            } else {
              lastUploadSpeed = `${(speedBps / 1024).toFixed(0)}KiB/s`;
            }
          }
          
          // Calculate ETA
          const remainingAfterChunk = fileSize - uploadOffset;
          const speedBps = chunkSize / Math.max(chunkDuration, 0.1);
          const etaSeconds = Math.round(remainingAfterChunk / speedBps);
          const etaFormatted = etaSeconds > 60 
            ? `${Math.floor(etaSeconds / 60)}:${String(etaSeconds % 60).padStart(2, '0')}`
            : `0:${String(etaSeconds).padStart(2, '0')}`;
          
          // Calculate and broadcast upload progress (0-99%)
          const uploadProgress = Math.round((uploadOffset / fileSize) * 99);
          const progressJob = await storage.updateDownloadJob(jobId, { 
            status: "uploading",
            progress: uploadProgress,
          });
          broadcastToUser(userId, { 
            type: 'job_update', 
            job: progressJob,
            speed: lastUploadSpeed,
            eta: etaFormatted,
          });
          
          console.log(`Upload progress: ${uploadOffset}/${fileSize} (${uploadProgress}%) @ ${lastUploadSpeed}`);
          lastChunkTime = chunkEndTime;
        }
        
        fs.closeSync(fileHandle);
        
        const completedJob = await storage.updateDownloadJob(jobId, { 
          status: "completed",
          progress: 100,
          uploadedToNas: 1 
        });
        broadcastToUser(userId, { type: 'job_update', job: completedJob });
        console.log(`File uploaded to NAS successfully: ${filename}`);
        
        // Delete local file after successful upload to NAS
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted local file after manual NAS upload: ${filePath}`);
          }
        } catch (deleteError) {
          console.error(`Failed to delete local file ${filePath}:`, deleteError);
        }
        
      } catch (uploadError) {
        fs.closeSync(fileHandle);
        console.error("Chunk upload error:", uploadError);
        
        const failedJob = await storage.updateDownloadJob(jobId, { 
          status: "failed",
          progress: 0,
          errorMessage: `Upload failed: ${(uploadError as Error).message}`,
        });
        broadcastToUser(userId, { type: 'job_update', job: failedJob });
      }
    } catch (error) {
      console.error("Error uploading to NAS:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to upload to NAS",
        details: (error as Error).message
      });
    }
  });

  // Test Synology/TUS connection with test file upload
  // Based on TUS 1.0.0 protocol: https://tusd.bedovo.ru/files/
  app.post('/api/settings/test-synology', requireAuth, async (req: any, res) => {
    try {
      const userId = req.authUserId;
      const settings = await storage.getUserSettings(userId);
      
      if (!settings?.synologyEndpoint) {
        res.status(400).json({ 
          success: false, 
          message: "TUS server endpoint not configured" 
        });
        return;
      }

      // Ensure endpoint ends with /files/ for tusd
      // Example: https://tusd.bedovo.ru/files/
      let endpoint = settings.synologyEndpoint.trim().replace(/\/$/, '');
      if (!endpoint.endsWith('/files')) {
        endpoint = endpoint + '/files/';
      } else {
        endpoint = endpoint + '/';
      }

      // TUS 1.0.0 headers (no authentication required for tusd.bedovo.ru)
      const headers: Record<string, string> = {
        'Tus-Resumable': '1.0.0',
      };

      // Create 1MB test file (equivalent to: dd if=/dev/zero of=test.bin bs=1M count=1)
      const testFileSize = 1024 * 1024; // 1MB
      const testContent = Buffer.alloc(testFileSize, 0); // Fill with zeros
      const testFileName = `test-connection-${Date.now()}.bin`;
      
      // Encode filename in base64 for Upload-Metadata header
      const filenameBase64 = Buffer.from(testFileName).toString('base64');

      // Step 1: Initialize TUS upload (POST to /files/)
      let createResponse: Response;
      try {
        createResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            ...headers,
            'Upload-Length': testFileSize.toString(),
            'Upload-Metadata': `filename ${filenameBase64}`,
          },
        });
      } catch (fetchError) {
        res.status(400).json({ 
          success: false, 
          message: `Cannot connect to TUS server: ${(fetchError as Error).message}`,
          details: "Check if the server URL is correct and accessible via HTTPS"
        });
        return;
      }

      // Expect 201 Created
      if (createResponse.status !== 201) {
        const errorText = await createResponse.text().catch(() => '');
        const tusVersion = createResponse.headers.get('Tus-Resumable');
        
        if (!tusVersion) {
          res.status(400).json({ 
            success: false, 
            message: "Server does not support TUS protocol",
            details: `HTTP ${createResponse.status}: Server did not return Tus-Resumable header`
          });
          return;
        }
        
        res.status(400).json({ 
          success: false, 
          message: `Upload initialization failed (HTTP ${createResponse.status})`,
          details: errorText || createResponse.statusText
        });
        return;
      }

      // Get upload location from response
      const uploadUrl = createResponse.headers.get('Location');
      if (!uploadUrl) {
        res.status(400).json({ 
          success: false, 
          message: "Server did not return upload location",
          details: "TUS server must return Location header with upload ID"
        });
        return;
      }

      // Step 2: Upload file content (PATCH to upload location)
      // Handle both absolute URLs (http://...) and relative URLs (/files/...)
      let fullUploadUrl: string;
      if (uploadUrl.startsWith('http://') || uploadUrl.startsWith('https://')) {
        // Absolute URL - force HTTPS if server returned HTTP
        fullUploadUrl = uploadUrl.replace(/^http:/, 'https:');
      } else {
        // Relative URL - construct from endpoint
        fullUploadUrl = new URL(uploadUrl, endpoint).toString();
      }
      
      let patchResponse: Response;
      try {
        patchResponse = await fetch(fullUploadUrl, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Upload-Offset': '0',
            'Content-Type': 'application/offset+octet-stream',
          },
          body: testContent,
        });
      } catch (patchError) {
        res.status(400).json({ 
          success: false, 
          message: `Failed to upload test file: ${(patchError as Error).message}`,
        });
        return;
      }

      // Expect 204 No Content
      if (patchResponse.status !== 204 && patchResponse.status !== 200) {
        const errorText = await patchResponse.text().catch(() => '');
        res.status(400).json({ 
          success: false, 
          message: `Upload failed (HTTP ${patchResponse.status})`,
          details: errorText || patchResponse.statusText
        });
        return;
      }

      // Verify upload completed successfully
      const uploadOffset = patchResponse.headers.get('Upload-Offset');
      const uploadComplete = uploadOffset === testFileSize.toString();

      // Step 3: Clean up test file (optional - not all TUS servers support DELETE)
      try {
        await fetch(fullUploadUrl, {
          method: 'DELETE',
          headers,
        });
      } catch {
        // Silently ignore - DELETE may not be supported
      }

      res.json({ 
        success: true, 
        message: "Connection successful",
        details: `Test file uploaded (1MB): ${testFileName}${uploadComplete ? ' ✓' : ''}`
      });
    } catch (error) {
      console.error("Error testing TUS connection:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during connection test",
        details: (error as Error).message
      });
    }
  });

  return httpServer;
}

async function processDownload(
  jobId: string, 
  userId: string, 
  url: string, 
  format: "video" | "audio", 
  quality: string | null,
  proxyConfig?: ProxyConfig
) {
  try {
    // Auto cleanup old files if disk space is low (<5GB) - only for current user
    await autoCleanupIfNeeded(async () => storage.getUploadedToNasJobIds(userId));
    
    const updatedJob = await storage.updateDownloadJob(jobId, { 
      status: "downloading",
      progress: 0,
    });
    broadcastToUser(userId, { type: 'job_update', job: updatedJob });
    
    const result = await downloadVideo(
      url,
      jobId,
      format,
      quality,
      async (progress) => {
        const currentJob = await storage.getDownloadJob(jobId);
        if (!currentJob || currentJob.status === "failed") {
          return;
        }
        
        const job = await storage.updateDownloadJob(jobId, {
          status: progress.status,
          progress: Math.round(progress.progress),
          errorMessage: progress.error || null,
        });
        
        // Send job update with speed and ETA info
        broadcastToUser(userId, { 
          type: 'job_update', 
          job,
          speed: progress.speed,
          eta: progress.eta,
        });
      },
      proxyConfig
    );
    
    const completedJob = await storage.updateDownloadJob(jobId, {
      status: "completed",
      progress: 100,
      filePath: result.filePath,
      fileSize: result.fileSize,
    });
    
    broadcastToUser(userId, { type: 'job_update', job: completedJob });
    
    console.log(`Download completed: ${jobId}, file: ${result.filePath}, size: ${result.fileSize}`);
    
    const settings = await storage.getUserSettings(userId);
    if (settings?.synologyEndpoint && settings?.autoUploadToNas === 1) {
      console.log(`Auto-uploading to NAS for job ${jobId}`);
      try {
        await autoUploadToNas(jobId, userId, settings.synologyEndpoint);
      } catch (uploadError) {
        console.error(`Auto-upload failed for job ${jobId}:`, uploadError);
      }
    }
    
  } catch (error) {
    console.error(`Download failed for job ${jobId}:`, error);
    
    const failedJob = await storage.updateDownloadJob(jobId, {
      status: "failed",
      progress: 0,
      errorMessage: (error as Error).message,
    });
    
    broadcastToUser(userId, { type: 'job_update', job: failedJob });
  }
}

async function autoUploadToNas(jobId: string, userId: string, endpoint: string) {
  const job = await storage.getDownloadJob(jobId);
  if (!job || job.status !== "completed") return;
  
  const filePath = getDownloadFilePath(jobId, job.format as "video" | "audio");
  if (!filePath || !fs.existsSync(filePath)) {
    console.error(`File not found for auto-upload: ${jobId}`);
    return;
  }
  
  let tusEndpoint = endpoint.trim().replace(/\/$/, '');
  if (!tusEndpoint.endsWith('/files')) {
    tusEndpoint = tusEndpoint + '/files/';
  } else {
    tusEndpoint = tusEndpoint + '/';
  }

  const fileStats = fs.statSync(filePath);
  const fileSize = fileStats.size;
  
  const ext = job.format === "audio" ? "mp3" : "mp4";
  const safeTitle = (job.videoTitle || "video").replace(/[^a-zA-Z0-9а-яА-ЯёЁ\s\-_]/g, "").substring(0, 100);
  const filename = `${safeTitle}.${ext}`;
  
  const filenameBase64 = Buffer.from(filename).toString('base64');
  
  const headers: Record<string, string> = {
    'Tus-Resumable': '1.0.0',
  };

  // Start uploading status - progress will only increase from here
  const updatingJob = await storage.updateDownloadJob(jobId, { 
    status: "uploading",
    progress: 90,
  });
  broadcastToUser(userId, { type: 'job_update', job: updatingJob });

  const createResponse = await fetch(tusEndpoint, {
    method: 'POST',
    headers: {
      ...headers,
      'Upload-Length': fileSize.toString(),
      'Upload-Metadata': `filename ${filenameBase64}`,
    },
  });

  if (createResponse.status !== 201) {
    throw new Error(`TUS create failed: ${createResponse.status}`);
  }

  const uploadUrl = createResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('No upload URL returned');
  }

  let fullUploadUrl: string;
  if (uploadUrl.startsWith('http://') || uploadUrl.startsWith('https://')) {
    fullUploadUrl = uploadUrl.replace(/^http:/, 'https:');
  } else {
    fullUploadUrl = new URL(uploadUrl, tusEndpoint).toString();
  }
  
  // Upload in chunks with progress tracking
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  let uploadOffset = 0;
  const fileHandle = fs.openSync(filePath, 'r');
  let lastUploadSpeed = "";
  
  try {
    while (uploadOffset < fileSize) {
      const remainingBytes = fileSize - uploadOffset;
      const chunkSize = Math.min(CHUNK_SIZE, remainingBytes);
      const buffer = Buffer.alloc(chunkSize);
      
      fs.readSync(fileHandle, buffer, 0, chunkSize, uploadOffset);
      
      const chunkStartTime = Date.now();
      const patchResponse = await fetch(fullUploadUrl, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Upload-Offset': uploadOffset.toString(),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: buffer,
      });
      const chunkEndTime = Date.now();

      if (patchResponse.status !== 204 && patchResponse.status !== 200) {
        throw new Error(`TUS patch failed: ${patchResponse.status}`);
      }
      
      // Get new offset from response
      const newOffset = patchResponse.headers.get('Upload-Offset');
      if (newOffset) {
        uploadOffset = parseInt(newOffset, 10);
      } else {
        uploadOffset += chunkSize;
      }
      
      // Calculate upload speed
      const chunkDuration = (chunkEndTime - chunkStartTime) / 1000;
      if (chunkDuration > 0) {
        const speedBps = chunkSize / chunkDuration;
        if (speedBps >= 1024 * 1024) {
          lastUploadSpeed = `${(speedBps / (1024 * 1024)).toFixed(1)}MiB/s`;
        } else {
          lastUploadSpeed = `${(speedBps / 1024).toFixed(0)}KiB/s`;
        }
      }
      
      // Calculate ETA
      const remainingAfterChunk = fileSize - uploadOffset;
      const speedBps = chunkSize / Math.max(chunkDuration, 0.1);
      const etaSeconds = Math.round(remainingAfterChunk / speedBps);
      const etaFormatted = etaSeconds > 60 
        ? `${Math.floor(etaSeconds / 60)}:${String(etaSeconds % 60).padStart(2, '0')}`
        : `0:${String(etaSeconds).padStart(2, '0')}`;
      
      // Calculate and broadcast upload progress (90-99%)
      const uploadProgress = 90 + Math.round((uploadOffset / fileSize) * 9);
      const progressJob = await storage.updateDownloadJob(jobId, { 
        status: "uploading",
        progress: uploadProgress,
      });
      broadcastToUser(userId, { 
        type: 'job_update', 
        job: progressJob,
        speed: lastUploadSpeed,
        eta: etaFormatted,
      });
      
      console.log(`Upload progress: ${uploadOffset}/${fileSize} (${uploadProgress}%) @ ${lastUploadSpeed}`);
    }
  } finally {
    fs.closeSync(fileHandle);
  }

  const completedJob = await storage.updateDownloadJob(jobId, { 
    status: "completed",
    progress: 100,
    uploadedToNas: 1 
  });
  
  broadcastToUser(userId, { type: 'job_update', job: completedJob });
  
  console.log(`Auto-upload completed: ${filename}`);
  
  // Delete local file after successful upload to NAS
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted local file after NAS upload: ${filePath}`);
    }
  } catch (deleteError) {
    console.error(`Failed to delete local file ${filePath}:`, deleteError);
  }
}
