import { Router } from "express";
import {
  createProjeto,
  listProjetos,
  listStatusProjetos,
  deleteProjeto,
  editProjeto
} from "../controllers/projetos.controller.js";
import { checkRole } from "../middleware/require-project-role.js";




export const projetosRoutes = Router();

projetosRoutes.get("/", listProjetos);
projetosRoutes.post("/", createProjeto);
projetosRoutes.get("/status", listStatusProjetos);
projetosRoutes.delete("/:projectId", checkRole, deleteProjeto);
projetosRoutes.patch("/:projectId", checkRole, editProjeto);

