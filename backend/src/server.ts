import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./config/database.js";
import authRouter from "./routes/auth.routes.js";
import loanRouter from "./routes/loan.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/loans", loanRouter);

app.get("/", (_req, res) => {
  res.json({
    message: "Welcome to MiniLedger API",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT current_database() AS database");

    res.status(200).json({
      status: "ok",
      database: result.rows[0].database,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    res.status(503).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`MiniLedger API running at http://localhost:${port}`);
});
