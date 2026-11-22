import { Router } from "express";
import { requireUser } from "../middleware/require-user.js";
import { metricasRoutes } from "./metricas.routes.js";
import { projetosRoutes } from "./projetos.routes.js";
import { requisicoesRoutes } from "./requisicoes.routes.js";
import { systemRoutes } from "./system.routes.js";




export const apiRouter = Router();

apiRouter.use(systemRoutes);

apiRouter.use(
  "/projetos",
  requireUser,
  projetosRoutes,
  requisicoesRoutes,
  metricasRoutes,
);
