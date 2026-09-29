import { PrismaClient, UserRole, ProviderStatus, FoodAvailability } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // Password hashes
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const providerPasswordHash = await bcrypt.hash('ProviderPassword123!', 10);
  const studentPasswordHash = await bcrypt.hash('StudentPassword123!', 10);

  // 2. Create College Locations
  const mainCanteenLoc = await prisma.location.create({
    data: {
      name: 'Main Canteen',
      code: 'MAIN_CANTEEN',
      description: 'Central campus dining area with multiple food stalls and large seating capacity',
      hallName: 'Student Central Hub Ground Floor',
      crowdStatus: 'Moderate crowd',
      avgPrepTimeMin: 10,
      isActive: true,
    },
  });

  const engBlockLoc = await prisma.location.create({
    data: {
      name: 'Engineering Block',
      code: 'ENG_BLOCK',
      description: 'Quick-service kiosk area near Engineering & Tech lecture halls',
      hallName: 'Tech Quad Level 1 Courtyard',
      crowdStatus: 'Normal crowd',
      avgPrepTimeMin: 8,
      isActive: true,
    },
  });

  const foodCourtLoc = await prisma.location.create({
    data: {
      name: 'Food Court',
      code: 'FOOD_COURT',
      description: 'Spacious food plaza catering to Arts, Science & Management faculties',
      hallName: 'Science & Arts Plaza Annex',
      crowdStatus: 'High crowd',
      avgPrepTimeMin: 15,
      isActive: true,
    },
  });

  const hostelBlockALoc = await prisma.location.create({
    data: {
      name: 'Hostel Block A',
      code: 'HOSTEL_A',
      description: 'Late-night snacks & cafe counter located at North Campus Residence',
      hallName: 'North Campus Residence Lobby',
      crowdStatus: 'Normal crowd',
      avgPrepTimeMin: 7,
      isActive: true,
    },
  });

  console.log('📍 Created 4 Campus Locations');

  // 3. Create Categories
  const catSnacks = await prisma.category.create({
    data: {
      name: 'Snacks & Quick Bites',
      description: 'Crispy snacks, quick bites, sandwiches and rolls',
      icon: 'sparkles',
      sortOrder: 1,
    },
  });

  const catMeals = await prisma.category.create({
    data: {
      name: 'Meals & Combos',
      description: 'Hearty bowls, thalis, combos, and platters',
      icon: 'bowl',
      sortOrder: 2,
    },
  });

  const catBeverages = await prisma.category.create({
    data: {
      name: 'Beverages',
      description: 'Fresh juices, iced tea, hot chai, and artisan coffee',
      icon: 'coffee',
      sortOrder: 3,
    },
  });

  const catHealthy = await prisma.category.create({
    data: {
      name: 'Healthy & Salads',
      description: 'Fresh sprout bowls, diet protein salads, and fresh fruits',
      icon: 'leaf',
      sortOrder: 4,
    },
  });

  const catDesserts = await prisma.category.create({
    data: {
      name: 'Desserts & Sweets',
      description: 'Brownies, pastries, ice cream, and shakes',
      icon: 'cake',
      sortOrder: 5,
    },
  });

  console.log('🏷️ Created 5 Food Categories');

  // 4. Create Users (Admin, 2 Providers, 1 Sample Student)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@campusbites.edu',
      fullName: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      phoneNumber: '+919000000001',
      preferredLocationId: mainCanteenLoc.id,
    },
  });

  const providerUser1 = await prisma.user.create({
    data: {
      email: 'freshbites@campusbites.edu',
      fullName: 'Rajesh Kumar (Fresh Bites)',
      passwordHash: providerPasswordHash,
      role: UserRole.PROVIDER,
      phoneNumber: '+919000000002',
      preferredLocationId: mainCanteenLoc.id,
    },
  });

  const providerUser2 = await prisma.user.create({
    data: {
      email: 'chaiandchat@campusbites.edu',
      fullName: 'Priya Sharma (Chai & Chat)',
      passwordHash: providerPasswordHash,
      role: UserRole.PROVIDER,
      phoneNumber: '+919000000003',
      preferredLocationId: engBlockLoc.id,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      email: 'student@campusbites.edu',
      fullName: 'Alex Johnson',
      passwordHash: studentPasswordHash,
      role: UserRole.CUSTOMER,
      phoneNumber: '+919876543210',
      preferredLocationId: mainCanteenLoc.id,
    },
  });

  console.log('👤 Created Users: 1 Admin, 2 Providers, 1 Customer');

  // 5. Create Provider Profiles
  const provider1 = await prisma.provider.create({
    data: {
      userId: providerUser1.id,
      name: 'Fresh Bites & Bowls',
      description: 'Signature fusion bowls, wraps, freshly squeezed juices and fast bites',
      counterNumber: 'Counter 01',
      status: ProviderStatus.APPROVED,
      locationId: mainCanteenLoc.id,
      isOpen: true,
      prepBufferMin: 5,
      rating: 4.8,
      reviewCount: 142,
    },
  });

  const provider2 = await prisma.provider.create({
    data: {
      userId: providerUser2.id,
      name: 'Chai & Snacks Corner',
      description: 'Authentic brewed kadak chai, piping hot samosas, grilled sandwiches & street style delights',
      counterNumber: 'Kiosk 02',
      status: ProviderStatus.APPROVED,
      locationId: engBlockLoc.id,
      isOpen: true,
      prepBufferMin: 3,
      rating: 4.7,
      reviewCount: 98,
    },
  });

  console.log('🏪 Created 2 Approved Providers');

  // 6. Create Food Items (12 items)
  const items = [
    // Provider 1 items
    {
      providerId: provider1.id,
      categoryId: catMeals.id,
      name: 'Paneer Tikka Kathi Wrap',
      description: 'Tandoori spiced paneer rolled in flaky whole wheat paratha with mint relish',
      price: 120.00,
      imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: false,
      isHalal: true,
      calories: 380,
      prepTimeMin: 8,
      prepTimeMax: 12,
    },
    {
      providerId: provider1.id,
      categoryId: catMeals.id,
      name: 'Crispy Masala Dosa Platter',
      description: 'Golden thin fermented crepe served with spicy potato filling, sambar & two chutneys',
      price: 80.00,
      imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: true,
      calories: 310,
      prepTimeMin: 10,
      prepTimeMax: 14,
    },
    {
      providerId: provider1.id,
      categoryId: catSnacks.id,
      name: 'Veggie Supreme Crunch Burger',
      description: 'Crispy herb patty, fresh lettuce, tomato, cheese slice, house secret sauce',
      price: 99.00,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      calories: 440,
      prepTimeMin: 10,
      prepTimeMax: 15,
    },
    {
      providerId: provider1.id,
      categoryId: catHealthy.id,
      name: 'Mediterranean Quinoa Salad Bowl',
      description: 'Fluffy quinoa, cucumber, cherry tomatoes, kalamata olives, feta, lemon herb vinaigrette',
      price: 140.00,
      imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isGlutenFree: true,
      calories: 290,
      prepTimeMin: 6,
      prepTimeMax: 10,
    },
    {
      providerId: provider1.id,
      categoryId: catBeverages.id,
      name: 'Artisan Cold Brew Coffee',
      description: '16-hour slow steep cold brew with creamy oat milk and vanilla bean syrup',
      price: 65.00,
      imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: true,
      calories: 120,
      prepTimeMin: 3,
      prepTimeMax: 5,
    },
    {
      providerId: provider1.id,
      categoryId: catBeverages.id,
      name: 'Freshly Squeezed Valencia Orange Juice',
      description: '100% pure raw cold-pressed orange juice without added sugar',
      price: 50.00,
      imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: true,
      isGlutenFree: true,
      calories: 110,
      prepTimeMin: 4,
      prepTimeMax: 6,
    },

    // Provider 2 items
    {
      providerId: provider2.id,
      categoryId: catBeverages.id,
      name: 'Special Adrak Elaichi Chai (Kulhad)',
      description: 'Simmered crushed ginger and aromatic green cardamom brewed in whole milk',
      price: 20.00,
      imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      calories: 85,
      prepTimeMin: 3,
      prepTimeMax: 6,
    },
    {
      providerId: provider2.id,
      categoryId: catSnacks.id,
      name: 'Punjabi Aloo Samosa (2 Pieces)',
      description: 'Crispy golden pastry crust filled with spiced potatoes, green peas and tangy tamarind dip',
      price: 40.00,
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: true,
      calories: 260,
      prepTimeMin: 4,
      prepTimeMax: 7,
    },
    {
      providerId: provider2.id,
      categoryId: catMeals.id,
      name: 'Butter Mumbai Pav Bhaji',
      description: 'Mashed vegetable gravy spiced to perfection with Amul butter, served with 2 toasted pavs',
      price: 110.00,
      imageUrl: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      calories: 480,
      prepTimeMin: 8,
      prepTimeMax: 12,
    },
    {
      providerId: provider2.id,
      categoryId: catSnacks.id,
      name: 'Triple Cheese Chilli Toast Sandwich',
      description: 'Mozzarella, cheddar and processed cheese grilled with green chillies and bell peppers',
      price: 75.00,
      imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      calories: 360,
      prepTimeMin: 7,
      prepTimeMax: 10,
    },
    {
      providerId: provider2.id,
      categoryId: catSnacks.id,
      name: 'Peri Peri Masala French Fries',
      description: 'Crispy thick-cut potato fries tossed in zesty African peri peri spice mix',
      price: 60.00,
      imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      isVegan: true,
      isGlutenFree: true,
      calories: 280,
      prepTimeMin: 5,
      prepTimeMax: 8,
    },
    {
      providerId: provider2.id,
      categoryId: catDesserts.id,
      name: 'Warm Fudge Brownie with Vanilla Scoop',
      description: 'Rich dark Belgian chocolate brownie served warm with a scoop of vanilla ice cream & hot fudge',
      price: 90.00,
      imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
      availability: FoodAvailability.AVAILABLE,
      isVeg: true,
      calories: 420,
      prepTimeMin: 4,
      prepTimeMax: 7,
    },
  ];

  for (const item of items) {
    await prisma.foodItem.create({
      data: item,
    });
  }

  console.log(`🍲 Created ${items.length} Food Items across providers`);

  // 7. Create a Sample Notification for the student
  await prisma.notification.create({
    data: {
      userId: studentUser.id,
      title: 'Welcome to CampusBites!',
      message: 'Explore menus from Main Canteen, Engineering Block, and more. Skip lines by pre-ordering!',
      type: 'SYSTEM_ANNOUNCEMENT',
      isRead: false,
    },
  });

  console.log('📬 Created Welcome Notification');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
