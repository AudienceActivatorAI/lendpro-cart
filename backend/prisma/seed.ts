import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lendpro.com' },
    update: {},
    create: {
      email: 'admin@lendpro.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create test customer
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      passwordHash: customerPassword,
      firstName: 'John',
      lastName: 'Doe',
      role: 'CUSTOMER',
      isEmailVerified: true,
    },
  });
  console.log('✅ Created test customer:', customer.email);

  // Create categories
  const categories = await Promise.all([
    prisma.productCategory.upsert({
      where: { slug: 'mattresses' },
      update: {},
      create: {
        name: 'Mattresses',
        slug: 'mattresses',
        description: 'Premium mattresses for a great night\'s sleep',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.productCategory.upsert({
      where: { slug: 'bedding' },
      update: {},
      create: {
        name: 'Bedding',
        slug: 'bedding',
        description: 'Sheets, comforters, and pillows',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.productCategory.upsert({
      where: { slug: 'furniture' },
      update: {},
      create: {
        name: 'Furniture',
        slug: 'furniture',
        description: 'Bedroom and living room furniture',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.productCategory.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'TVs, audio systems, and accessories',
        isActive: true,
        sortOrder: 4,
      },
    }),
  ]);
  console.log('✅ Created categories');

  // Create products
  const products = await Promise.all([
    // Mattresses
    prisma.product.upsert({
      where: { sku: 'MAT-QUEEN-001' },
      update: {},
      create: {
        name: 'Premium Memory Foam Mattress - Queen',
        slug: 'premium-memory-foam-mattress-queen',
        description: 'Experience cloud-like comfort with our premium memory foam mattress. Features cooling gel technology and multiple support zones for optimal spinal alignment.',
        shortDescription: '12" memory foam mattress with cooling gel technology',
        price: 799.99,
        compareAtPrice: 999.99,
        sku: 'MAT-QUEEN-001',
        categoryId: categories[0].id,
        brand: 'DreamCloud',
        stock: 50,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', alt: 'Memory foam mattress', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ size: 'Queen', firmness: 'Medium', material: 'Memory Foam' }),
        isActive: true,
        isFeatured: true,
        tags: ['mattress', 'memory foam', 'queen', 'cooling'],
      },
    }),
    prisma.product.upsert({
      where: { sku: 'MAT-KING-001' },
      update: {},
      create: {
        name: 'Premium Memory Foam Mattress - King',
        slug: 'premium-memory-foam-mattress-king',
        description: 'Experience cloud-like comfort with our premium memory foam mattress. Features cooling gel technology and multiple support zones for optimal spinal alignment.',
        shortDescription: '12" memory foam mattress with cooling gel technology',
        price: 999.99,
        compareAtPrice: 1299.99,
        sku: 'MAT-KING-001',
        categoryId: categories[0].id,
        brand: 'DreamCloud',
        stock: 30,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', alt: 'Memory foam mattress', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ size: 'King', firmness: 'Medium', material: 'Memory Foam' }),
        isActive: true,
        isFeatured: true,
        tags: ['mattress', 'memory foam', 'king', 'cooling'],
      },
    }),
    // Bedding
    prisma.product.upsert({
      where: { sku: 'BED-SHEET-Q-001' },
      update: {},
      create: {
        name: 'Egyptian Cotton Sheet Set - Queen',
        slug: 'egyptian-cotton-sheet-set-queen',
        description: 'Luxuriously soft 1000 thread count Egyptian cotton sheets. Set includes fitted sheet, flat sheet, and 2 pillowcases.',
        shortDescription: '1000 thread count luxury sheet set',
        price: 149.99,
        compareAtPrice: 199.99,
        sku: 'BED-SHEET-Q-001',
        categoryId: categories[1].id,
        brand: 'SleepLuxe',
        stock: 100,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', alt: 'Egyptian cotton sheets', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ size: 'Queen', material: 'Egyptian Cotton', threadCount: 1000 }),
        isActive: true,
        isFeatured: true,
        tags: ['sheets', 'bedding', 'queen', 'egyptian cotton'],
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BED-COMF-Q-001' },
      update: {},
      create: {
        name: 'Down Alternative Comforter - Queen',
        slug: 'down-alternative-comforter-queen',
        description: 'Hypoallergenic down alternative comforter with baffle box construction. Perfect for year-round comfort.',
        shortDescription: 'Plush down alternative comforter',
        price: 129.99,
        sku: 'BED-COMF-Q-001',
        categoryId: categories[1].id,
        brand: 'SleepLuxe',
        stock: 75,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?w=800', alt: 'White comforter', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ size: 'Queen', material: 'Down Alternative', fill: '300 GSM' }),
        isActive: true,
        tags: ['comforter', 'bedding', 'queen', 'hypoallergenic'],
      },
    }),
    prisma.product.upsert({
      where: { sku: 'BED-PIL-001' },
      update: {},
      create: {
        name: 'Memory Foam Pillow Set (2)',
        slug: 'memory-foam-pillow-set',
        description: 'Set of 2 premium memory foam pillows with cooling gel layer and bamboo cover.',
        shortDescription: 'Cooling memory foam pillows - 2 pack',
        price: 79.99,
        compareAtPrice: 99.99,
        sku: 'BED-PIL-001',
        categoryId: categories[1].id,
        brand: 'DreamCloud',
        stock: 200,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1631048500566-7d4e9e7f7f4c?w=800', alt: 'Memory foam pillows', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ quantity: 2, material: 'Memory Foam', cover: 'Bamboo' }),
        isActive: true,
        isFeatured: true,
        tags: ['pillows', 'bedding', 'memory foam', 'cooling'],
      },
    }),
    // Electronics
    prisma.product.upsert({
      where: { sku: 'TV-55-4K-001' },
      update: {},
      create: {
        name: '55" 4K Smart TV',
        slug: '55-inch-4k-smart-tv',
        description: 'Stunning 4K HDR display with built-in streaming apps, voice control, and HDMI 2.1 for gaming.',
        shortDescription: '55" 4K HDR Smart TV with streaming',
        price: 599.99,
        compareAtPrice: 799.99,
        sku: 'TV-55-4K-001',
        categoryId: categories[3].id,
        brand: 'ViewMax',
        stock: 25,
        images: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800', alt: '4K Smart TV', isPrimary: true, sortOrder: 0 },
        ]),
        attributes: JSON.stringify({ screenSize: '55"', resolution: '4K', smartTV: true }),
        isActive: true,
        isFeatured: true,
        tags: ['tv', 'smart tv', '4k', 'electronics'],
      },
    }),
  ]);
  console.log('✅ Created products');

  // Create category upsell mappings
  await prisma.categoryUpsellMapping.upsert({
    where: {
      sourceCategoryId_targetCategoryId: {
        sourceCategoryId: categories[0].id, // Mattresses
        targetCategoryId: categories[1].id, // Bedding
      },
    },
    update: {},
    create: {
      sourceCategoryId: categories[0].id,
      targetCategoryId: categories[1].id,
      displayText: 'Complete your bedroom setup',
      maxSuggestions: 4,
      priority: 1,
    },
  });
  console.log('✅ Created category mappings');

  // Create upsell rules
  const mattress = products[0];
  const sheets = products[2];
  const comforter = products[3];
  const pillows = products[4];

  await prisma.upsellRule.upsert({
    where: { id: 'mattress-bundle-rule' },
    update: {},
    create: {
      id: 'mattress-bundle-rule',
      name: 'Mattress Bedding Bundle',
      description: 'Upsell bedding with mattress purchases',
      productId: mattress.id,
      ruleType: 'bundle',
      config: JSON.stringify({
        displayText: 'Complete your bedroom',
        displayLocation: ['product_page', 'cart_page'],
        maxSuggestions: 3,
        bundleDiscount: 15,
        bundleDiscountType: 'percentage',
        showPriceComparison: true,
      }),
      suggestedProducts: JSON.stringify([
        { productId: sheets.id, sortOrder: 1, customText: 'Match your mattress size' },
        { productId: comforter.id, sortOrder: 2 },
        { productId: pillows.id, sortOrder: 3, customText: 'Premium memory foam pillows' },
      ]),
      warranty: JSON.stringify({
        enabled: true,
        providers: ['mock-extend'],
        displayText: 'Protect your investment',
      }),
      priority: 1,
      isActive: true,
    },
  });
  console.log('✅ Created upsell rules');

  // Create financing platforms
  await prisma.financingPlatform.upsert({
    where: { slug: 'lendpro' },
    update: {},
    create: {
      name: 'LendPro',
      slug: 'lendpro',
      description: 'Pay over time with flexible financing options - 35+ lending partners',
      type: 'waterfall',
      supportedFinancingTypes: ['bnpl', 'installment', 'lease_to_own'],
      minAmount: 200,
      maxAmount: 15000,
      config: JSON.stringify({ 
        apiUrl: '/mock/lendpro', 
        sandboxMode: true,
        features: ['0% APR available', 'No hard credit check', 'Instant decisions']
      }),
      enabled: true,
      priority: 1,
    },
  });
  console.log('✅ Created financing platform (LendPro)');

  // Create warranty providers
  await Promise.all([
    prisma.warrantyProvider.upsert({
      where: { slug: 'mock-extend' },
      update: {},
      create: {
        name: 'Extend Protection',
        slug: 'mock-extend',
        description: 'Modern product protection plans',
        type: 'extend',
        config: JSON.stringify({ apiUrl: '/mock/extend', sandboxMode: true }),
        enabled: true,
        priority: 1,
      },
    }),
    prisma.warrantyProvider.upsert({
      where: { slug: 'mock-mulberry' },
      update: {},
      create: {
        name: 'Mulberry',
        slug: 'mock-mulberry',
        description: 'Flexible product protection',
        type: 'mulberry',
        config: JSON.stringify({ apiUrl: '/mock/mulberry', sandboxMode: true }),
        enabled: true,
        priority: 2,
      },
    }),
  ]);
  console.log('✅ Created warranty providers');

  // Create warranty plans
  const extendProvider = await prisma.warrantyProvider.findUnique({ where: { slug: 'mock-extend' } });
  if (extendProvider) {
    await Promise.all([
      prisma.warrantyPlan.upsert({
        where: { id: 'warranty-2yr' },
        update: {},
        create: {
          id: 'warranty-2yr',
          providerId: extendProvider.id,
          name: '2-Year Protection Plan',
          description: 'Covers mechanical and electrical failures',
          type: 'extended_warranty',
          durationMonths: 24,
          price: 49.99,
          coverage: JSON.stringify([
            { type: 'mechanical_failure', description: 'Covers mechanical breakdowns' },
            { type: 'electrical_failure', description: 'Covers electrical failures' },
          ]),
          isActive: true,
        },
      }),
      prisma.warrantyPlan.upsert({
        where: { id: 'warranty-3yr' },
        update: {},
        create: {
          id: 'warranty-3yr',
          providerId: extendProvider.id,
          name: '3-Year Protection Plan',
          description: 'Comprehensive coverage for 3 years',
          type: 'extended_warranty',
          durationMonths: 36,
          price: 79.99,
          coverage: JSON.stringify([
            { type: 'mechanical_failure', description: 'Covers mechanical breakdowns' },
            { type: 'electrical_failure', description: 'Covers electrical failures' },
            { type: 'accidental_damage', description: 'Covers accidental damage' },
          ]),
          isActive: true,
        },
      }),
      prisma.warrantyPlan.upsert({
        where: { id: 'warranty-5yr' },
        update: {},
        create: {
          id: 'warranty-5yr',
          providerId: extendProvider.id,
          name: '5-Year Protection Plan',
          description: 'Ultimate protection for 5 years',
          type: 'comprehensive',
          durationMonths: 60,
          price: 129.99,
          coverage: JSON.stringify([
            { type: 'mechanical_failure', description: 'Covers mechanical breakdowns' },
            { type: 'electrical_failure', description: 'Covers electrical failures' },
            { type: 'accidental_damage', description: 'Covers accidental damage' },
            { type: 'wear_and_tear', description: 'Covers normal wear and tear' },
          ]),
          isActive: true,
        },
      }),
    ]);
  }
  console.log('✅ Created warranty plans');

  // Create shipping methods
  await Promise.all([
    prisma.shippingMethod.upsert({
      where: { id: 'shipping-standard' },
      update: {},
      create: {
        id: 'shipping-standard',
        name: 'Standard Shipping',
        description: 'Delivery in 5-7 business days',
        carrier: 'USPS',
        price: 9.99,
        estimatedDays: 7,
        isDefault: true,
      },
    }),
    prisma.shippingMethod.upsert({
      where: { id: 'shipping-express' },
      update: {},
      create: {
        id: 'shipping-express',
        name: 'Express Shipping',
        description: 'Delivery in 2-3 business days',
        carrier: 'FedEx',
        price: 19.99,
        estimatedDays: 3,
      },
    }),
    prisma.shippingMethod.upsert({
      where: { id: 'shipping-overnight' },
      update: {},
      create: {
        id: 'shipping-overnight',
        name: 'Overnight Shipping',
        description: 'Next business day delivery',
        carrier: 'FedEx',
        price: 39.99,
        estimatedDays: 1,
      },
    }),
  ]);
  console.log('✅ Created shipping methods');

  // Create tax rates
  await Promise.all([
    prisma.taxRate.upsert({
      where: { country_state_postalCode: { country: 'US', state: 'CA', postalCode: '' } },
      update: {},
      create: { country: 'US', state: 'CA', postalCode: '', rate: 0.0725, name: 'California Sales Tax' },
    }),
    prisma.taxRate.upsert({
      where: { country_state_postalCode: { country: 'US', state: 'TX', postalCode: '' } },
      update: {},
      create: { country: 'US', state: 'TX', postalCode: '', rate: 0.0625, name: 'Texas Sales Tax' },
    }),
    prisma.taxRate.upsert({
      where: { country_state_postalCode: { country: 'US', state: 'NY', postalCode: '' } },
      update: {},
      create: { country: 'US', state: 'NY', postalCode: '', rate: 0.08, name: 'New York Sales Tax' },
    }),
  ]);
  console.log('✅ Created tax rates');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

