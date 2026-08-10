# E-Commerce REST API — Express + TypeScript + Prisma + PostgreSQL

A production-ready, scalable, and modular REST API built for the **SCIC/EJP-13** backend
assessment. It implements JWT authentication, role-based access control, a normalized
PostgreSQL schema via Prisma ORM, soft deletes, and full CRUD across five resources:
Users, Categories, Products, Cart Items, Orders, and Reviews.

## Tech Stack

- **Express.js 5** — HTTP server / routing
- **TypeScript** — type safety across the codebase
- **Prisma ORM 7** (with `@prisma/adapter-pg`) — database access
- **PostgreSQL** — works with a local instance, Supabase, or NeonDB
- **JWT (`jsonwebtoken`)** — stateless authentication
- **bcrypt** — password hashing
- **dotenv**, **cors**

## Project Structure

```text
server/
├── prisma/
│   └── schema.prisma          # Data model, enums, relations, indexes
├── docs/
│   └── API_DOCUMENTATION.md   # Full endpoint reference
├── src/
│   ├── app.ts                 # Express app, middleware, error handler
│   ├── server.ts               # Entry point
│   ├── routes/
│   │   └── index.ts            # Central route registration
│   ├── middlewares/
│   │   └── auth.ts             # authenticate / authorize / authorizeSelfOrAdmin
│   ├── services/
│   │   ├── auth.ts             # register / login / me
│   │   ├── users.ts
│   │   ├── categories.ts
│   │   ├── products.ts
│   │   ├── cartItems.ts
│   │   ├── orders.ts
│   │   └── reviews.ts
│   └── lib/
│       ├── prisma.ts           # Prisma client singleton
│       └── jwt.ts              # sign/verify helpers
├── .env.example
├── package.json
└── tsconfig.json
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env
```

| Variable         | Description                                                            |
| ---------------- | ------------------------------------------------------------------------ |
| `PORT`           | Port the server listens on (default `5000`)                            |
| `DATABASE_URL`   | PostgreSQL connection string (local, Supabase, or NeonDB)              |
| `JWT_SECRET`     | Long random string used to sign JWTs — never commit this               |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d`                                               |
| `CLIENT_URL`     | Your frontend's origin (used if you lock down CORS)                    |

See `docs/POSTGRESQL_SETUP.md`, `docs/SUPABASE_CONNECTION.md`, or
`docs/NEONDB_CONNECTION.md` for provider-specific connection instructions.

### 3. Set up the database

```bash
npx prisma migrate dev --name init   # creates tables from schema.prisma
npx prisma generate                  # generates the typed Prisma client
```

Browse/edit data visually any time with:

```bash
npx prisma studio
```

### 4. (Optional) Seed demo data

Populates the database with an admin, 3 customers, 5 categories, 15 products,
reviews, orders, and cart items:

```bash
npm run prisma:seed
```

> The seed is **non-destructive**: existing records are never deleted. Users,
> categories, and reviews are upserted by their unique fields; products are only
> created when a title is missing; orders/cart items are only seeded when the
> table is empty.

#### Demo credentials (development only)

| Role       | Email             | Password      |
| ---------- | ----------------- | ------------- |
| `ADMIN`    | `admin@example.com` | `password123` |
| `CUSTOMER` | `john@example.com`  | `password123` |
| `CUSTOMER` | `jane@example.com`  | `password123` |
| `CUSTOMER` | `alice@example.com` | `password123` |

These credentials are for local development/demo only. Never use them in
production.

### 5. Run the dev server

```bash
npm run dev
```

The API is now available at `http://localhost:5000/api/v1`.

### 6. Build for production

```bash
npm run build
npm start
```

## Authentication

This API uses stateless JWT authentication.

1. `POST /api/v1/auth/register` — create an account (always created as `CUSTOMER`)
2. `POST /api/v1/auth/login` — exchange email/password for a JWT
3. Send the token on every protected request:

   ```
   Authorization: Bearer <token>
   ```

To create the first `ADMIN` account for testing, register a normal user, then
either promote it directly in Prisma Studio (set `role` to `ADMIN`) or have an
existing admin call `PATCH /api/v1/users/:id` with `{ "role": "ADMIN" }`.

### Roles

| Role       | Can do                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `CUSTOMER` | Browse products/categories, manage own cart, place/view own orders, leave/edit own reviews |
| `ADMIN`    | Everything a customer can, plus manage products/categories, view/manage all users, update order status, moderate reviews |

## Data Model

- **User** — `UserRole` enum (`ADMIN`, `CUSTOMER`), soft delete, related orders/cart items/reviews
- **Category** — unique name, soft delete, related products
- **Product** — price/stock/category relation, soft delete, indexed on `categoryId`
- **CartItem** — unique per `(userId, productId)`, quantity
- **Order** / **OrderItem** — `OrderStatus` enum, indexed on `userId` and `status`
- **Review** — `ReviewStatus` enum (`PENDING`, `APPROVED`, `REJECTED`), one review per user per product, soft delete

All models use UUID primary keys, `createdAt`/`updatedAt` timestamps, and `@@map()`
to snake_case table names.

## API Response Format

Every endpoint returns a consistent envelope:

```json
{
  "success": true,
  "message": "Product retrieved successfully",
  "data": {}
}
```

See **[docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** for the full
endpoint reference (method, path, auth requirements, request body, response
shape, and status codes).

## Useful Prisma Commands

```bash
npx prisma studio             # visual data browser
npx prisma generate           # regenerate the client after schema changes
npx prisma migrate dev        # create + apply a new migration in dev
npx prisma migrate deploy     # apply pending migrations in production
```

## Deployment

1. Push the repo to GitHub.
2. Provision a PostgreSQL database (Supabase / NeonDB / Railway).
3. Deploy on your platform of choice (Render, Railway, Vercel serverless, etc.)
   with `DATABASE_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN` set as environment
   variables.
4. Run `npx prisma migrate deploy` against the production database as part of
   your build/release step.
5. Start command: `npm run build && npm start`.

## Submission Checklist

- [ ] Live backend API URL
- [ ] GitHub repository link
- [ ] `docs/API_DOCUMENTATION.md` kept up to date
- [ ] `.env` is **not** committed (already in `.gitignore`)
