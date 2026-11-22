import { Router } from "express";
import {
  getProjetoMetricas,
  getRequisicaoHistorico,
  getRequisicaoMetricas,
  getRequisicaoRecursos,
  getProjetoRecursos
} from "../controllers/metricas.controller.js";
import { checkRole } from "../middleware/require-project-role.js";




export const metricasRoutes = Router();

metricasRoutes.get("/:projectId/metricas", checkRole, getProjetoMetricas);
metricasRoutes.get("/:projectId/recursos", checkRole, getProjetoRecursos);

metricasRoutes.get(
  "/:projectId/requisicoes/:requestId/metricas",
  checkRole,
  getRequisicaoMetricas,
);
metricasRoutes.get(
  "/:projectId/requisicoes/:requestId/historico",
  checkRole,
  getRequisicaoHistorico,
);
metricasRoutes.get(
  "/:projectId/requisicoes/:requestId/recursos",
  checkRole,
  getRequisicaoRecursos,
);
