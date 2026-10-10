import { Response } from "express";
import { unlink } from "fs/promises";
import path from "path";
import { PoolClient } from "pg";
import { AuthenticatedRequest } from "../middleware/auth";
import { equipmentUploadDirectory } from "../middleware/equipmentUpload";
import pool from "../config/db";

const removeUploadedImages = async (files: Express.Multer.File[]) => {
  const results = await Promise.allSettled(
    files.map((file) => unlink(file.path)),
  );
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Failed to remove an unused equipment image:", result.reason);
    }
  });
};

// Create Equipment Listing
export const createEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const uploadedImages = (req.files as Express.Multer.File[] | undefined) ?? [];
  try {
    const ownerId = req.user?.id;
    const {
      name,
      category,
      description,
      capacity_spec,
      price_per_acre,
      price_per_day,
      condition_status,
      latitude,
      longitude,
      service_radius_km,
    } = req.body;

    if (
      !name ||
      !category ||
      !price_per_acre ||
      latitude === undefined ||
      longitude === undefined
    ) {
      await removeUploadedImages(uploadedImages);
      return res.status(400).json({
        status: "error",
        message:
          "Please provide name, category, price per acre, and location coordinates (latitude & longitude).",
      });
    }

    // Insert equipment listing with PostGIS geography point from lon/lat
    const query = `
      INSERT INTO equipment 
        (owner_id, name, category, description, capacity_spec, price_per_acre, price_per_day, condition_status, location, service_radius_km, image_urls)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10), 4326)::geography, $11, $12)
      RETURNING id, name, category, description, capacity_spec, price_per_acre, price_per_day, condition_status, service_radius_km, image_urls, created_at;
    `;

    const values = [
      ownerId,
      name,
      category,
      description || null,
      capacity_spec || null,
      price_per_acre,
      price_per_day || null,
      condition_status || "Good",
      longitude, // PostGIS expects longitude first in MakePoint
      latitude,
      service_radius_km || 20,
      uploadedImages.map((file) => `/uploads/equipment/${file.filename}`),
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      status: "success",
      message: "Equipment listed successfully.",
      equipment: result.rows[0],
    });
  } catch (error) {
    await removeUploadedImages(uploadedImages);
    console.error("Create equipment error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error while listing equipment.",
      });
  }
};

// Get All Equipment / Proximity Search
export const getEquipmentListings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { category, lat, lon, radius_km } = req.query;

    let query = `
      SELECT 
        e.id, e.name, e.category, e.description, e.capacity_spec, 
        e.price_per_acre, e.price_per_day, e.condition_status, e.service_radius_km, e.is_available,
        e.image_urls,
        ST_Y(e.location::geometry) AS latitude,
        ST_X(e.location::geometry) AS longitude,
        u.full_name AS owner_name, u.phone_number AS owner_phone, u.county, u.sub_county
      FROM equipment e
      JOIN users u ON e.owner_id = u.id
      WHERE e.is_available = TRUE
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    // Filter by category if provided
    if (category) {
      query += ` AND e.category ILIKE $${paramIndex}`;
      queryParams.push(`%${category}%`);
      paramIndex++;
    }

    // Filter by proximity using PostGIS ST_DWithin if lat and lon are provided
    if (lat && lon) {
      const radiusMeters = (Number(radius_km) || 30) * 1000; // default to 30km radius converted to meters
      query += ` AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint($${paramIndex + 1}, $${paramIndex}), 4326)::geography, $${paramIndex + 2})`;
      queryParams.push(Number(lat), Number(lon), radiusMeters);
      paramIndex += 3;
    }

    query += ` ORDER BY e.created_at DESC;`;

    const result = await pool.query(query, queryParams);

    res.status(200).json({
      status: "success",
      count: result.rows.length,
      equipment: result.rows,
    });
  } catch (error) {
    console.error("Fetch equipment error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error while fetching equipment.",
      });
  }
};

export const getOwnerEquipmentListings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const result = await pool.query(
      `
        SELECT
          e.id, e.name, e.category, e.description, e.capacity_spec,
          e.price_per_acre, e.price_per_day, e.condition_status,
          e.service_radius_km, e.is_available, e.image_urls,
          ST_Y(e.location::geometry) AS latitude,
          ST_X(e.location::geometry) AS longitude
        FROM equipment e
        WHERE e.owner_id = $1
        ORDER BY e.created_at DESC;
      `,
      [req.user?.id],
    );

    res.status(200).json({
      status: "success",
      count: result.rows.length,
      equipment: result.rows,
    });
  } catch (error) {
    console.error("Fetch owner equipment error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error while fetching your equipment.",
    });
  }
};

export const deleteOwnerEquipment = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const equipmentId = Number(req.params.id);
  const ownerId = req.user?.id;

  if (!Number.isSafeInteger(equipmentId) || equipmentId <= 0 || !ownerId) {
    return res.status(400).json({
      status: "error",
      message: "A valid equipment listing is required.",
    });
  }

  let client: PoolClient | null = null;
  let imageUrls: string[] = [];
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    const equipmentResult = await client.query(
      "SELECT image_urls FROM equipment WHERE id = $1 AND owner_id = $2 FOR UPDATE",
      [equipmentId, ownerId],
    );

    if (equipmentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "error",
        message: "Equipment listing not found.",
      });
    }

    const bookingResult = await client.query(
      "SELECT 1 FROM bookings WHERE equipment_id = $1 LIMIT 1",
      [equipmentId],
    );
    if (bookingResult.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "error",
        message:
          "This machine has booking records and cannot be deleted. Mark it unavailable instead.",
      });
    }

    imageUrls = equipmentResult.rows[0].image_urls ?? [];
    await client.query(
      "DELETE FROM equipment WHERE id = $1 AND owner_id = $2",
      [equipmentId, ownerId],
    );
    await client.query("COMMIT");

    const results = await Promise.allSettled(
      imageUrls.map((imageUrl) =>
        unlink(
          path.join(
            equipmentUploadDirectory,
            path.basename(imageUrl),
          ),
        ),
      ),
    );
    results.forEach((result) => {
      if (result.status === "rejected") {
        const reason: unknown = result.reason;
        if (
          typeof reason === "object" &&
          reason !== null &&
          "code" in reason &&
          reason.code === "ENOENT"
        ) {
          return;
        }
        console.error("Failed to remove a deleted equipment image:", reason);
      }
    });

    return res.status(200).json({
      status: "success",
      message: "Equipment listing deleted successfully.",
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back equipment deletion:", rollbackError);
      }
    }
    console.error("Delete equipment error:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error while deleting equipment.",
    });
  } finally {
    client?.release();
  }
};
