# E-Commerce API Documentation

This is a comprehensive REST API for an e-commerce platform built with Express.js, TypeScript, and Prisma ORM. The API manages authentication, users, products, categories, shopping carts, orders, and reviews.

## Base URL
```
http://localhost:5000/api/v1
```

---

## Authentication & Authorization

Most write operations require a JSON Web Token. Register or log in to obtain one, then send it on every protected request:

```
Authorization: Bearer <token>
```

| Access level | Meaning |
| --- | --- |
| **Public** | No token required |
| **Authenticated** | Any logged-in user (`CUSTOMER` or `ADMIN`) |
| **Self or Admin** | The resource owner, or an `ADMIN` |
| **Admin only** | Requires `role: "ADMIN"` |

Unauthenticated requests to a protected route return `401`. Authenticated requests without the required role return `403`.

---

## Table of Contents
1. [Auth API](#auth-api)
2. [Users API](#users-api)
3. [Products API](#products-api)
4. [Categories API](#categories-api)
5. [Cart Items API](#cart-items-api)
6. [Orders API](#orders-api)
7. [Reviews API](#reviews-api)

---

## Auth API

### Overview
Handles account registration, login, and retrieving the current user's profile. Self-registered accounts are always created with the `CUSTOMER` role.

### Endpoints

#### 1. Register
**POST** `/auth/register`

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "plainTextPassword123"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "isDeleted": false,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Status Codes:** `201` Created · `400` Missing/invalid fields or email already registered · `500` Server error

---

#### 2. Login
**POST** `/auth/login`

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "plainTextPassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Status Codes:** `200` OK · `400` Missing fields · `401` Invalid credentials · `500` Server error

---

#### 3. Get Current User
**GET** `/auth/me`

**Access:** Authenticated

**Response (200):**
```json
{
  "success": true,
  "message": "Current user fetched successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:** `200` OK · `401` Missing/invalid token · `404` User not found

---

## Users API

### Overview
Handles user management by admins. Regular users should self-register via [`POST /auth/register`](#1-register) instead of `POST /users`.

### Endpoints

#### 1. Create User
**POST** `/users`

**Access:** Admin only

Creates a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "plainTextPassword123",
  "role": "CUSTOMER"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Get All Users
**GET** `/users`

**Access:** Admin only

Retrieves all active users.

**Query Parameters:**
- `includeDeleted` (boolean): Include soft-deleted users (default: false)

**Response (200):**
```json
{
  "success": true,
  "message": "Users fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "CUSTOMER",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 3. Get User by ID
**GET** `/users/:id`

**Access:** Self or Admin

Retrieves a specific user with their orders and cart items.

**Response (200):**
```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "CUSTOMER",
    "isDeleted": false,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "orders": [],
    "cartItems": []
  }
}
```

#### 4. Update User
**PATCH** `/users/:id`

**Access:** Self or Admin (only an Admin may change `role`)

Updates user information. A user may update their own `name`, `email`, and `password`; only an `ADMIN` may change `role`.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "newPassword123",
  "role": "ADMIN"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "ADMIN",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

#### 5. Delete User
**DELETE** `/users/:id`

**Access:** Self or Admin (permanent deletion is Admin only)

Soft deletes a user (marks as deleted).

**Query Parameters:**
- `permanent` (boolean): Permanently delete from database, Admin only (default: false)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": {
    "id": "uuid",
    "message": "User marked as deleted"
  }
}
```

---

## Products API

### Overview
Manages products with advanced filtering, pagination, and stock management.

### Endpoints

#### 1. Create Product
**POST** `/products`

**Access:** Admin only

Creates a new product.

**Request Body:**
```json
{
  "title": "Laptop",
  "description": "High performance gaming laptop",
  "price": 999.99,
  "stock": 50,
  "image": "https://example.com/laptop.jpg",
  "categoryId": "category-uuid"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "title": "Laptop",
    "description": "High performance gaming laptop",
    "price": 999.99,
    "stock": 50,
    "image": "https://example.com/laptop.jpg",
    "categoryId": "category-uuid",
    "category": { ... },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Get All Products
**GET** `/products`

Retrieves products with filtering, sorting, and pagination.

**Query Parameters:**
- `categoryId` (string): Filter by category
- `search` (string): Search by title or description
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sortBy` (string): Sort field - 'price', 'createdAt' (default: createdAt)
- `order` (string): 'asc' or 'desc' (default: desc)
- `includeDeleted` (boolean): Include deleted products

**Example:** `/products?categoryId=cat-123&search=laptop&page=1&limit=10&sortBy=price&order=asc`

**Response (200):**
```json
{
  "success": true,
  "message": "Products fetched successfully",
  "data": [
    {
      "id": "uuid",
      "title": "Laptop",
      "price": 999.99,
      "stock": 50,
      "category": { ... }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalProducts": 100,
    "totalPages": 10
  }
}
```

#### 3. Get Product by ID
**GET** `/products/:id`

Retrieves a specific product with all details.

**Response (200):**
```json
{
  "success": true,
  "message": "Product fetched successfully",
  "data": {
    "id": "uuid",
    "title": "Laptop",
    "description": "...",
    "price": 999.99,
    "stock": 50,
    "category": { ... },
    "cartItems": [],
    "orderItems": []
  }
}
```

#### 4. Update Product
**PATCH** `/products/:id`

**Access:** Admin only

Updates product information.

**Request Body:**
```json
{
  "title": "Updated Laptop",
  "price": 1099.99,
  "stock": 45
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": { ... }
}
```

#### 5. Delete Product
**DELETE** `/products/:id`

**Access:** Admin only

Soft deletes a product.

**Query Parameters:**
- `permanent` (boolean): Permanently delete

**Response (200):**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Categories API

### Overview
Manages product categories.

### Endpoints

#### 1. Create Category
**POST** `/categories`

**Access:** Admin only

Creates a new product category.

**Request Body:**
```json
{
  "name": "Electronics"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Get All Categories
**GET** `/categories`

Retrieves all categories with optional products.

**Query Parameters:**
- `includeProducts` (boolean): Include products in each category (default: false)
- `includeDeleted` (boolean): Include deleted categories

**Response (200):**
```json
{
  "success": true,
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "products": []
    }
  ]
}
```

#### 3. Get Category by ID
**GET** `/categories/:id`

Retrieves a specific category with its products.

**Query Parameters:**
- `includeProducts` (boolean): Include products (default: true)

**Response (200):**
```json
{
  "success": true,
  "message": "Category fetched successfully",
  "data": {
    "id": "uuid",
    "name": "Electronics",
    "products": [
      { ... }
    ]
  }
}
```

#### 4. Update Category
**PATCH** `/categories/:id`

**Access:** Admin only

Updates category information.

**Request Body:**
```json
{
  "name": "Updated Category Name"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": { ... }
}
```

#### 5. Delete Category
**DELETE** `/categories/:id`

**Access:** Admin only

Soft deletes a category.

**Query Parameters:**
- `permanent` (boolean): Permanently delete

**Response (200):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Cart Items API

### Overview
Manages shopping cart operations. **Every endpoint in this section requires authentication.** The cart always belongs to the requester - `userId` is taken from the JWT, not from the request body, so a customer can never add items to someone else's cart. An `ADMIN` may pass `?userId=` to `GET /cart-items` or use the `/user/:userId` routes to inspect another user's cart.

### Endpoints

#### 1. Add Item to Cart
**POST** `/cart-items`

**Access:** Authenticated

Adds a product to the authenticated user's cart, or increases the quantity if it's already in the cart.

**Request Body:**
```json
{
  "productId": "product-uuid",
  "quantity": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Item added to cart",
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "productId": "product-uuid",
    "quantity": 2,
    "product": { ... }
  }
}
```

#### 2. Get All Cart Items
**GET** `/cart-items`

**Access:** Authenticated (returns the caller's own cart; Admin may pass `userId` to view another user's)

**Query Parameters:**
- `userId` (string): View a specific user's cart - Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Cart items fetched successfully",
  "data": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "productId": "product-uuid",
      "quantity": 2,
      "product": { ... }
    }
  ],
  "totalCartValue": 1999.98
}
```

#### 3. Get User's Cart
**GET** `/cart-items/user/:userId`

**Access:** Self or Admin

Retrieves specific user's cart with summary.

**Response (200):**
```json
{
  "success": true,
  "message": "User cart fetched successfully",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "data": [
    { ... }
  ],
  "summary": {
    "itemCount": 3,
    "totalQuantity": 5,
    "totalPrice": 2999.97
  }
}
```

#### 4. Update Cart Item Quantity
**PATCH** `/cart-items/:id`

**Access:** Self or Admin (must own the cart item)

Updates the quantity of an item in cart.

**Request Body:**
```json
{
  "quantity": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cart item updated successfully",
  "data": { ... }
}
```

#### 5. Remove Item from Cart
**DELETE** `/cart-items/:id`

**Access:** Self or Admin (must own the cart item)

Removes a product from user's cart.

**Response (200):**
```json
{
  "success": true,
  "message": "Item removed from cart"
}
```

#### 6. Clear Cart
**DELETE** `/cart-items/user/:userId`

**Access:** Self or Admin

Clears entire cart for a user.

**Response (200):**
```json
{
  "success": true,
  "message": "Cart cleared successfully",
  "data": {
    "itemsRemoved": 5
  }
}
```

---

## Orders API

### Overview
Manages orders and order history.

### Endpoints

### All endpoints below require authentication. The order always belongs to the authenticated user - `userId` is taken from the JWT.

#### 1. Create Order
**POST** `/orders`

**Access:** Authenticated

Creates a new order from the authenticated user's cart (or a custom item list), decrements product stock, and clears the cart on success.

**Request Body Option 1 - From existing cart (empty body):**
```json
{}
```

**Request Body Option 2 - Custom items:**
```json
{
  "cartItems": [
    {
      "productId": "product-uuid",
      "quantity": 2,
      "price": 99.99
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "totalAmount": 199.98,
    "status": "PENDING",
    "user": { ... },
    "orderItems": [
      {
        "id": "uuid",
        "orderId": "order-uuid",
        "productId": "product-uuid",
        "quantity": 2,
        "price": 99.99,
        "product": { ... }
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Get All Orders
**GET** `/orders`

**Access:** Authenticated (returns the caller's own orders; Admin sees all and may filter by `userId`)

**Query Parameters:**
- `userId` (string): Filter by user - Admin only
- `status` (string): Filter by status (PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `includeDeleted` (boolean): Include deleted orders

**Response (200):**
```json
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalOrders": 50,
    "totalPages": 5
  }
}
```

#### 3. Get Order by ID
**GET** `/orders/:id`

**Access:** Self or Admin

Retrieves a specific order with all details.

**Response (200):**
```json
{
  "success": true,
  "message": "Order fetched successfully",
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "totalAmount": 199.98,
    "status": "PENDING",
    "user": { ... },
    "orderItems": [ ... ]
  }
}
```

#### 4. Get User's Orders
**GET** `/orders/user/:userId`

**Access:** Self or Admin

Retrieves all orders for a specific user with statistics.

**Query Parameters:**
- `status` (string): Filter by status
- `page` (number): Page number
- `limit` (number): Items per page

**Response (200):**
```json
{
  "success": true,
  "message": "User orders fetched successfully",
  "user": { ... },
  "data": [ ... ],
  "stats": {
    "totalOrders": 10,
    "totalSpent": 5000.00,
    "ordersByStatus": {
      "pending": 2,
      "processing": 1,
      "shipped": 2,
      "delivered": 5,
      "cancelled": 0
    }
  },
  "pagination": { ... }
}
```

#### 5. Update Order Status
**PATCH** `/orders/:id`

**Access:** Admin only

Updates the status of an order.

**Request Body:**
```json
{
  "status": "PROCESSING"
}
```

**Valid Statuses:** PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": { ... }
}
```

#### 6. Cancel Order
**DELETE** `/orders/:id`

**Access:** Self or Admin (permanent deletion is Admin only)

Cancels an order (soft delete, status set to `CANCELLED`).

**Query Parameters:**
- `permanent` (boolean): Permanently delete - Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "uuid",
    "status": "CANCELLED"
  }
}
```

---

## Reviews API

### Overview
Lets authenticated users rate and comment on products. Each user may leave at most one review per product. Reviews start as `PENDING` and can be moderated by an `ADMIN` (`APPROVED` / `REJECTED`).

### Endpoints

#### 1. Create Review
**POST** `/reviews`

**Access:** Authenticated

**Request Body:**
```json
{
  "productId": "product-uuid",
  "rating": 5,
  "comment": "Great product, fast shipping!"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Review created successfully",
  "data": {
    "id": "uuid",
    "rating": 5,
    "comment": "Great product, fast shipping!",
    "status": "PENDING",
    "userId": "user-uuid",
    "productId": "product-uuid",
    "user": { "id": "user-uuid", "name": "John Doe" },
    "product": { "id": "product-uuid", "title": "Laptop" },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:** `201` Created · `400` Invalid rating or duplicate review · `401` Unauthenticated · `404` Product not found

---

#### 2. Get All Reviews
**GET** `/reviews`

**Access:** Public

**Query Parameters:**
- `productId` (string): Filter by product
- `userId` (string): Filter by reviewer
- `status` (string): Filter by status (PENDING, APPROVED, REJECTED)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `includeDeleted` (boolean): Include soft-deleted reviews (default: false)

**Response (200):**
```json
{
  "success": true,
  "message": "Reviews fetched successfully",
  "data": [ ... ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalReviews": 24,
    "totalPages": 3
  }
}
```

---

#### 3. Get Review by ID
**GET** `/reviews/:id`

**Access:** Public

**Response (200):**
```json
{
  "success": true,
  "message": "Review fetched successfully",
  "data": { ... }
}
```

---

#### 4. Update Review
**PATCH** `/reviews/:id`

**Access:** Owner (rating/comment) or Admin (status)

The review's author may change `rating`/`comment`. Only an `ADMIN` may change `status` to moderate the review.

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Updated my thoughts after a month of use"
}
```

or, as an admin:

```json
{
  "status": "APPROVED"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Review updated successfully",
  "data": { ... }
}
```

---

#### 5. Delete Review
**DELETE** `/reviews/:id`

**Access:** Owner or Admin (permanent deletion is Admin only)

Soft deletes a review.

**Query Parameters:**
- `permanent` (boolean): Permanently delete - Admin only

**Response (200):**
```json
{
  "success": true,
  "message": "Review deleted successfully",
  "data": {
    "id": "uuid",
    "message": "Review marked as deleted"
  }
}
```

---

## Error Handling

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Description of the error"
}
```

**401 Unauthorized:** (missing/invalid/expired token)
```json
{
  "success": false,
  "message": "Authentication required. Provide a Bearer token."
}
```

**403 Forbidden:** (authenticated, but lacking the required role/ownership)
```json
{
  "success": false,
  "message": "You do not have permission to perform this action"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

---

## Database Models

### User
- Roles: ADMIN, CUSTOMER
- Password is bcrypt-hashed and never returned in API responses
- Can have multiple orders, cart items, and reviews

### Product
- Belongs to a Category
- Has quantity tracking (stock)
- Can appear in cart items, order items, and reviews

### Category
- Contains multiple products
- Used for organizing products

### CartItem
- Belongs to User and Product
- Tracks quantity
- Unique per user-product combination

### Order
- Belongs to User
- Contains multiple OrderItems
- Statuses: PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED

### OrderItem
- Belongs to Order and Product
- Captures price at time of purchase

### Review
- Belongs to User and Product
- Statuses: PENDING, APPROVED, REJECTED
- Unique per user-product combination (one review per user per product)

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in your own values:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/database_name"
   PORT=5000
   JWT_SECRET="a-long-random-secret"
   JWT_EXPIRES_IN="7d"
   ```

3. **Run migrations:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Register your first user, then promote it to ADMIN** (via Prisma Studio, or have an existing admin `PATCH /users/:id`):
   ```bash
   npx prisma studio
   ```

The API will be available at `http://localhost:5000/api/v1`

---

## Key Features

✅ **JWT Authentication** - Register/login with bcrypt-hashed passwords and stateless JWTs
✅ **Role-Based Access Control** - ADMIN vs CUSTOMER permissions, self-or-admin ownership checks
✅ **Complete CRUD Operations** - All resources support Create, Read, Update, Delete
✅ **Advanced Filtering** - Products support search, category filtering, and sorting
✅ **Pagination** - All list endpoints support pagination
✅ **Soft Deletes** - Records are marked as deleted instead of removed
✅ **Error Handling** - Comprehensive error messages, validation, and a global error handler
✅ **Type Safety** - Full TypeScript support with strict mode
✅ **Database Relationships** - Properly modeled with Prisma ORM, including indexes
✅ **Stock Management** - Product stock tracking, validation, and transactional decrement on order

---

## Notes for Beginners

- Each service file handles one resource (auth, users, products, etc.)
- All endpoints follow REST conventions
- Comments in code explain each operation
- Error handling includes validation for all inputs
- Use Postman or similar tools to test endpoints
- Database relationships are maintained through foreign keys
- All timestamps are in ISO 8601 format
