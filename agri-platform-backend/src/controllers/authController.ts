import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomInt } from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db";

const passwordResetLifetimeMinutes = 10;
const passwordResetCooldownSeconds = 60;
const passwordResetMaxAttempts = 5;

const toE164PhoneNumber = (phoneNumber: string) =>
  phoneNumber.startsWith("+")
    ? phoneNumber
    : `+254${phoneNumber.slice(1)}`;

const sendPasswordResetCode = async (phoneNumber: string, code: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Twilio password-reset SMS is not configured.");
  }

  const body = new URLSearchParams({
    To: phoneNumber,
    From: fromPhone,
    Body: `Your AgriShare password reset code is ${code}. It expires in ${passwordResetLifetimeMinutes} minutes.`,
  });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(10000),
    },
  );

  if (!response.ok) {
    console.error("Twilio rejected a password-reset SMS:", response.status);
    throw new Error("Password-reset SMS could not be sent.");
  }
};

// Register User
export const register = async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      phone_number,
      email,
      password,
      role,
      county,
      sub_county,
    } = req.body;

    // Validate required fields
    if (!full_name || !phone_number || !password || !role) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Please fill in all required fields.",
        });
    }

    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1",
      [phone_number],
    );
    if (userExists.rows.length > 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "User with this phone number already exists.",
        });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user into database
    const newUserQuery = `
      INSERT INTO users (full_name, phone_number, email, password_hash, role, county, sub_county)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, full_name, phone_number, email, role, county, sub_county, created_at;
    `;

    const values = [
      full_name,
      phone_number,
      email || null,
      passwordHash,
      role,
      county || null,
      sub_county || null,
    ];
    const newUserData = await pool.query(newUserQuery, values);

    res.status(201).json({
      status: "success",
      message: "User registered successfully.",
      user: newUserData.rows[0],
    });
  } catch (error) {
    console.error("Registration error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error during registration.",
      });
  }
};

// Login User
export const login = async (req: Request, res: Response) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Please provide phone number and password.",
        });
    }

    // Find user by phone number
    const userResult = await pool.query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phone_number],
    );
    if (userResult.rows.length === 0) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials." });
    }

    const user = userResult.rows[0];

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials." });
    }

    // Generate JWT Token
    const secret = process.env.JWT_SECRET || "fallback_secret";
    const token = jwt.sign(
      { id: user.id, role: user.role, phone_number: user.phone_number },
      secret,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      status: "success",
      message: "Logged in successfully.",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone_number: user.phone_number,
        email: user.email,
        role: user.role,
        county: user.county,
        sub_county: user.sub_county,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({
        status: "error",
        message: "Internal server error during login.",
      });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const phoneNumber = req.body.phone_number;
  if (typeof phoneNumber !== "string" || !phoneNumber.trim()) {
    return res.status(400).json({
      status: "error",
      message: "Please provide your registered phone number.",
    });
  }

  const normalizedPhone = phoneNumber.trim();
  if (!/^(?:0[17]\d{8}|\+254[17]\d{8})$/.test(normalizedPhone)) {
    return res.status(400).json({
      status: "error",
      message: "Enter a valid Kenyan phone number.",
    });
  }

  let client;
  try {
    const userResult = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1",
      [normalizedPhone],
    );
    if (userResult.rows.length === 0) {
      return res.status(200).json({
        status: "success",
        message:
          "If the number is registered, a verification code will be sent.",
      });
    }

    const userId: number = userResult.rows[0].id;
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [userId]);

    const existingCode = await client.query(
      `
        SELECT last_sent_at
        FROM password_reset_codes
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId],
    );
    const lastSentAt: Date | undefined = existingCode.rows[0]?.last_sent_at;
    if (
      lastSentAt &&
      Date.now() - new Date(lastSentAt).getTime() <
        passwordResetCooldownSeconds * 1000
    ) {
      await client.query("COMMIT");
      return res.status(200).json({
        status: "success",
        message:
          "If the number is registered, a verification code will be sent.",
      });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = await bcrypt.hash(code, 10);
    await client.query(
      `
        INSERT INTO password_reset_codes
          (user_id, code_hash, expires_at, attempts, last_sent_at)
        VALUES ($1, $2, NOW() + ($3 * INTERVAL '1 minute'), 0, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          expires_at = EXCLUDED.expires_at,
          attempts = 0,
          last_sent_at = EXCLUDED.last_sent_at
      `,
      [userId, codeHash, passwordResetLifetimeMinutes],
    );

    await sendPasswordResetCode(toE164PhoneNumber(normalizedPhone), code);
    await client.query("COMMIT");
    return res.status(200).json({
      status: "success",
      message:
        "If the number is registered, a verification code will be sent.",
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back password-reset request:", rollbackError);
      }
    }
    console.error("Password-reset code request failed:", error);
    return res.status(503).json({
      status: "error",
      message:
        "We could not send a verification code right now. Please try again later.",
    });
  } finally {
    client?.release();
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { phone_number, verification_code, new_password } = req.body;

  if (
    typeof phone_number !== "string" ||
    typeof verification_code !== "string" ||
    typeof new_password !== "string"
  ) {
    return res.status(400).json({
      status: "error",
      message: "Provide your phone number, verification code, and new password.",
    });
  }
  if (!/^(?:0[17]\d{8}|\+254[17]\d{8})$/.test(phone_number)) {
    return res.status(400).json({
      status: "error",
      message: "Enter a valid Kenyan phone number.",
    });
  }
  if (!/^\d{6}$/.test(verification_code)) {
    return res.status(400).json({
      status: "error",
      message: "The verification code must contain 6 digits.",
    });
  }
  if (new_password.length !== 8) {
    return res.status(400).json({
      status: "error",
      message: "Your new password must be exactly 8 characters.",
    });
  }

  let client;
  try {
    const userResult = await pool.query(
      "SELECT id FROM users WHERE phone_number = $1",
      [phone_number],
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "The code is invalid or has expired.",
      });
    }

    const userId: number = userResult.rows[0].id;
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [userId]);

    const resetResult = await client.query(
      `
        SELECT code_hash, expires_at, attempts
        FROM password_reset_codes
        WHERE user_id = $1
        FOR UPDATE
      `,
      [userId],
    );
    if (resetResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        status: "error",
        message: "The code is invalid or has expired.",
      });
    }

    const reset = resetResult.rows[0] as {
      code_hash: string;
      expires_at: Date;
      attempts: number;
    };
    if (
      new Date(reset.expires_at).getTime() <= Date.now() ||
      reset.attempts >= passwordResetMaxAttempts
    ) {
      await client.query(
        "DELETE FROM password_reset_codes WHERE user_id = $1",
        [userId],
      );
      await client.query("COMMIT");
      return res.status(400).json({
        status: "error",
        message: "The code is invalid or has expired.",
      });
    }

    const codeMatches = await bcrypt.compare(
      verification_code,
      reset.code_hash,
    );
    if (!codeMatches) {
      const attempts = reset.attempts + 1;
      if (attempts >= passwordResetMaxAttempts) {
        await client.query(
          "DELETE FROM password_reset_codes WHERE user_id = $1",
          [userId],
        );
      } else {
        await client.query(
          "UPDATE password_reset_codes SET attempts = $2 WHERE user_id = $1",
          [userId, attempts],
        );
      }
      await client.query("COMMIT");
      return res.status(400).json({
        status: "error",
        message:
          attempts >= passwordResetMaxAttempts
            ? "Too many incorrect codes. Request a new code."
            : "The code is invalid or has expired.",
      });
    }

    const passwordHash = await bcrypt.hash(new_password, 10);
    await client.query("UPDATE users SET password_hash = $2 WHERE id = $1", [
      userId,
      passwordHash,
    ]);
    await client.query("DELETE FROM password_reset_codes WHERE user_id = $1", [
      userId,
    ]);
    await client.query("COMMIT");

    return res.status(200).json({
      status: "success",
      message: "Your password has been reset. You can now log in.",
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back password reset:", rollbackError);
      }
    }
    console.error("Password reset failed:", error);
    return res.status(500).json({
      status: "error",
      message: "We could not reset your password. Please try again.",
    });
  } finally {
    client?.release();
  }
};
