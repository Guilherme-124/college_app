import { Router } from "express";
import {
  createRequisicao,
  deleteRequisicao,
  getRequisicao,
  listRequisicoes,
  editRequisicao,
} from "../controllers/requisicoes.controller.js";
import { checkRole } from "../middleware/require-project-role.js";

export const requisicoesRoutes = Router();


requisicoesRoutes.get("/:projectId/requisicoes", checkRole, listRequisicoes);
requisicoesRoutes.post(
  "/:projectId/requisicoes",
  checkRole,
  createRequisicao,
);
requisicoesRoutes.get(
  "/:projectId/requisicoes/:requestId",
  checkRole,
  getRequisicao,
);
requisicoesRoutes.patch(
  "/:projectId/requisicoes/:requestId",
  checkRole,
  editRequisicao,
);
requisicoesRoutes.delete(
  "/:projectId/requisicoes/:requestId",
  checkRole,
  deleteRequisicao,
);
