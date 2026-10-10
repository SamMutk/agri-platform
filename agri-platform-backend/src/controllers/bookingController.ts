import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import pool from "../config/db";

// Create Booking Request & Initialize Escrow Payment
export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const client = await pool.connect();
  try {
    const farmerId = req.user?.id;
    const { equipment_id, start_date, end_date, total_acres } = req.body;

    if (!equipment_id || !start_date || !end_date) {
      return res.status(400).json({
        status: "error",
        message: "Please provide equipment_id, start_date, and end_date.",
      });
    }

    await client.query("BEGIN");

    // 1. Fetch Equipment Details & Pricing
    const equipResult = await client.query(
      "SELECT id, owner_id, price_per_acre, price_per_day, is_available FROM equipment WHERE id = $1",
      [equipment_id],
    );

    if (equipResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ status: "error", message: "Equipment listing not found." });
    }

    const equipment = equipResult.rows[0];

    if (!equipment.is_available) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({
          status: "error",
          message: "Selected equipment is currently unavailable.",
        });
    }

    // 2. Calculate Total Amount (using price_per_acre if provided, else default daily calculation)
    let totalAmount = 0;
    if (total_acres && equipment.price_per_acre) {
      totalAmount = Number(total_acres) * Number(equipment.price_per_acre);
    } else if (equipment.price_per_day) {
      const start = new Date(start_date).getTime();
      const end = new Date(end_date).getTime();
      const days = Math.ceil((end - start) / (1000 * 3600 * 24)) || 1;
      totalAmount = days * Number(equipment.price_per_day);
    } else {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({
          status: "error",
          message:
            "Unable to calculate total amount based on pricing structure.",
        });
    }

    // 3. Insert Booking Record
    const bookingQuery = `
      INSERT INTO bookings (farmer_id, equipment_id, start_date, end_date, total_acres, total_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      RETURNING id, farmer_id, equipment_id, start_date, end_date, total_acres, total_amount, status, created_at;
    `;
    const bookingValues = [
      farmerId,
      equipment_id,
      start_date,
      end_date,
      total_acres || null,
      totalAmount,
    ];
    const bookingResult = await client.query(bookingQuery, bookingValues);
    const booking = bookingResult.rows[0];

    // 4. Initialize Payment Record (Escrow Pending)
    const paymentQuery = `
      INSERT INTO payments (booking_id, farmer_id, amount, payment_method, status)
      VALUES ($1, $2, $3, 'M-Pesa', 'pending')
      RETURNING id, amount, status;
    `;
    const paymentResult = await client.query(paymentQuery, [
      booking.id,
      farmerId,
      totalAmount,
    ]);

    await client.query("COMMIT");

    res.status(201).json({
      status: "success",
      message:
        "Booking request created successfully. Proceed to M-Pesa payment escrow deposit.",
      booking,
      payment: paymentResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create booking error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error while creating booking.",
      });
  } finally {
    client.release();
  }
};

// Simulate M-Pesa STK Push & Escrow Deposit Confirmation
export const simulateMpesaEscrowDeposit = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { booking_id, phone_number } = req.body;

    if (!booking_id || !phone_number) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Booking ID and phone number are required.",
        });
    }

    // Check if booking exists
    const bookingResult = await pool.query(
      "SELECT * FROM bookings WHERE id = $1",
      [booking_id],
    );
    if (bookingResult.rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Booking not found." });
    }

    const booking = bookingResult.rows[0];
    const mockTransactionRef = `MPESA${Math.floor(100000000 + Math.random() * 900000000)}`;

    // Update payment record to escrow_held and booking status to confirmed
    await pool.query(
      `UPDATE payments SET status = 'escrow_held', transaction_reference = $1 WHERE booking_id = $2`,
      [mockTransactionRef, booking_id],
    );

    await pool.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [booking_id],
    );

    res.status(200).json({
      status: "success",
      message: "M-Pesa payment received and secured in escrow successfully.",
      transaction_reference: mockTransactionRef,
      amount: booking.total_amount,
      escrow_status: "escrow_held",
      booking_status: "confirmed",
    });
  } catch (error) {
    console.error("M-Pesa escrow error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error processing M-Pesa payment.",
      });
  }
};

// Get Bookings for Authenticated User
export const getUserBookings = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    let query = "";
    if (role === "equipment_owner") {
      query = `
        SELECT b.*, e.name AS equipment_name, u.full_name AS farmer_name, u.phone_number AS farmer_phone
        FROM bookings b
        JOIN equipment e ON b.equipment_id = e.id
        JOIN users u ON b.farmer_id = u.id
        WHERE e.owner_id = $1
        ORDER BY b.created_at DESC;
      `;
    } else {
      query = `
        SELECT b.*, e.name AS equipment_name, u.full_name AS owner_name, u.phone_number AS owner_phone
        FROM bookings b
        JOIN equipment e ON b.equipment_id = e.id
        JOIN users u ON e.owner_id = u.id
        WHERE b.farmer_id = $1
        ORDER BY b.created_at DESC;
      `;
    }

    const result = await pool.query(query, [userId]);

    res.status(200).json({
      status: "success",
      count: result.rows.length,
      bookings: result.rows,
    });
  } catch (error) {
    console.error("Fetch bookings error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error while fetching bookings.",
      });
  }
};
