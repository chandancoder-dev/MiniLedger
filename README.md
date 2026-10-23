# MiniLedger

MiniLedger is a small lending ledger for tracking loans between friends. The mobile client uses Expo and React Native; the API uses Express, TypeScript, PostgreSQL, and JWT authentication. The app supports phone OTP sign-in (mock OTP in the backend terminal), loan creation, repayment tracking, and live summary totals.

## Requirements

- Node.js and npm
- PostgreSQL
- Expo Go on a device, or an Android/iOS simulator

## PostgreSQL setup

Create a database named `miniledger`, then connect to it and create the tables:

```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(16) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loans (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_name VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  repaid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX loans_user_id_created_at_idx ON loans(user_id, created_at DESC);
```

## Environment configuration

Copy `backend/.env.example` to `backend/.env` and set the local PostgreSQL connection values and a long, random `JWT_SECRET`. Keep `.env` files private; they are ignored by Git. `PORT` defaults to `4000`.

## Start the backend

```powershell
cd backend
npm install
npm run build
npm start
```

For development with automatic restarts, run `npm run dev` instead of `npm start`. The backend health endpoint is `GET http://localhost:4000/api/health`.

## Start the mobile app

```powershell
cd mobile
npm install
npm run typecheck
npm start
```

Then open the project in Expo Go or launch a simulator. The app stores its JWT with Expo SecureStore and sends it as a bearer token for loan requests.

### API URL by device

The mobile app reads `EXPO_PUBLIC_API_URL` at bundle time. It defaults to `http://10.0.2.2:4000` on Android and `http://localhost:4000` elsewhere. For a physical phone using Expo Go, create `mobile/.env` with the computer's reachable LAN address, for example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
```

Use your computer's actual LAN IP, keep the phone and computer on a reachable network, and restart Expo after changing the value. On Android emulator, `10.0.2.2` maps to the host computer. On iOS simulator and web, `localhost` normally reaches the host.

## Mock OTP sign-in

Enter a valid phone number and request an OTP in the app. Read the six-digit mock code printed in the backend terminal, then enter it in the app. Codes expire after five minutes and can only be used once. This is development-only authentication; no SMS is sent.

## API endpoints

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/request-otp` | No | Generate a mock OTP for a phone number |
| `POST` | `/api/auth/verify-otp` | No | Verify OTP and return a user and JWT |
| `GET` | `/api/loans` | Bearer JWT | List the signed-in user's loans |
| `POST` | `/api/loans` | Bearer JWT | Create a loan (`friendName`, `amount`, `dueDate`) |
| `PATCH` | `/api/loans/:id/repay` | Bearer JWT | Mark an unpaid loan as repaid |
| `GET` | `/api/loans/summary` | Bearer JWT | Get total lent, repaid, and overdue amounts |

Loan due dates use `YYYY-MM-DD` calendar dates. The app keeps this string format when sending and displaying due dates to avoid timezone shifts.

## Checks

```powershell
cd backend
npm run build
node smoke-test.mjs
cd ..\mobile
npm run typecheck
npm run doctor
```

## Known limitations

- OTP delivery is mocked and codes are printed to the server terminal.
- Receipt image uploads are not included.
- Set the API URL to a reachable LAN address for physical devices; the app cannot infer the host computer's address.
- The database schema above is initialized manually; no migration framework is included.
