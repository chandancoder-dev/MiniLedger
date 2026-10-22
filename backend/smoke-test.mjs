/**
 * MiniLedger backend smoke test
 * Run with: node smoke-test.mjs  (from backend/)
 * Node 18+ native fetch – no extra dependencies needed.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  \u2705 PASS  ${label}`);
    passed++;
  } else {
    console.error(`  \u274C FAIL  ${label}${detail ? " \u2014 " + detail : ""}`);
    failed++;
  }
}

// Read .env so the child server inherits correct credentials
function loadEnv() {
  const lines = readFileSync(path.join(__dirname, ".env"), "utf8").split(/\r?\n/);
  const env = { ...process.env };
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const capturedOtps = {};

async function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["dist/server.js"], {
      cwd: __dirname,
      env: { ...loadEnv(), PORT: "4001" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      const matches = [...text.matchAll(/MiniLedger mock OTP for (\+?\d+): (\d{6})/g)];
      for (const m of matches) {
        capturedOtps[m[1]] = m[2];
        console.log(`  [server] OTP captured for ${m[1]}: ${m[2]}`);
      }
      if (text.includes("MiniLedger API running")) resolve(child);
    });

    child.stderr.on("data", (chunk) => {
      console.error("[server stderr]", chunk.toString().trim());
    });

    child.on("error", reject);
    setTimeout(() => reject(new Error("Server did not start in time")), 10000);
  });
}

async function waitForOtp(phone, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (capturedOtps[phone]) return capturedOtps[phone];
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

async function runTests() {
  const TEST_PHONE   = "+919900000001";
  const TEST_PHONE_2 = "+919900000002";

  console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("  MiniLedger Backend Smoke Test");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  let server;
  try {
    console.log("\u25B6  Starting isolated test server on port 4001\u2026");
    server = await startServer();
    console.log("   Server ready.\n");
  } catch (err) {
    console.error("Could not start test server:", err.message);
    process.exit(1);
  }

  const B = "http://localhost:4001";
  async function req(method, urlPath, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${B}${urlPath}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    let json;
    try { json = await res.json(); } catch { json = null; }
    return { status: res.status, json };
  }

  // 1. Health
  console.log("\u2500\u2500 1. Health Check \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const r = await req("GET", "/api/health");
    assert("GET /api/health \u2192 200", r.status === 200, `got ${r.status}`);
    assert("database = miniledger", r.json?.database === "miniledger", JSON.stringify(r.json));
  }

  // 2. Malformed auth requests
  console.log("\n\u2500\u2500 2. Malformed Auth Requests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const r1 = await req("POST", "/api/auth/request-otp", {});
    assert("request-otp empty body \u2192 400", r1.status === 400, `got ${r1.status}`);

    const r2 = await req("POST", "/api/auth/request-otp", { phone: "abc" });
    assert("request-otp bad phone \u2192 400", r2.status === 400, `got ${r2.status}`);

    const r3 = await req("POST", "/api/auth/verify-otp", { phone: TEST_PHONE, otp: "abc" });
    assert("verify-otp non-numeric OTP \u2192 400", r3.status === 400, `got ${r3.status}`);
  }

  // 3. Request OTP
  console.log("\n\u2500\u2500 3. Request OTP \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const r = await req("POST", "/api/auth/request-otp", { phone: TEST_PHONE });
    assert("request-otp \u2192 200", r.status === 200, `got ${r.status}: ${JSON.stringify(r.json)}`);
  }
  const otp1 = await waitForOtp(TEST_PHONE);
  assert("OTP captured from server log", otp1 !== null, "timeout");

  // 4. Wrong OTP rejected
  console.log("\n\u2500\u2500 4. Wrong OTP Rejected \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const wrong = otp1 === "000001" ? "000002" : "000001";
    const r = await req("POST", "/api/auth/verify-otp", { phone: TEST_PHONE, otp: wrong });
    assert("verify-otp wrong OTP \u2192 401", r.status === 401, `got ${r.status}`);
  }

  // Re-request fresh OTP (wrong attempt didn't consume it, but let's be safe)
  delete capturedOtps[TEST_PHONE];
  await req("POST", "/api/auth/request-otp", { phone: TEST_PHONE });
  const otp2 = await waitForOtp(TEST_PHONE);
  assert("Fresh OTP captured", otp2 !== null, "timeout");

  // 5. Correct OTP -> JWT
  console.log("\n\u2500\u2500 5. Correct OTP \u2192 JWT \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  let token1 = null;
  let userId1 = null;
  {
    const r = await req("POST", "/api/auth/verify-otp", { phone: TEST_PHONE, otp: otp2 });
    assert("verify-otp correct OTP \u2192 200", r.status === 200, `got ${r.status}: ${JSON.stringify(r.json)}`);
    assert("response.token is string", typeof r.json?.token === "string", JSON.stringify(r.json));
    assert("response.user.id is number", typeof r.json?.user?.id === "number", JSON.stringify(r.json));
    assert("response.user.phone matches", r.json?.user?.phone === TEST_PHONE, JSON.stringify(r.json));
    token1 = r.json?.token ?? null;
    userId1 = r.json?.user?.id ?? null;
    console.log(`   User ID: ${userId1}`);
  }

  // 6. OTP reuse rejected
  console.log("\n\u2500\u2500 6. OTP Reuse Rejected \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const r = await req("POST", "/api/auth/verify-otp", { phone: TEST_PHONE, otp: otp2 });
    assert("OTP reuse \u2192 401", r.status === 401, `got ${r.status}`);
  }

  // 7. Unauthenticated loan requests
  console.log("\n\u2500\u2500 7. Unauthenticated Loan Requests \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    assert("GET /api/loans no token \u2192 401", (await req("GET", "/api/loans")).status === 401);
    assert("POST /api/loans no token \u2192 401", (await req("POST", "/api/loans", { friendName: "X", amount: 100, dueDate: "2099-01-01" })).status === 401);
    assert("GET /api/loans/summary no token \u2192 401", (await req("GET", "/api/loans/summary")).status === 401);
    assert("PATCH /api/loans/1/repay no token \u2192 401", (await req("PATCH", "/api/loans/1/repay")).status === 401);
  }

  // 8. Invalid token
  console.log("\n\u2500\u2500 8. Invalid Token \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
  {
    const r = await req("GET", "/api/loans", null, "not.a.real.jwt");
    assert("invalid token \u2192 401", r.status === 401, `got ${r.status}`);
    assert("correct error message", r.json?.message === "Invalid or expired authentication token.", JSON.stringify(r.json));
  }

  if (!token1) {
    console.error("\n\u26A0\uFE0F  No token \u2014 skipping authenticated loan tests.");
  } else {
    // 9. Create loans
    console.log("\n\u2500\u2500 9. Create Loans \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    let loanId1 = null;
    let loanId2 = null;
    {
      const r1 = await req("POST", "/api/loans", { friendName: "Smoke Alice", amount: 500, dueDate: "2099-12-31" }, token1);
      assert("POST /api/loans (not overdue) \u2192 201", r1.status === 201, `got ${r1.status}: ${JSON.stringify(r1.json)}`);
      assert("loan.amount = 500", r1.json?.loan?.amount === 500, JSON.stringify(r1.json));
      assert("loan.friendName matches", r1.json?.loan?.friendName === "Smoke Alice", JSON.stringify(r1.json));
      assert("loan.repaidAt = null", r1.json?.loan?.repaidAt === null, JSON.stringify(r1.json));
      loanId1 = r1.json?.loan?.id;

      const r2 = await req("POST", "/api/loans", { friendName: "Smoke Bob", amount: 200, dueDate: "2020-01-01" }, token1);
      assert("POST /api/loans (overdue) \u2192 201", r2.status === 201, `got ${r2.status}`);
      loanId2 = r2.json?.loan?.id;

      const r3 = await req("POST", "/api/loans", { friendName: "", amount: -50, dueDate: "bad" }, token1);
      assert("POST /api/loans bad payload \u2192 400", r3.status === 400, `got ${r3.status}`);
    }

    // 10. List loans
    console.log("\n\u2500\u2500 10. List Loans \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    {
      const r = await req("GET", "/api/loans", null, token1);
      assert("GET /api/loans \u2192 200", r.status === 200, `got ${r.status}`);
      assert("loans is array", Array.isArray(r.json?.loans), JSON.stringify(r.json));
      const ids = (r.json?.loans ?? []).map((l) => l.id);
      assert("loanId1 in list", ids.includes(loanId1), `ids=${JSON.stringify(ids)}`);
      assert("loanId2 in list", ids.includes(loanId2), `ids=${JSON.stringify(ids)}`);
    }

    // 11. Summary before repay
    console.log("\n\u2500\u2500 11. Summary (before repay) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    let summaryBefore = null;
    {
      const r = await req("GET", "/api/loans/summary", null, token1);
      assert("GET /api/loans/summary \u2192 200", r.status === 200, `got ${r.status}`);
      assert("totalLent is number", typeof r.json?.totalLent === "number", JSON.stringify(r.json));
      assert("totalRepaid is number", typeof r.json?.totalRepaid === "number", JSON.stringify(r.json));
      assert("overdueAmount is number", typeof r.json?.overdueAmount === "number", JSON.stringify(r.json));
      assert("overdueAmount \u2265 200 (our overdue loan)", (r.json?.overdueAmount ?? 0) >= 200, JSON.stringify(r.json));
      summaryBefore = r.json;
      console.log(`   Before: ${JSON.stringify(r.json)}`);
    }

    // 12. Repay
    console.log("\n\u2500\u2500 12. Repay Loan \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    {
      const r1 = await req("PATCH", `/api/loans/${loanId2}/repay`, null, token1);
      assert(`PATCH /${loanId2}/repay \u2192 200`, r1.status === 200, `got ${r1.status}: ${JSON.stringify(r1.json)}`);
      assert("repaidAt is set", r1.json?.loan?.repaidAt !== null, JSON.stringify(r1.json));

      const r2 = await req("PATCH", `/api/loans/${loanId2}/repay`, null, token1);
      assert("repay already-repaid \u2192 404", r2.status === 404, `got ${r2.status}`);

      const r3 = await req("PATCH", "/api/loans/999999/repay", null, token1);
      assert("repay non-existent \u2192 404", r3.status === 404, `got ${r3.status}`);

      const r4 = await req("PATCH", "/api/loans/0/repay", null, token1);
      assert("repay id=0 \u2192 400", r4.status === 400, `got ${r4.status}`);
    }

    // 13. Summary after repay
    console.log("\n\u2500\u2500 13. Summary (after repay) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    {
      const r = await req("GET", "/api/loans/summary", null, token1);
      assert("GET /api/loans/summary \u2192 200", r.status === 200, `got ${r.status}`);
      assert("overdueAmount = 0 after repay", r.json?.overdueAmount === 0, `got ${r.json?.overdueAmount}`);
      const delta = (r.json?.totalRepaid ?? 0) - (summaryBefore?.totalRepaid ?? 0);
      assert("totalRepaid increased by 200", delta === 200, `delta=${delta}`);
      console.log(`   After:  ${JSON.stringify(r.json)}`);
    }

    // 14. User isolation
    console.log("\n\u2500\u2500 14. User Isolation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
    {
      delete capturedOtps[TEST_PHONE_2];
      await req("POST", "/api/auth/request-otp", { phone: TEST_PHONE_2 });
      const otp3 = await waitForOtp(TEST_PHONE_2);
      assert("OTP for user 2 captured", otp3 !== null, "timeout");

      if (otp3) {
        const lr = await req("POST", "/api/auth/verify-otp", { phone: TEST_PHONE_2, otp: otp3 });
        const token2 = lr.json?.token;
        const userId2 = lr.json?.user?.id;
        assert("User 2 login \u2192 200", lr.status === 200, `got ${lr.status}`);
        assert("User 2 has different id", userId2 !== userId1, `u1=${userId1} u2=${userId2}`);

        if (token2) {
          const r1 = await req("PATCH", `/api/loans/${loanId1}/repay`, null, token2);
          assert("User 2 cannot repay User 1's loan \u2192 404", r1.status === 404, `got ${r1.status}`);

          const r2 = await req("GET", "/api/loans", null, token2);
          assert("GET /api/loans for user 2 \u2192 200", r2.status === 200, `got ${r2.status}`);
          const ids2 = (r2.json?.loans ?? []).map((l) => l.id);
          assert("User 2 cannot see User 1's loans", !ids2.includes(loanId1), `ids2=${JSON.stringify(ids2)}`);
        }
      }
    }
  }

  // Results
  console.log("\n\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");

  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
