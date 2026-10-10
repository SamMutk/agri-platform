import { Router } from "express";
import {
  createEquipment,
  deleteOwnerEquipment,
  getEquipmentListings,
  getOwnerEquipmentListings,
} from "../controllers/equipmentController";
import { verifyToken, requireRole } from "../middleware/auth";
import { uploadEquipmentImages } from "../middleware/equipmentUpload";

const router = Router();

// Public route to view or search equipment listings
router.get("/", getEquipmentListings);

router.get(
  "/mine",
  verifyToken,
  requireRole(["equipment_owner", "admin"]),
  getOwnerEquipmentListings,
);

router.delete(
  "/:id",
  verifyToken,
  requireRole(["equipment_owner"]),
  deleteOwnerEquipment,
);

// Protected route: Only users with 'equipment_owner' role can create listings
router.post(
  "/",
  verifyToken,
  requireRole(["equipment_owner", "admin"]),
  uploadEquipmentImages,
  createEquipment,
);

export default router;
