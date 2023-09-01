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
  productId: z.array(z.number().int()),
});

app.post("/fridge", AuthMiddleware, async (req: AuthRequest, res) => {
  const requestBody = req.body;
  let userThatMadeRequest = Number(req.userId);

  console.log(requestBody);
  // Only the productId from the body data
  const parsedBody = addProductOnUserValidator.safeParse(requestBody);

  // Set user ID in the backend only, so we need to acquire the userId from our Middleware
  const parsedUserId = z.number().safeParse(userThatMadeRequest);
  if (parsedBody.success && parsedUserId.success) {
    console.log(parsedBody);
    try {
      // Loop over the array recieved in the requestBody
      for (let i = 0; i < parsedBody.data.productId.length; i++) {
        const newFridgeItem = await prisma.productOnUser.create({
          data: {
            // Get userId from the parsed data from the Middleware
            userId: parsedUserId.data,
            // Get productId from the parsed data from the request body
            productId: parsedBody.data.productId[i],
            // hardcoded value
            productCount: 1,
          },
        });
      }

      if (!req.userId) {
        res
          .status(500)
          .send({ message: "Something went wrong! Not the correct user ID" });
      }
      res.status(200).send("Items added");
    } catch (error) {
      res.status(500).send({ message: "Failed to create fridge item(s)!" });
    }
  } else if (!parsedBody.success) {
    res.status(400).send(parsedBody.error.flatten());
  } else if (!parsedUserId.success) {
    res.status(401).send(parsedUserId.error.flatten());
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

// GET - List of all products
app.get("/products", async (req, res) => {
  const products = await prisma.product.findMany();
  res.send(products);
});
