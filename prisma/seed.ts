import { PrismaClient } from "@prisma/client";
import categories from "./data/categories.json";
import users from "./data/users.json";
import products from "./data/products.json";
import recipes from "./data/recipes.json";

const prisma = new PrismaClient();

const seed = async () => {
  for (let i = 0; i < categories.length; i++) {
    await prisma.category.create({ data: categories[i] });
  }

  for (let i = 0; i < users.length; i++) {
    await prisma.user.create({ data: users[i] });
  }
};

seed();
