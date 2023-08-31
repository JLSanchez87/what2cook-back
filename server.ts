import cors from "cors";
import express, { json } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { AuthMiddleware, AuthRequest } from "./auth/middleware";
import { toToken } from "./auth/jwt";

const prisma = new PrismaClient();
const app = express();

app.use(json());
app.use(cors());

const port = 3001;

app.listen(port, () => {
  console.log(`You're now listening on port: ${port}`);
});

// GET - User information
app.get("/me", AuthMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId;
  if (userId === undefined) {
    res.status(500).send({ message: "Something went terribly wrong!" });
    return;
  }
  const thisUser = await prisma.user.findUnique({
    select: {
      id: true,
      username: true,
      email: true,
      userImg: true,
      Fridge: true,
    },
    where: {
      id: userId,
    },
  });
  res.send(thisUser);
});

// POST - New user registration
const registrationValidator = z
  .object({
    username: z.string().nonempty().max(20),
    password: z.string().min(10),
    email: z.string().email({ message: "Invalid email address" }),
    userImg: z
      .string()
      .url({
        message: "Invalid URL, please use a valid URL or skip this part",
      })
      .optional(),
  })
  .strict();

app.post("/register", async (req, res) => {
  const requestBody = req.body;
  const parsedBody = registrationValidator.safeParse(requestBody);
  if (parsedBody.success) {
    try {
      const newUser = await prisma.user.create({
        data: parsedBody.data,
      });
      res.status(201).send(newUser);
    } catch (error) {
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    res.status(500).send(parsedBody.error.flatten());
  }
});

// POST - User login
const loginValidator = z
  .object({
    username: z.string().nonempty().max(20),
    password: z
      .string()
      .min(10, { message: "password must be 10 or more characters" }),
  })
  .strict();

app.post("/login", async (req, res) => {
  const requestBody = req.body;
  const parsedBody = loginValidator.safeParse(requestBody);
  if (parsedBody.success) {
    try {
      const userToLogin = await prisma.user.findUnique({
        where: {
          username: requestBody.username,
        },
      });
      if (userToLogin && userToLogin.password === requestBody.password) {
        const token = toToken({ userId: userToLogin.id });
        res.status(200).send({ token: token });
        return;
      }
      res.status(400).send({ message: "Login failed" });
    } catch {
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    res
      .status(400)
      .send({ message: "'Username' and 'Password' are required!" });
  }
});

// POST - Add Item to User
const addProductOnUserValidator = z.object({
  userId: z.number().int(),
  productId: z.number().int(),
  productCount: z.number().int(),
});

app.post("/fridge", AuthMiddleware, async (req: AuthRequest, res) => {
  const requestBody = req.body;
  const parsedBody = addProductOnUserValidator.safeParse(requestBody);
  if (parsedBody.success) {
    try {
      const newFridgeItem = await prisma.productOnUser.create({
        data: parsedBody.data,
      });
      if (!req.userId) {
        res.status(500).send({ message: "Something went wrong!" });
      }
      res.status(200).send(newFridgeItem);
    } catch (error) {
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    res.status(500).send(parsedBody.error.flatten());
  }
});

// GET - List all the items in the user's fridge
app.get("/fridge", async (req, res) => {
  const products = await prisma.productOnUser.findMany();
  res.send(products);
});

// GET - List of all available recipes
app.get("/available-recipes", async (req, res) => {
  const availableRecipes = await prisma.productOnRecipe.findMany();
  res.send(availableRecipes);
});
