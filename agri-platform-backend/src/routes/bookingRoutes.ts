import { Router } from "express";
import {
  createBooking,
  simulateMpesaEscrowDeposit,
  getUserBookings,
} from "../controllers/bookingController";
import { verifyToken, requireRole } from "../middleware/auth";

const router = Router();

// Farmer creates a booking request
router.post("/", verifyToken, requireRole(["farmer"]), createBooking);

// Simulate M-Pesa payment into escrow
router.post(
  "/pay-escrow",
  verifyToken,
  requireRole(["farmer"]),
  simulateMpesaEscrowDeposit,
);

// View bookings (accessible by farmers and equipment owners)
router.get("/", verifyToken, getUserBookings);

export default router;
