import type { Request, Response, NextFunction } from "express";
import { supabase } from "../libs/db.js";



export const isUuid = (id: string) => 
  /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);



export const checkRole = async (req: Request, res: Response, next: NextFunction) => {
  const { projectId } = req.params;

  if (!projectId || !isUuid(projectId.toString())) {
    return res.status(404).json({ error: "Projeto nao encontrado" });
  }

  try {
    const { data, error } = await supabase
      .from("projeto_membros")
      .select("papel")
      .eq("projeto_id", projectId)
      .eq("usuario_id", res.locals.usuario.id)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: "Usuario sem acesso ao projeto"});
    }

    res.locals.papel = data.papel;
    next();
  } catch (err) {
    console.log("erro no middleware chackRole:", err);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
};




export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  await checkRole(req, res, async () => {
    if (res.locals.papel !== 'admin') {
      return res.status(403).json({ error: "Usuario sem permissao" });
    }
    next();
  });
};
