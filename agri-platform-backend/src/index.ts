import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db";
import authRoutes from "./routes/authRoutes";
import equipmentRoutes from "./routes/equipmentRoutes";
import bookingRoutes from "./routes/bookingRoutes"; // Add import
import { equipmentUploadDirectory } from "./middleware/equipmentUpload";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads/equipment", express.static(equipmentUploadDirectory));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/bookings", bookingRoutes); // Mount booking routes

// Health Check Endpoint
app.get("/api/health", async (req: Request, res: Response) => {
  try {
    const dbResult = await pool.query("SELECT NOW()");
    res.status(200).json({
      status: "success",
      message: "Agri Resource Sharing Platform API is running",
      databaseTime: dbResult.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Database connection failed" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
