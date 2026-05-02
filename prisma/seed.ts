import { PrismaClient, AssetCategory, CategoryType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seedUser() {
  const email = process.env.SEED_USER_EMAIL?.toLowerCase();
  const password = process.env.SEED_USER_PASSWORD;
  if (!email || !password) {
    console.log("Skipping user seed — set SEED_USER_EMAIL and SEED_USER_PASSWORD to create the initial user.");
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`Seeded user ${email}.`);
}

async function main() {
  await seedUser();

  // await prisma.transaction.deleteMany();
  // await prisma.monthlySnapshot.deleteMany();
  // await prisma.category.deleteMany();
  // await prisma.journalEntry.deleteMany();
  // await prisma.sipPlan.deleteMany();
  // await prisma.holding.deleteMany();
  // await prisma.allocationTarget.deleteMany();

  // await prisma.category.createMany({
  //   data: [
  //     { name: "Rent",          type: CategoryType.NEED,       isFixed: true },
  //     { name: "Utilities",     type: CategoryType.NEED,       isFixed: true },
  //     { name: "Groceries",     type: CategoryType.NEED },
  //     { name: "Transport",     type: CategoryType.NEED },
  //     { name: "Healthcare",    type: CategoryType.NEED },
  //     { name: "Insurance",     type: CategoryType.NEED,       isFixed: true },
  //     { name: "EMI",           type: CategoryType.NEED,       isFixed: true },
  //     { name: "Food",          type: CategoryType.WANT },
  //     { name: "Entertainment", type: CategoryType.WANT },
  //     { name: "Shopping",      type: CategoryType.WANT },
  //     { name: "Travel",        type: CategoryType.WANT },
  //     { name: "Subscriptions", type: CategoryType.WANT,       isFixed: true },
  //     { name: "Personal Care", type: CategoryType.WANT },
  //     { name: "Gifts",         type: CategoryType.WANT },
  //     { name: "Other",         type: CategoryType.WANT },
  //     { name: "SIP",           type: CategoryType.INVESTMENT, isFixed: true },
  //     { name: "Equity Buy",    type: CategoryType.INVESTMENT },
  //     { name: "Salary",        type: CategoryType.INCOME,     isFixed: true },
  //     { name: "Freelance",     type: CategoryType.INCOME },
  //     { name: "Interest",      type: CategoryType.INCOME },
  //     { name: "Dividend",      type: CategoryType.INCOME },
  //   ],
  // });

  // await prisma.allocationTarget.createMany({
  //   data: [
  //     { category: AssetCategory.INDEX_ETF, targetPercent: 50 },
  //     { category: AssetCategory.STOCK, targetPercent: 20 },
  //     { category: AssetCategory.COMMODITY, targetPercent: 15 },
  //     { category: AssetCategory.SECTOR_ETF, targetPercent: 15 },
  //   ],
  // });

  // await prisma.holding.createMany({
  //   data: [
  //     {
  //       symbol: "NIFTYBEES.NS",
  //       name: "Nippon India Nifty 50 ETF",
  //       category: AssetCategory.INDEX_ETF,
  //       quantity: 120,
  //       buyPrice: 245,
  //     },
  //     {
  //       symbol: "JUNIORBEES.NS",
  //       name: "Nippon India Nifty Next 50 ETF",
  //       category: AssetCategory.INDEX_ETF,
  //       quantity: 40,
  //       buyPrice: 680,
  //     },
  //     {
  //       symbol: "GOLDBEES.NS",
  //       name: "Nippon India Gold ETF",
  //       category: AssetCategory.COMMODITY,
  //       quantity: 300,
  //       buyPrice: 52,
  //     },
  //     {
  //       symbol: "SILVERBEES.NS",
  //       name: "Nippon India Silver ETF",
  //       category: AssetCategory.COMMODITY,
  //       quantity: 200,
  //       buyPrice: 78,
  //     },
  //     {
  //       symbol: "BANKBEES.NS",
  //       name: "Nippon India Bank ETF",
  //       category: AssetCategory.SECTOR_ETF,
  //       quantity: 30,
  //       buyPrice: 480,
  //     },
  //     {
  //       symbol: "HFCL.NS",
  //       name: "HFCL Ltd",
  //       category: AssetCategory.STOCK,
  //       quantity: 100,
  //       buyPrice: 92,
  //     },
  //     {
  //       symbol: "TCS.NS",
  //       name: "Tata Consultancy Services",
  //       category: AssetCategory.STOCK,
  //       quantity: 5,
  //       buyPrice: 3800,
  //     },
  //   ],
  // });

  // await prisma.sipPlan.createMany({
  //   data: [
  //     {
  //       symbol: "NIFTYBEES.NS",
  //       label: "Nifty 50 core SIP",
  //       baseAmount: 10000,
  //       category: AssetCategory.INDEX_ETF,
  //     },
  //     {
  //       symbol: "JUNIORBEES.NS",
  //       label: "Nifty Next 50 SIP",
  //       baseAmount: 5000,
  //       category: AssetCategory.INDEX_ETF,
  //     },
  //     {
  //       symbol: "GOLDBEES.NS",
  //       label: "Gold SIP",
  //       baseAmount: 2500,
  //       category: AssetCategory.COMMODITY,
  //     },
  //   ],
  // });

  console.log("Seeded InvestOS.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
