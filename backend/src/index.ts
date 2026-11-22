import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { apiRouter } from "./routes/index.js";
import { startScheduler } from "./libs/scheduler.js";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(clerkMiddleware());
app.use(express.json({ limit: "10kb" }));
app.use(apiRouter);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

startScheduler();
