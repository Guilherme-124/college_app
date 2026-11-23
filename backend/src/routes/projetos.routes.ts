import { Router } from "express";
import {
  createProjeto,
  listProjetos,
  listStatusProjetos,
  deleteProjeto,
  editProjeto
} from "../controllers/projetos.controller.js";
import { checkRole } from "../middleware/require-project-role.js";
import { 
  createConvite,
  deleteConvite,
  listConvites
} from "../controllers/convites.controller.js";




export const projetosRoutes = Router();

projetosRoutes.get("/", listProjetos);
projetosRoutes.post("/", createProjeto);
projetosRoutes.get("/status", listStatusProjetos);
projetosRoutes.delete("/:projectId", checkRole, deleteProjeto);
projetosRoutes.patch("/:projectId", checkRole, editProjeto);

projetosRoutes.get("/:projectId/convites", checkRole, listConvites);
projetosRoutes.post("/:projectId/convites", checkRole, createConvite);
projetosRoutes.delete("/:projectId/convites/:conviteId", checkRole, deleteConvite);
