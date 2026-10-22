import { Router } from "express";
import { randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { pool } from "../config/database.js";

const authRouter = Router();

const pendingOtps = new Map<string, { otp: string; expiresAt: number }>();

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid phone number."),
});

const verifyOtpSchema = phoneSchema.extend({
  otp: z.string().regex(/^\d{6}$/, "OTP must contain six digits."),
});

// POST /api/auth/request-otp
authRouter.post("/request-otp", (req, res) => {
  const parsed = phoneSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid phone number.",
      errors: parsed.error.flatten(),
    });
  }

  const phone = parsed.data.phone;
  const otp = randomInt(100000, 1000000).toString();

  pendingOtps.set(phone, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Mock OTP required by the assignment.
  console.log(`MiniLedger mock OTP for ${phone}: ${otp}`);

  return res.status(200).json({
    message: "OTP generated. Check the backend terminal.",
  });
});

// POST /api/auth/verify-otp
authRouter.post("/verify-otp", async (req, res) => {
  const parsed = verifyOtpSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid phone number or OTP format.",
      errors: parsed.error.flatten(),
    });
  }

  const { phone, otp } = parsed.data;
  const savedOtp = pendingOtps.get(phone);

  if (!savedOtp || savedOtp.expiresAt < Date.now()) {
    pendingOtps.delete(phone);

    return res.status(401).json({
      message: "OTP is missing or expired. Request a new OTP.",
    });
  }

  if (savedOtp.otp !== otp) {
    return res.status(401).json({
      message: "Incorrect OTP.",
    });
  }

  // Prevent successful OTP reuse.
  pendingOtps.delete(phone);

  try {
    const result = await pool.query(
      `INSERT INTO users (phone)
       VALUES ($1)
       ON CONFLICT (phone)
       DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone`,
      [phone],
    );

    const user = result.rows[0] as {
      id: number;
      phone: string;
    };

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is not configured.");
    }

    const token = jwt.sign({ phone: user.phone }, secret, {
      subject: String(user.id),
      expiresIn: "7d",
    });

    return res.status(200).json({
      message: "Login successful.",
      token,
      user,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Unable to complete login.",
    });
  }
});

export default authRouter;
