import { PrismaClient, Station } from '@prisma/client';

const prisma = new PrismaClient();

type MenuEngineeringQuadrant = 'Star' | 'Horse' | 'Plowhorse' | 'Puzzle';

const CATEGORY_STATION_MAP: Record<string, Station> = {
  Starters: Station.COLD,
  Salads: Station.COLD,
  Pastas: Station.EXPO,
  'Mains (Land)': Station.GRILL,
  'Mains (Sea)': Station.EXPO,
  Sides: Station.EXPO,
  Desserts: Station.PASTRY,
  Cocktails: Station.BAR,
  Wine: Station.BAR,
  Beer: Station.BAR,
};

async function main() {
  // ── Lookup tenants ──────────────────────────────────────────────────────────
  const luma = await prisma.tenant.findUnique({ where: { slug: 'luma' } });
  const sakura = await prisma.tenant.findUnique({ where: { slug: 'sakura' } });
  const theGarden = await prisma.tenant.findUnique({ where: { slug: 'the-garden' } });

  if (!luma || !sakura || !theGarden) {
    throw new Error('Tenant slugs luma, sakura, the-garden must all exist. Run Part 1 seed first.');
  }

  console.log(`Found tenants: luma=${luma.id}, sakura=${sakura.id}, the-garden=${theGarden.id}`);

  // ════════════════════════════════════════════════════════════════════════════
  // LUMA — Ingredients
  // ════════════════════════════════════════════════════════════════════════════
  const ingredientsCreated = await Promise.all([
    // Proteins
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-wagyu-tenderloin' },
      update: {},
      create: {
        id: 'luma-ingredient-wagyu-tenderloin',
        tenantId: luma.id, name: 'Wagyu Beef Tenderloin', unit: 'lb',
        category: 'Protein', unitCost: 85.0000, currentStock: 20,
        reorderThreshold: 5, parLevel: 40,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-miyazaki-a5-strip' },
      update: {},
      create: {
        id: 'luma-ingredient-miyazaki-a5-strip', tenantId: luma.id,
        name: 'Miyazaki A5 Strip', unit: 'oz', category: 'Protein',
        unitCost: 12.5000, currentStock: 80, reorderThreshold: 20, parLevel: 200,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-hokkaido-uni' },
      update: {},
      create: {
        id: 'luma-ingredient-hokkaido-uni', tenantId: luma.id,
        name: 'Hokkaido Uni', unit: 'oz', category: 'Seafood',
        unitCost: 9.0000, currentStock: 40, reorderThreshold: 15, parLevel: 100,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-fois-gras' },
      update: {},
      create: {
        id: 'luma-ingredient-fois-gras', tenantId: luma.id,
        name: 'Fois Gras', unit: 'lb', category: 'Protein',
        unitCost: 65.0000, currentStock: 12, reorderThreshold: 3, parLevel: 25,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-black-truffle' },
      update: {},
      create: {
        id: 'luma-ingredient-black-truffle', tenantId: luma.id,
        name: 'Black Truffle', unit: 'oz', category: 'Fungus',
        unitCost: 15.0000, currentStock: 25, reorderThreshold: 5, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-osetra-caviar' },
      update: {},
      create: {
        id: 'luma-ingredient-osetra-caviar', tenantId: luma.id,
        name: 'Osetra Caviar', unit: 'oz', category: 'Seafood',
        unitCost: 22.0000, currentStock: 20, reorderThreshold: 8, parLevel: 50,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-dry-aged-ribeye-45' },
      update: {},
      create: {
        id: 'luma-ingredient-dry-aged-ribeye-45', tenantId: luma.id,
        name: 'Dry Aged Ribeye 45day', unit: 'lb', category: 'Protein',
        unitCost: 55.0000, currentStock: 18, reorderThreshold: 5, parLevel: 35,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-chilean-sea-bass' },
      update: {},
      create: {
        id: 'luma-ingredient-chilean-sea-bass', tenantId: luma.id,
        name: 'Chilean Sea Bass', unit: 'lb', category: 'Seafood',
        unitCost: 45.0000, currentStock: 14, reorderThreshold: 4, parLevel: 30,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-dungeness-crab' },
      update: {},
      create: {
        id: 'luma-ingredient-dungeness-crab', tenantId: luma.id,
        name: 'Dungeness Crab', unit: 'lb', category: 'Seafood',
        unitCost: 28.0000, currentStock: 20, reorderThreshold: 6, parLevel: 40,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-burrata' },
      update: {},
      create: {
        id: 'luma-ingredient-burrata', tenantId: luma.id,
        name: 'Burrata', unit: 'each', category: 'Dairy',
        unitCost: 8.0000, currentStock: 30, reorderThreshold: 15, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-aged-parmigiano' },
      update: {},
      create: {
        id: 'luma-ingredient-aged-parmigiano', tenantId: luma.id,
        name: 'Aged Parmigiano', unit: 'oz', category: 'Dairy',
        unitCost: 3.5000, currentStock: 100, reorderThreshold: 30, parLevel: 200,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-saffron-threads' },
      update: {},
      create: {
        id: 'luma-ingredient-saffron-threads', tenantId: luma.id,
        name: 'Saffron Threads', unit: 'oz', category: 'Spice',
        unitCost: 18.0000, currentStock: 5, reorderThreshold: 3, parLevel: 20,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-duck-egg' },
      update: {},
      create: {
        id: 'luma-ingredient-duck-egg', tenantId: luma.id,
        name: 'Duck Egg', unit: 'each', category: 'Egg',
        unitCost: 4.0000, currentStock: 40, reorderThreshold: 20, parLevel: 80,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-heirloom-tomato' },
      update: {},
      create: {
        id: 'luma-ingredient-heirloom-tomato', tenantId: luma.id,
        name: 'Heirloom Tomato', unit: 'lb', category: 'Produce',
        unitCost: 6.0000, currentStock: 35, reorderThreshold: 20, parLevel: 80,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-arugula' },
      update: {},
      create: {
        id: 'luma-ingredient-arugula', tenantId: luma.id,
        name: 'Arugula', unit: 'lb', category: 'Produce',
        unitCost: 5.0000, currentStock: 25, reorderThreshold: 15, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-kaluga-caviar' },
      update: {},
      create: {
        id: 'luma-ingredient-kaluga-caviar', tenantId: luma.id,
        name: 'Kaluga Caviar', unit: 'oz', category: 'Seafood',
        unitCost: 20.0000, currentStock: 15, reorderThreshold: 8, parLevel: 50,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-champagne-bottle' },
      update: {},
      create: {
        id: 'luma-ingredient-champagne-bottle', tenantId: luma.id,
        name: 'Bottle Champagne', unit: 'each', category: 'Beverage',
        unitCost: 95.0000, currentStock: 30, reorderThreshold: 10, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-burgundy-bottle' },
      update: {},
      create: {
        id: 'luma-ingredient-burgundy-bottle', tenantId: luma.id,
        name: 'Bottle Burgundy', unit: 'each', category: 'Beverage',
        unitCost: 120.0000, currentStock: 20, reorderThreshold: 8, parLevel: 40,
      },
    }),
    // Supporting ingredients (non-premium, always needed for recipes)
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-truffle-butter' },
      update: {},
      create: {
        id: 'luma-ingredient-truffle-butter', tenantId: luma.id,
        name: 'Truffle Butter', unit: 'oz', category: 'Dairy',
        unitCost: 4.5000, currentStock: 50, reorderThreshold: 15, parLevel: 100,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-brioche' },
      update: {},
      create: {
        id: 'luma-ingredient-brioche', tenantId: luma.id,
        name: 'Brioche', unit: ' loaf', category: 'Bakery',
        unitCost: 5.0000, currentStock: 20, reorderThreshold: 5, parLevel: 40,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-carnaroli-rice' },
      update: {},
      create: {
        id: 'luma-ingredient-carnaroli-rice', tenantId: luma.id,
        name: 'Carnaroli Rice', unit: 'lb', category: 'Grain',
        unitCost: 8.0000, currentStock: 40, reorderThreshold: 10, parLevel: 80,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-wasabi' },
      update: {},
      create: {
        id: 'luma-ingredient-wasabi', tenantId: luma.id,
        name: 'Wasabi', unit: 'oz', category: 'Spice',
        unitCost: 6.0000, currentStock: 15, reorderThreshold: 5, parLevel: 40,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-pickled-ginger' },
      update: {},
      create: {
        id: 'luma-ingredient-pickled-ginger', tenantId: luma.id,
        name: 'Pickled Ginger', unit: 'oz', category: 'Condiment',
        unitCost: 2.0000, currentStock: 30, reorderThreshold: 10, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-potatoes' },
      update: {},
      create: {
        id: 'luma-ingredient-potatoes', tenantId: luma.id,
        name: 'Ratte Potatoes', unit: 'lb', category: 'Produce',
        unitCost: 3.0000, currentStock: 50, reorderThreshold: 15, parLevel: 100,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-macaroni' },
      update: {},
      create: {
        id: 'luma-ingredient-macaroni', tenantId: luma.id,
        name: 'Macaroni', unit: 'lb', category: 'Grain',
        unitCost: 2.5000, currentStock: 40, reorderThreshold: 10, parLevel: 80,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-heavy-cream' },
      update: {},
      create: {
        id: 'luma-ingredient-heavy-cream', tenantId: luma.id,
        name: 'Heavy Cream', unit: 'oz', category: 'Dairy',
        unitCost: 0.5000, currentStock: 200, reorderThreshold: 50, parLevel: 400,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-chardonnay' },
      update: {},
      create: {
        id: 'luma-ingredient-chardonnay', tenantId: luma.id,
        name: 'Chardonnay (glass)', unit: 'oz', category: 'Beverage',
        unitCost: 1.5000, currentStock: 500, reorderThreshold: 100, parLevel: 1000,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-bourbon' },
      update: {},
      create: {
        id: 'luma-ingredient-bourbon', tenantId: luma.id,
        name: 'Bourbon', unit: 'oz', category: 'Beverage',
        unitCost: 1.0000, currentStock: 400, reorderThreshold: 100, parLevel: 800,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-dark-chocolate' },
      update: {},
      create: {
        id: 'luma-ingredient-dark-chocolate', tenantId: luma.id,
        name: 'Dark Chocolate 70%', unit: 'oz', category: 'Pantry',
        unitCost: 3.0000, currentStock: 30, reorderThreshold: 10, parLevel: 60,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-valrhona-cocoa' },
      update: {},
      create: {
        id: 'luma-ingredient-valrhona-cocoa', tenantId: luma.id,
        name: 'Valrhona Cocoa', unit: 'oz', category: 'Pantry',
        unitCost: 2.0000, currentStock: 20, reorderThreshold: 8, parLevel: 40,
      },
    }),
    prisma.ingredient.upsert({
      where: { id: 'luma-ingredient-caramel' },
      update: {},
      create: {
        id: 'luma-ingredient-caramel', tenantId: luma.id,
        name: 'Salted Caramel', unit: 'oz', category: 'Pantry',
        unitCost: 1.5000, currentStock: 30, reorderThreshold: 10, parLevel: 60,
      },
    }),
  ]);

  console.log(`Created ${ingredientsCreated.length} ingredients for Luma`);

  // ════════════════════════════════════════════════════════════════════════════
  // LUMA — Recipes
  // ════════════════════════════════════════════════════════════════════════════
  const recipes = [
    {
      id: 'luma-recipe-wagyu-tartare',
      name: 'A5 Wagyu Tartare',
      ingredients: [
        { ingredientId: 'luma-ingredient-miyazaki-a5-strip', quantity: 4.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-black-truffle', quantity: 0.5000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-duck-egg', quantity: 1.0000, unit: 'each' },
      ],
    },
    {
      id: 'luma-recipe-foie-gras-torchon',
      name: 'Foie Gras Torchon',
      ingredients: [
        { ingredientId: 'luma-ingredient-fois-gras', quantity: 3.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-brioche', quantity: 0.5000, unit: 'loaf' },
      ],
    },
    {
      id: 'luma-recipe-uni-spoon',
      name: 'Uni Spoon',
      ingredients: [
        { ingredientId: 'luma-ingredient-hokkaido-uni', quantity: 2.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-osetra-caviar', quantity: 0.5000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
      ],
    },
    {
      id: 'luma-recipe-black-truffle-risotto',
      name: 'Black Truffle Risotto',
      ingredients: [
        { ingredientId: 'luma-ingredient-carnaroli-rice', quantity: 6.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-saffron-threads', quantity: 0.1000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-heavy-cream', quantity: 2.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-aged-parmigiano', quantity: 1.0000, unit: 'oz' },
      ],
    },
    {
      id: 'luma-recipe-dry-aged-ribeye',
      name: 'Dry Aged 45-Day Ribeye',
      ingredients: [
        { ingredientId: 'luma-ingredient-dry-aged-ribeye-45', quantity: 16.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-truffle-butter', quantity: 1.5000, unit: 'oz' },
      ],
    },
    {
      id: 'luma-recipe-a5-miyazaki-striploin',
      name: 'A5 Miyazaki Striploin',
      ingredients: [
        { ingredientId: 'luma-ingredient-miyazaki-a5-strip', quantity: 12.0000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-wasabi', quantity: 0.5000, unit: 'oz' },
        { ingredientId: 'luma-ingredient-pickled-ginger', quantity: 0.5000, unit: 'oz' },
      ],
    },
  ];

  const recipesCreated = await Promise.all(
    recipes.map(r =>
      prisma.recipe.upsert({
        where: { id: r.id },
        update: { name: r.name },
        create: { id: r.id, tenantId: luma.id, name: r.name },
      })
    )
  );
  console.log(`Created ${recipesCreated.length} recipes for Luma`);

  // ════════════════════════════════════════════════════════════════════════════
  // LUMA — RecipeIngredients (link ingredients to recipes)
  // ════════════════════════════════════════════════════════════════════════════
  const recipeIngredientsData = [
    // A5 Wagyu Tartare
    { recipeId: 'luma-recipe-wagyu-tartare', ingredientId: 'luma-ingredient-miyazaki-a5-strip', quantity: 4.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-wagyu-tartare', ingredientId: 'luma-ingredient-black-truffle', quantity: 0.5000, unit: 'oz' },
    { recipeId: 'luma-recipe-wagyu-tartare', ingredientId: 'luma-ingredient-duck-egg', quantity: 1.0000, unit: 'each' },
    // Foie Gras Torchon
    { recipeId: 'luma-recipe-foie-gras-torchon', ingredientId: 'luma-ingredient-fois-gras', quantity: 3.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-foie-gras-torchon', ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-foie-gras-torchon', ingredientId: 'luma-ingredient-brioche', quantity: 0.5000, unit: 'loaf' },
    // Uni Spoon
    { recipeId: 'luma-recipe-uni-spoon', ingredientId: 'luma-ingredient-hokkaido-uni', quantity: 2.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-uni-spoon', ingredientId: 'luma-ingredient-osetra-caviar', quantity: 0.5000, unit: 'oz' },
    { recipeId: 'luma-recipe-uni-spoon', ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
    // Black Truffle Risotto
    { recipeId: 'luma-recipe-black-truffle-risotto', ingredientId: 'luma-ingredient-carnaroli-rice', quantity: 6.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-black-truffle-risotto', ingredientId: 'luma-ingredient-black-truffle', quantity: 1.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-black-truffle-risotto', ingredientId: 'luma-ingredient-saffron-threads', quantity: 0.1000, unit: 'oz' },
    { recipeId: 'luma-recipe-black-truffle-risotto', ingredientId: 'luma-ingredient-heavy-cream', quantity: 2.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-black-truffle-risotto', ingredientId: 'luma-ingredient-aged-parmigiano', quantity: 1.0000, unit: 'oz' },
    // Dry Aged Ribeye
    { recipeId: 'luma-recipe-dry-aged-ribeye', ingredientId: 'luma-ingredient-dry-aged-ribeye-45', quantity: 16.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-dry-aged-ribeye', ingredientId: 'luma-ingredient-truffle-butter', quantity: 1.5000, unit: 'oz' },
    // A5 Miyazaki Striploin
    { recipeId: 'luma-recipe-a5-miyazaki-striploin', ingredientId: 'luma-ingredient-miyazaki-a5-strip', quantity: 12.0000, unit: 'oz' },
    { recipeId: 'luma-recipe-a5-miyazaki-striploin', ingredientId: 'luma-ingredient-wasabi', quantity: 0.5000, unit: 'oz' },
    { recipeId: 'luma-recipe-a5-miyazaki-striploin', ingredientId: 'luma-ingredient-pickled-ginger', quantity: 0.5000, unit: 'oz' },
  ];

  const riCreated = await Promise.all(
    recipeIngredientsData.map(ri =>
      prisma.recipeIngredient.upsert({
        where: { id: `luma-ri-${ri.recipeId}-${ri.ingredientId}` },
        update: { quantity: ri.quantity, unit: ri.unit },
        create: { id: `luma-ri-${ri.recipeId}-${ri.ingredientId}`, recipeId: ri.recipeId, ingredientId: ri.ingredientId, quantity: ri.quantity, unit: ri.unit },
      })
    )
  );
  console.log(`Created ${riCreated.length} recipe-ingredient links for Luma`);

  // ════════════════════════════════════════════════════════════════════════════
  // LUMA — MenuItems (grouped by category)
  // ════════════════════════════════════════════════════════════════════════════
  type MenuItemInput = {
    id: string; name: string; description: string; category: string;
    price: number; recipeId?: string;
  };

  const lumaMenuItems: MenuItemInput[] = [
    // Starters
    { id: 'luma-menu-a5-wagyu-tartare', name: 'A5 Wagyu Tartare', category: 'Starters',
      description: 'Hand-cut Miyazaki A5 with black truffle shaving and quail egg yolk',
      price: 58, recipeId: 'luma-recipe-wagyu-tartare' },
    { id: 'luma-menu-foie-gras-torchon', name: 'Foie Gras Torchon', category: 'Starters',
      description: 'Duck foie gras poached in Sauternes, served with brioche and truffle',
      price: 48, recipeId: 'luma-recipe-foie-gras-torchon' },
    { id: 'luma-menu-uni-spoon', name: 'Uni Spoon', category: 'Starters',
      description: 'Hokkaido sea urchin with Osetra caviar and black truffle on the half shell',
      price: 42, recipeId: 'luma-recipe-uni-spoon' },

    // Salads
    { id: 'luma-menu-burrata-heirloom-tomato', name: 'Burrata & Heirloom Tomato', category: 'Salads',
      description: 'Creamy burrata with peak-season heirloom tomatoes, aged balsamic, basil oil',
      price: 34 },

    // Pastas
    { id: 'luma-menu-black-truffle-risotto', name: 'Black Truffle Risotto', category: 'Pastas',
      description: 'Carnaroli rice slow-cooked with saffron, finished with aged Parmigiano and fresh black truffle',
      price: 68, recipeId: 'luma-recipe-black-truffle-risotto' },
    { id: 'luma-menu-lobster-tagliatelle', name: 'Lobster Tagliatelle', category: 'Pastas',
      description: 'Maine lobster sautéed with garlic, white wine, and fresh herb butter over hand-rolled pasta',
      price: 72 },

    // Mains (Land)
    { id: 'luma-menu-dry-aged-ribeye', name: 'Dry Aged 45-Day Ribeye', category: 'Mains (Land)',
      description: '16oz USDA Prime ribeye dry-aged 45 days, truffle butter, charred bone marrow',
      price: 185, recipeId: 'luma-recipe-dry-aged-ribeye' },
    { id: 'luma-menu-a5-miyazaki-striploin', name: 'A5 Miyazaki Striploin', category: 'Mains (Land)',
      description: '12oz Japanese A5 Miyazaki beef, grilled over binchotan, wasabi, pickled ginger',
      price: 295, recipeId: 'luma-recipe-a5-miyazaki-striploin' },
    { id: 'luma-menu-saffron-duck', name: 'Saffron Duck', category: 'Mains (Land)',
      description: 'Roasted Moulard duck breast with saffron-infused jus, roasted figs, and hazelnut brittle',
      price: 78 },

    // Mains (Sea)
    { id: 'luma-menu-chilean-sea-bass', name: 'Chilean Sea Bass', category: 'Mains (Sea)',
      description: 'Miso-glazed Chilean sea bass, sake butter, pickled daikon, micro shiso',
      price: 95 },
    { id: 'luma-menu-dungeness-crab', name: 'Dungeness Crab', category: 'Mains (Sea)',
      description: 'Whole Dungeness crab prepared two ways: chilled with avocado crema and fried with chili aioli',
      price: 88 },

    // Sides
    { id: 'luma-menu-truffle-fries', name: 'Truffle Fries', category: 'Sides',
      description: 'Ratte potatoes fried in beef fat, finished with black truffle and aged Parmigiano',
      price: 22 },
    { id: 'luma-menu-truffle-mac', name: 'Truffle Mac & Cheese', category: 'Sides',
      description: 'Four-cheese baked macaroni with black truffle and crispy shallots',
      price: 28 },

    // Desserts
    { id: 'luma-menu-chocolate-souffle', name: 'Dark Chocolate Soufflé', category: 'Desserts',
      description: 'Valrhona 70% chocolate soufflé with salted caramel ice cream — allow 18 minutes',
      price: 32 },
    { id: 'luma-menu-tasting-menu-dessert', name: 'Tasting Menu', category: 'Desserts',
      description: "Chef's five-course tasting with wine pairings — 3 hours, vegetarian available",
      price: 45 },

    // Cocktails
    { id: 'luma-menu-champagne-cocktail', name: 'Champagne Cocktail', category: 'Cocktails',
      description: 'Classic combination: Champagne, cognac, angostura bitters, sugar cube',
      price: 24 },
    { id: 'luma-menu-old-fashioned', name: 'Old Fashioned', category: 'Cocktails',
      description: 'Pappy Van Winkle bourbon, demerara sugar, house bitters, orange zest',
      price: 22 },

    // Wine
    { id: 'luma-menu-champagne-glass', name: 'Champagne (glass)', category: 'Wine',
      description: 'Billecart-Salmon Brut Reserve, Champagne — pours 5oz',
      price: 24 },
    { id: 'luma-menu-burgundy-glass', name: 'Burgundy (glass)', category: 'Wine',
      description: 'Domaine de la Romanée-Conti La Tâche Grand Cru — pours 2oz tasting pour',
      price: 58 },

    // Beer
    { id: 'luma-menu-japanese-lager', name: 'Japanese Lager', category: 'Beer',
      description: 'Asahi Super Dry — crisp, clean, pairs with umami-rich dishes',
      price: 14 },
  ];

  const menuItemsCreated = await Promise.all(
    lumaMenuItems.map(item =>
      prisma.menuItem.upsert({
        where: { id: item.id },
        update: {
          name: item.name, description: item.description, category: item.category,
          price: item.price, recipeId: item.recipeId ?? null,
          station: CATEGORY_STATION_MAP[item.category] ?? Station.EXPO,
        },
        create: {
          id: item.id, tenantId: luma.id,
          name: item.name, description: item.description,
          category: item.category,
          price: item.price,
          station: CATEGORY_STATION_MAP[item.category] ?? Station.EXPO,
          recipeId: item.recipeId ?? null,
        },
      })
    )
  );
  console.log(`Created ${menuItemsCreated.length} menu items for Luma`);

  // ════════════════════════════════════════════════════════════════════════════
  // SAKURA — Basic ingredient set (Japanese cuisine)
  // ════════════════════════════════════════════════════════════════════════════
  const sakuraIngredients = [
    { id: 'sakura-ingr-wagyu-a5', name: 'Japanese Wagyu A5 Striploin', unit: 'oz', cost: 14.0000, stock: 60, threshold: 15 },
    { id: 'sakura-ingr-salmon', name: 'Otoro (Bluefin Tuna Belly)', unit: 'oz', cost: 18.0000, stock: 40, threshold: 10 },
    { id: 'sakura-ingrUNI', name: 'Hokkaido Uni', unit: 'oz', cost: 9.0000, stock: 30, threshold: 8 },
    { id: 'sakura-ingr-ikura', name: 'Ikura (Salmon Roe)', unit: 'oz', cost: 12.0000, stock: 25, threshold: 8 },
    { id: 'sakura-ingr-rice', name: 'Sushi Rice', unit: 'lb', cost: 2.0000, stock: 100, threshold: 30 },
    { id: 'sakura-ingr-nori', name: 'Nori Sheets', unit: 'each', cost: 0.5000, stock: 200, threshold: 50 },
    { id: 'sakura-ingr-wasabi', name: 'Fresh Wasabi Root', unit: 'oz', cost: 8.0000, stock: 15, threshold: 5 },
    { id: 'sakura-ingr-sake', name: 'Junmai Daiginjo Sake', unit: 'oz', cost: 3.0000, stock: 200, threshold: 50 },
    { id: 'sakura-ingr-miso', name: 'Shiro Miso', unit: 'lb', cost: 4.0000, stock: 30, threshold: 10 },
  ];

  await Promise.all(sakuraIngredients.map(i =>
    prisma.ingredient.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id, tenantId: sakura.id, name: i.name, unit: i.unit,
        category: 'Ingredient', unitCost: i.cost, currentStock: i.stock,
        reorderThreshold: i.threshold, parLevel: i.stock * 2,
      },
    })
  ));
  console.log(`Created ${sakuraIngredients.length} ingredients for Sakura`);

  const sakuraCategories = ['Starters', 'Sushi & Sashimi', 'Robata', 'Noodles', 'Desserts', 'Sake', 'Beer'];
  const sakuraMenuItems = [
    { id: 'sakura-menu-uni', name: 'Hokkaido Uni', category: 'Sushi & Sashimi', price: 38, description: 'Direct from Hokkaido — creamy, briny, unmatched', recipeId: null },
    { id: 'sakura-menu-otoro', name: 'Otoro Sashimi', category: 'Sushi & Sashimi', price: 48, description: 'Bluefin tuna belly, aged 48 hours', recipeId: null },
    { id: 'sakura-menu-wagyu-sushi', name: 'Wagyu A5 Nigiri', category: 'Sushi & Sashimi', price: 55, description: 'Single piece of Japanese A5, seared, with synthetic wasabi', recipeId: null },
    { id: 'sakura-menu-kobe-beef', name: 'Kobe Beef A5 Ribeye', category: 'Robata', price: 280, description: '12oz char-grilled over binchotan charcoal', recipeId: null },
    { id: 'sakura-menu-ikura-don', name: 'Ikura Don', category: 'Sushi & Sashimi', price: 42, description: 'Salmon roe over sushi rice with house-made pickles', recipeId: null },
    { id: 'sakura-menu-unagi-sake', name: 'Unagi with Aged Sake', category: 'Robata', price: 62, description: 'Broiled eel, Kabosu-citrus glaze, chilled junmai daiginjo', recipeId: null },
    { id: 'sakura-menu-matcha', name: 'Matcha Tiramisu', category: 'Desserts', price: 18, description: 'Uji ceremonial-grade matcha, mascarpone, espresso-soaked ladyfingers', recipeId: null },
  ];

  const sakuraStationMap: Record<string, Station> = {
    'Sushi & Sashimi': Station.COLD, 'Robata': Station.GRILL,
    'Noodles': Station.EXPO, 'Desserts': Station.PASTRY, 'Starters': Station.COLD,
    'Sake': Station.BAR, 'Beer': Station.BAR,
  };

  await Promise.all(sakuraMenuItems.map(item =>
    prisma.menuItem.upsert({
      where: { id: item.id },
      update: { name: item.name, description: item.description, category: item.category, price: item.price },
      create: {
        id: item.id, tenantId: sakura.id, name: item.name,
        description: item.description, category: item.category, price: item.price,
        station: sakuraStationMap[item.category] ?? Station.EXPO,
      },
    })
  ));
  console.log(`Created ${sakuraMenuItems.length} menu items for Sakura`);

  // ════════════════════════════════════════════════════════════════════════════
  // THE GARDEN — Basic ingredient set (plant-forward cuisine)
  // ════════════════════════════════════════════════════════════════════════════
  const gardenIngredients = [
    { id: 'garden-ingr-mozzarella', name: 'Fior di Latte Mozzarella', unit: 'oz', cost: 2.5000, stock: 80, threshold: 20 },
    { id: 'garden-ingr-heirloom-tomato', name: 'Heirloom Tomato Mix', unit: 'lb', cost: 6.0000, stock: 50, threshold: 15 },
    { id: 'garden-ingr-basil', name: 'Genovese Basil', unit: 'lb', cost: 8.0000, stock: 30, threshold: 8 },
    { id: 'garden-ingr-arugula', name: 'Wild Arugula', unit: 'lb', cost: 7.0000, stock: 25, threshold: 10 },
    { id: 'garden-ingr-burrata', name: 'Burrata', unit: 'each', cost: 8.0000, stock: 20, threshold: 8 },
    { id: 'garden-ingr-olive-oil', name: 'Tuscan Extra Virgin Olive Oil', unit: 'oz', cost: 1.0000, stock: 200, threshold: 50 },
    { id: 'garden-ingr-parmesan', name: 'Parmigiano Reggiano 36mo', unit: 'oz', cost: 4.0000, stock: 50, threshold: 15 },
    { id: 'garden-ingr-gf-pasta', name: 'Gluten-Free Fusilli', unit: 'lb', cost: 5.0000, stock: 40, threshold: 10 },
    { id: 'garden-ingr-pesto', name: 'Basil Pesto Genovese', unit: 'oz', cost: 1.5000, stock: 60, threshold: 20 },
    { id: 'garden-ingr-coconut-milk', name: 'Coconut Milk', unit: 'oz', cost: 0.5000, stock: 100, threshold: 30 },
    { id: 'garden-ingr-curry-leaves', name: 'Fresh Curry Leaves', unit: 'oz', cost: 3.0000, stock: 20, threshold: 5 },
    { id: 'garden-ingr-cashew-cream', name: 'Cashew Cream', unit: 'oz', cost: 2.0000, stock: 40, threshold: 10 },
    { id: 'garden-ingr-edamame', name: 'Edamame', unit: 'lb', cost: 3.0000, stock: 50, threshold: 15 },
    { id: 'garden-ingr-mushrooms', name: 'Wild Mushroom Medley', unit: 'lb', cost: 7.0000, stock: 30, threshold: 10 },
  ];

  await Promise.all(gardenIngredients.map(i =>
    prisma.ingredient.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id, tenantId: theGarden.id, name: i.name, unit: i.unit,
        category: 'Produce', unitCost: i.cost, currentStock: i.stock,
        reorderThreshold: i.threshold, parLevel: i.stock * 2,
      },
    })
  ));
  console.log(`Created ${gardenIngredients.length} ingredients for The Garden`);

  const gardenCategories = ['Starters', 'Salads', 'Pastas', 'Mains', 'Sides', 'Desserts', 'Cocktails'];
  const gardenMenuItems = [
    { id: 'garden-menu-tomato-burrata', name: 'Heirloom Tomato & Burrata', category: 'Salads', price: 28, description: 'Seasonal heirloom tomatoes, creamy burrata, Tuscan EVOO, 36mo Parmigiano' },
    { id: 'garden-menu-wild-mushroom-pasta', name: 'Wild Mushroom Fusilli', category: 'Pastas', price: 34, description: 'Gluten-free fusilli, forest mushroom medley, cashew cream, crispy sage' },
    { id: 'garden-menu-basil-pesto', name: 'Genovese Pesto Fusilli', category: 'Pastas', price: 30, description: 'House-made basil pesto, Fior di Latte mozzarella, toasted pine nuts' },
    { id: 'garden-menu-curry-lentils', name: 'Coconut Curry Lentils', category: 'Mains', price: 26, description: 'Red lentils simmered in coconut milk with fresh curry leaves, turmeric, ginger' },
    { id: 'garden-menu-edamame-hummus', name: 'Edamame Hummus', category: 'Starters', price: 18, description: 'Smooth edamame hummus, herb oil, sesame crisps — shareable' },
    { id: 'garden-menu-truffle-fries', name: 'Truffle Fries', category: 'Sides', price: 18, description: 'Ratte potatoes, black truffle, Parmigiano Reggiano' },
    { id: 'garden-menu-chocolate-tart', name: 'Dark Chocolate & Salted Caramel Tart', category: 'Desserts', price: 16, description: '70% Valrhona chocolate, house-made salted caramel, cocoa nibs' },
  ];

  const gardenStationMap: Record<string, Station> = {
    'Salads': Station.COLD, 'Pastas': Station.EXPO,
    'Mains': Station.GRILL, 'Sides': Station.EXPO,
    'Desserts': Station.PASTRY, 'Starters': Station.COLD,
    'Cocktails': Station.BAR,
  };

  await Promise.all(gardenMenuItems.map(item =>
    prisma.menuItem.upsert({
      where: { id: item.id },
      update: { name: item.name, description: item.description, category: item.category, price: item.price },
      create: {
        id: item.id, tenantId: theGarden.id, name: item.name,
        description: item.description, category: item.category, price: item.price,
        station: gardenStationMap[item.category] ?? Station.EXPO,
      },
    })
  ));
  console.log(`Created ${gardenMenuItems.length} menu items for The Garden`);

  // ════════════════════════════════════════════════════════════════════════════
  // Summary
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n── Menu Seed Summary ──');

  for (const [name, tenantId] of [['Luma', luma.id], ['Sakura', sakura.id], ['The Garden', theGarden.id]]) {
    const ingrCount = await prisma.ingredient.count({ where: { tenantId } });
    const menuCount = await prisma.menuItem.count({ where: { tenantId } });
    const recipeCount = await prisma.recipe.count({ where: { tenantId } });
    console.log(`${name}: ${ingrCount} ingredients | ${menuCount} menu items | ${recipeCount} recipes`);
  }

  // Menu engineering distribution (Luma)
  const lumaItems = await prisma.menuItem.findMany({ where: { tenantId: luma.id } });
  const quadrantCounts = lumaItems.reduce((acc, item) => {
    // Quadrant stored in description field as a tag for reference
    return acc;
  }, {} as Record<string, number>);

  console.log('\nLuma menu items by category:');
  const byCategory = lumaItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  for (const [cat, count] of Object.entries(byCategory)) {
    console.log(`  ${cat}: ${count} items`);
  }

  console.log('\nLuma menu items by menu engineering quadrant:');
  const quadrantDefs: Array<{ id: string; quadrant: MenuEngineeringQuadrant }> = [
    { id: 'luma-menu-a5-wagyu-tartare', quadrant: 'Star' },
    { id: 'luma-menu-foie-gras-torchon', quadrant: 'Star' },
    { id: 'luma-menu-uni-spoon', quadrant: 'Star' },
    { id: 'luma-menu-burrata-heirloom-tomato', quadrant: 'Plowhorse' },
    { id: 'luma-menu-black-truffle-risotto', quadrant: 'Star' },
    { id: 'luma-menu-lobster-tagliatelle', quadrant: 'Horse' },
    { id: 'luma-menu-dry-aged-ribeye', quadrant: 'Star' },
    { id: 'luma-menu-a5-miyazaki-striploin', quadrant: 'Star' },
    { id: 'luma-menu-saffron-duck', quadrant: 'Horse' },
    { id: 'luma-menu-chilean-sea-bass', quadrant: 'Horse' },
    { id: 'luma-menu-dungeness-crab', quadrant: 'Horse' },
    { id: 'luma-menu-truffle-fries', quadrant: 'Star' },
    { id: 'luma-menu-truffle-mac', quadrant: 'Star' },
    { id: 'luma-menu-chocolate-souffle', quadrant: 'Horse' },
    { id: 'luma-menu-tasting-menu-dessert', quadrant: 'Horse' },
    { id: 'luma-menu-champagne-cocktail', quadrant: 'Horse' },
    { id: 'luma-menu-old-fashioned', quadrant: 'Star' },
    { id: 'luma-menu-champagne-glass', quadrant: 'Horse' },
    { id: 'luma-menu-burgundy-glass', quadrant: 'Horse' },
    { id: 'luma-menu-japanese-lager', quadrant: 'Plowhorse' },
  ];

  const qCounts = quadrantDefs.reduce((acc, d) => {
    acc[d.quadrant] = (acc[d.quadrant] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  for (const [q, count] of Object.entries(qCounts)) {
    console.log(`  ${q}: ${count} items`);
  }
}

export async function seedMenu() {
  await main();
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());