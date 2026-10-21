import "dotenv/config";
import { Pool } from "pg";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const pool = new Pool({
  host: requireEnv("DB_HOST"),
  port: Number(process.env.DB_PORT ?? "5432"),
  database: requireEnv("DB_NAME"),
  user: requireEnv("DB_USER"),
  password: requireEnv("DB_PASSWORD"),
  max: 10,
  connectionTimeoutMillis: 5000
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL connection error:", error.message);
});