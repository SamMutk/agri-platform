import { mkdirSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { RequestHandler } from "express";
import multer from "multer";

export const equipmentUploadDirectory = path.resolve(
  __dirname,
  "../../uploads/equipment",
);

mkdirSync(equipmentUploadDirectory, { recursive: true });

const allowedImageTypes: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: equipmentUploadDirectory,
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${allowedImageTypes[file.mimetype]}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes[file.mimetype]) {
      callback(new Error("Only JPEG, PNG, and WebP images are supported."));
      return;
    }
    callback(null, true);
  },
});

export const uploadEquipmentImages: RequestHandler = (req, res, next) => {
  upload.array("images", 5)(req, res, (error: unknown) => {
    if (error) {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      void Promise.allSettled(files.map((file) => unlink(file.path))).then(
        (results) => {
          results.forEach((result) => {
            if (result.status === "rejected") {
              console.error(
                "Failed to remove an incomplete equipment upload:",
                result.reason,
              );
            }
          });
        },
      );
      const message =
        error instanceof multer.MulterError
          ? error.code === "LIMIT_FILE_SIZE"
            ? "Each image must be 5 MB or smaller."
            : "Upload up to 5 images per equipment listing."
          : error instanceof Error
            ? error.message
            : "Image upload failed.";
      res.status(400).json({ status: "error", message });
      return;
    }
    next();
  });
};
