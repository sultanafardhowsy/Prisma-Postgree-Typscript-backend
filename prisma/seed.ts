import bcrypt from "bcrypt";
import prisma from "../src/lib/prisma";

const SALT_ROUNDS = 10;
const DEMO_PASSWORD = "password123";

type UserRole = "ADMIN" | "CUSTOMER";
type CategoryStatus = "ACTIVE" | "INACTIVE";
type ProductStatus = "ACTIVE" | "INACTIVE" | "OUT_OF_STOCK";
type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

async function main() {
  console.log("🌱 Seeding database (non-destructive)...");

  // ---------- Users (upsert by unique email) ----------
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  const seedUsers: { name: string; email: string; role: UserRole }[] = [
    { name: "Admin User", email: "admin@example.com", role: "ADMIN" },
    { name: "John Doe", email: "john@example.com", role: "CUSTOMER" },
    { name: "Jane Smith", email: "jane@example.com", role: "CUSTOMER" },
    { name: "Alice Johnson", email: "alice@example.com", role: "CUSTOMER" },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of seedUsers) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password: hashedPassword },
    });
  }

  console.log(`   Users: ${seedUsers.length} (upserted)`);

  // ---------- Categories (upsert by unique name) ----------
  const seedCategories: { name: string; status: CategoryStatus }[] = [
    { name: "Electronics", status: "ACTIVE" },
    { name: "Clothing", status: "ACTIVE" },
    { name: "Books", status: "ACTIVE" },
    { name: "Sports", status: "INACTIVE" },
    { name: "Home & Kitchen", status: "ACTIVE" },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const c of seedCategories) {
    categories[c.name] = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
  }

  console.log(`   Categories: ${seedCategories.length} (upserted)`);

  // ---------- Products (create only missing titles) ----------
  const img = (seed: number) =>
    `https://picsum.photos/seed/ejp${seed}/600/450`;

  const productsData: {
    title: string;
    description: string;
    price: number;
    stock: number;
    status: ProductStatus;
    categoryName: string;
  }[] = [
    { title: "Wireless Bluetooth Headphones", description: "Over-ear headphones with noise cancellation and 30-hour battery life.", price: 89.99, stock: 50, status: "ACTIVE", categoryName: "Electronics" },
    { title: "Smartwatch Series 5", description: "Water-resistant smartwatch with heart-rate monitoring and GPS.", price: 199.99, stock: 24, status: "ACTIVE", categoryName: "Electronics" },
    { title: "Mechanical Keyboard 75%", description: "Hot-swappable mechanical keyboard with RGB backlighting.", price: 129.5, stock: 3, status: "ACTIVE", categoryName: "Electronics" },
    { title: "4K Ultra HD Webcam", description: "1080p/4K webcam with auto-focus and built-in privacy shutter.", price: 59.99, stock: 0, status: "OUT_OF_STOCK", categoryName: "Electronics" },
    { title: "Portable Bluetooth Speaker", description: "Compact waterproof speaker with deep bass and 12-hour playtime.", price: 45.0, stock: 60, status: "ACTIVE", categoryName: "Electronics" },
    { title: "Classic Denim Jacket", description: "Timeless denim jacket with a comfortable mid-weight fit.", price: 64.99, stock: 35, status: "ACTIVE", categoryName: "Clothing" },
    { title: "Merino Wool Sweater", description: "Soft, breathable merino wool sweater for all seasons.", price: 79.0, stock: 18, status: "ACTIVE", categoryName: "Clothing" },
    { title: "Running Sneakers", description: "Lightweight running shoes with responsive cushioning.", price: 119.99, stock: 8, status: "ACTIVE", categoryName: "Clothing" },
    { title: "Organic Cotton T-Shirt", description: "Everyday crew-neck tee made from 100% organic cotton.", price: 24.5, stock: 0, status: "OUT_OF_STOCK", categoryName: "Clothing" },
    { title: "The Pragmatic Programmer", description: "Your journey to mastery in software engineering.", price: 42.99, stock: 40, status: "ACTIVE", categoryName: "Books" },
    { title: "Clean Code Handbook", description: "A handbook of agile software craftsmanship.", price: 38.75, stock: 27, status: "ACTIVE", categoryName: "Books" },
    { title: "Design Patterns in TypeScript", description: "Reusable solutions to common software design problems.", price: 51.0, stock: 12, status: "ACTIVE", categoryName: "Books" },
    { title: "Yoga Mat Pro", description: "Extra-thick non-slip yoga mat with alignment lines.", price: 34.99, stock: 22, status: "ACTIVE", categoryName: "Sports" },
    { title: "Stainless Steel Water Bottle", description: "Vacuum-insulated bottle keeps drinks cold for 24 hours.", price: 19.99, stock: 0, status: "INACTIVE", categoryName: "Home & Kitchen" },
    { title: "Cast Iron Skillet 12-inch", description: "Pre-seasoned cast iron skillet, oven-safe to 500°F.", price: 39.99, stock: 15, status: "ACTIVE", categoryName: "Home & Kitchen" },
  ];

  let created = 0;
  const productsByTitle: Record<string, { id: string; price: number }> = {};
  for (const [index, data] of productsData.entries()) {
    const existing = await prisma.product.findFirst({
      where: { title: data.title },
    });
    if (existing) {
      productsByTitle[data.title] = existing;
      continue;
    }
    const product = await prisma.product.create({
      data: {
        title: data.title,
        description: data.description,
        price: data.price,
        stock: data.stock,
        image: img(index + 1),
        status: data.status,
        categoryId: categories[data.categoryName].id,
      },
    });
    productsByTitle[data.title] = product;
    created += 1;
  }

  console.log(`   Products: created ${created}, already present ${productsData.length - created}`);

  // ---------- Reviews (upsert by unique userId+productId) ----------
  const reviewsData: {
    rating: number;
    comment: string;
    userEmail: string;
    productTitle: string;
    status: ReviewStatus;
  }[] = [
    { rating: 5, comment: "Excellent sound quality and the battery lasts ages.", userEmail: "john@example.com", productTitle: "Wireless Bluetooth Headphones", status: "APPROVED" },
    { rating: 4, comment: "Great value for money, straps are a bit stiff at first.", userEmail: "jane@example.com", productTitle: "Smartwatch Series 5", status: "APPROVED" },
    { rating: 3, comment: "Good keyboard but the software needs work.", userEmail: "alice@example.com", productTitle: "Mechanical Keyboard 75%", status: "PENDING" },
    { rating: 5, comment: "Perfect daily jacket. True to size.", userEmail: "alice@example.com", productTitle: "Classic Denim Jacket", status: "APPROVED" },
    { rating: 4, comment: "Warm and comfortable, shrinks slightly after washing.", userEmail: "john@example.com", productTitle: "Merino Wool Sweater", status: "PENDING" },
    { rating: 5, comment: "A must-read for every developer.", userEmail: "jane@example.com", productTitle: "The Pragmatic Programmer", status: "APPROVED" },
    { rating: 2, comment: "Too heavy for my taste, returned it.", userEmail: "john@example.com", productTitle: "Cast Iron Skillet 12-inch", status: "REJECTED" },
  ];

  for (const data of reviewsData) {
    await prisma.review.upsert({
      where: {
        userId_productId: {
          userId: users[data.userEmail].id,
          productId: productsByTitle[data.productTitle].id,
        },
      },
      update: {},
      create: {
        rating: data.rating,
        comment: data.comment,
        userId: users[data.userEmail].id,
        productId: productsByTitle[data.productTitle].id,
        status: data.status,
      },
    });
  }

  console.log(`   Reviews: ${reviewsData.length} (upserted)`);

  // ---------- Orders (only if none exist) ----------
  const existingOrders = await prisma.order.count();
  if (existingOrders === 0) {
    const ordersData = [
      {
        userEmail: "john@example.com",
        status: "DELIVERED" as const,
        items: [
          { productTitle: "Wireless Bluetooth Headphones", quantity: 1 },
          { productTitle: "The Pragmatic Programmer", quantity: 1 },
        ],
      },
      {
        userEmail: "jane@example.com",
        status: "SHIPPED" as const,
        items: [{ productTitle: "Classic Denim Jacket", quantity: 2 }],
      },
      {
        userEmail: "alice@example.com",
        status: "PROCESSING" as const,
        items: [
          { productTitle: "Mechanical Keyboard 75%", quantity: 1 },
          { productTitle: "Running Sneakers", quantity: 1 },
          { productTitle: "Clean Code Handbook", quantity: 2 },
        ],
      },
      {
        userEmail: "john@example.com",
        status: "CANCELLED" as const,
        items: [{ productTitle: "Smartwatch Series 5", quantity: 1 }],
      },
    ];

    for (const order of ordersData) {
      let totalAmount = 0;
      for (const item of order.items) {
        totalAmount += productsByTitle[item.productTitle].price * item.quantity;
      }

      await prisma.order.create({
        data: {
          userId: users[order.userEmail].id,
          status: order.status,
          totalAmount: Math.round(totalAmount * 100) / 100,
          orderItems: {
            create: order.items.map((item) => ({
              productId: productsByTitle[item.productTitle].id,
              quantity: item.quantity,
              price: productsByTitle[item.productTitle].price,
            })),
          },
        },
      });
    }

    console.log(`   Orders: ${ordersData.length} created`);
  } else {
    console.log(`   Orders: skipped (${existingOrders} already exist)`);
  }

  // ---------- Cart items (only if none exist) ----------
  const existingCartItems = await prisma.cartItem.count();
  if (existingCartItems === 0) {
    await prisma.cartItem.createMany({
      data: [
        { userId: users["jane@example.com"].id, productId: productsByTitle["4K Ultra HD Webcam"].id, quantity: 1 },
        { userId: users["alice@example.com"].id, productId: productsByTitle["Design Patterns in TypeScript"].id, quantity: 2 },
      ],
    });
    console.log("   Cart items: 2 created");
  } else {
    console.log(`   Cart items: skipped (${existingCartItems} already exist)`);
  }

  console.log("✅ Seed completed successfully");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
