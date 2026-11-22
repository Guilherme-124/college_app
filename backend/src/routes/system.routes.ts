import { Router } from "express";
import { checkDatabase, getMe } from "../controllers/system.controlers.js"
import { requireUser } from "../middleware/require-user.js";



export const systemRoutes = Router();

systemRoutes.get("/libs/db", checkDatabase);
systemRoutes.get("/me", requireUser, getMe);
