import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export function registerUploadRoutes(app: Express): void {
  // Upload a file via multipart form data
  app.post("/api/uploads", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const objectPath = `/objects/uploads/${req.file.filename}`;

    res.json({
      objectPath,
      metadata: {
        name: req.file.originalname,
        size: req.file.size,
        contentType: req.file.mimetype,
      },
    });
  });

  // Serve uploaded files
  app.get("/objects/uploads/:filename", (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
  });
}
