import { Router } from "express";
import { z } from "zod";
import { pool } from "../config/database.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const loanRouter = Router();

loanRouter.use(requireAuth);

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date.");

const createLoanSchema = z.object({
  friendName: z.string().trim().min(1).max(100),
  amount: z.coerce.number().finite().positive(),
  dueDate: dateSchema,
});

// GET /api/loans - List the logged-in user's loans.
loanRouter.get("/", async (_req, res) => {
  const userId = res.locals.userId as number;

  try {
    const result = await pool.query(
      `SELECT
         id,
         friend_name AS "friendName",
         amount,
         due_date::text AS "dueDate",
         repaid_at AS "repaidAt",
         created_at AS "createdAt"
       FROM loans
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const loans = result.rows.map((loan) => ({
      ...loan,
      amount: Number(loan.amount),
    }));

    return res.status(200).json({ loans });
  } catch (error) {
    console.error("Failed to fetch loans:", error);

    return res.status(500).json({
      message: "Unable to fetch loans.",
    });
  }
});

// POST /api/loans - Create a loan entry.
loanRouter.post("/", async (req, res) => {
  const parsed = createLoanSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid loan details.",
      errors: parsed.error.flatten(),
    });
  }

  const userId = res.locals.userId as number;
  const { friendName, amount, dueDate } = parsed.data;

  try {
    const result = await pool.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         friend_name AS "friendName",
         amount,
         due_date::text AS "dueDate",
         repaid_at AS "repaidAt",
         created_at AS "createdAt"`,
      [userId, friendName, amount, dueDate]
    );

    const loan = result.rows[0];

    return res.status(201).json({
      message: "Loan created successfully.",
      loan: {
        ...loan,
        amount: Number(loan.amount),
      },
    });
  } catch (error) {
    console.error("Failed to create loan:", error);

    return res.status(500).json({
      message: "Unable to create loan.",
    });
  }
});

// PATCH /api/loans/:id/repay - Mark a loan as repaid.
loanRouter.patch("/:id/repay", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return res.status(400).json({
      message: "Invalid loan ID.",
    });
  }

  const userId = res.locals.userId as number;

  try {
    const result = await pool.query(
      `UPDATE loans
       SET repaid_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND repaid_at IS NULL
       RETURNING
         id,
         friend_name AS "friendName",
         amount,
         due_date::text AS "dueDate",
         repaid_at AS "repaidAt"`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Unpaid loan not found.",
      });
    }

    const loan = result.rows[0];

    return res.status(200).json({
      message: "Loan marked as repaid.",
      loan: {
        ...loan,
        amount: Number(loan.amount),
      },
    });
  } catch (error) {
    console.error("Failed to update loan:", error);

    return res.status(500).json({
      message: "Unable to mark loan as repaid.",
    });
  }
});

// GET /api/loans/summary - Financial summary for the logged-in user.
loanRouter.get("/summary", async (_req, res) => {
  const userId = res.locals.userId as number;

  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0) AS total_lent,
         COALESCE(
           SUM(amount) FILTER (WHERE repaid_at IS NOT NULL),
           0
         ) AS total_repaid,
         COALESCE(
           SUM(amount) FILTER (
             WHERE repaid_at IS NULL AND due_date < CURRENT_DATE
           ),
           0
         ) AS overdue_amount
       FROM loans
       WHERE user_id = $1`,
      [userId]
    );

    const summary = result.rows[0];

    return res.status(200).json({
      totalLent: Number(summary.total_lent),
      totalRepaid: Number(summary.total_repaid),
      overdueAmount: Number(summary.overdue_amount),
    });
  } catch (error) {
    console.error("Failed to calculate summary:", error);

    return res.status(500).json({
      message: "Unable to calculate loan summary.",
    });
  }
});

export default loanRouter;