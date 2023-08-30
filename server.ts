import { PrismaClient } from "@prisma/client";
import express, { json } from "express";
import cors from "cors";
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
  res.send({ message: `Hello chief, ${userId}`, userId: userId });
});
