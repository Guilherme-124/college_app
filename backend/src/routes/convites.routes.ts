import { Router } from "express";
import { aceitarConvite, getConvite } from "../controllers/convites.controller.js";



export const convitesRoutes = Router();

convitesRoutes.get("/:token", getConvite);
convitesRoutes.post("/:token/aceitar", aceitarConvite);