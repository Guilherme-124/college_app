import type { Request, Response } from "express";
import { supabase } from "../libs/db.js";



export const checkDatabase = async (_req: Request, res: Response) => {
  const { error } = await supabase.from("usuarios").select("id").limit(1);

  if (error) {
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json({ status: "success" });
};

export const getMe = (_req: Request, res: Response) => {
  res.json(res.locals.usuario);
};