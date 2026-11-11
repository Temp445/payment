const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const products = await prisma.$queryRawUnsafe('SELECT * FROM public.products_offers');
  console.log('Products:', JSON.stringify(products, null, 2));
  const tiers = await prisma.$queryRawUnsafe('SELECT * FROM public.subscription_offers');
  console.log('Tiers:', JSON.stringify(tiers, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());

