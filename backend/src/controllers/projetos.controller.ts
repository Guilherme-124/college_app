import type { Request, Response } from "express";
import { supabase } from "../libs/db.js";



type StatusRequisicao = "up" | "down" | "pending";

interface StatusRow {
  projeto_id: string;
  projeto_nome: string;
  requisicao_id: string | null;
  requisicao_nome: string | null;
  disponibilidade: boolean | null;
  estado: StatusRequisicao | null;
}



export const listProjetos = async (_req: Request, res: Response) => {
  const usuarioId: string = res.locals.usuario.id;

  const { data, error } = await supabase
    .from("projeto_membros")
    .select("papel, projetos(id, nome, descricao, created_at)")
    .eq("usuario_id", usuarioId);

  if (error) {
    console.error("Erro em GET /projetos:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }


  const projetos =  (data || [])
    .flatMap((r: any) => (r.projetos ? [{ ...r.projetos, papel: r.papel }] : []))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  res.json(projetos);
};




export const createProjeto = async (req: Request, res: Response) => {
  const { nome, descricao } = req.body;

  const nomeTrim = nome?.trim();
  const descricaoTrim = descricao?.trim() || null;

  if (!nomeTrim) {
    return res
      .status(400)
      .json({ status: "fail", error: "Nome é obrigatorio" });
  }

  if (nomeTrim.length > 100) {
    return res.status(400).json({
      status: "fail",
      error: "Nome deve ter no maximo 100 caracteres",
    });
  }

  if (descricaoTrim !== null && descricaoTrim.length > 500) {
    return res.status(400).json({
      status: "fail",
      error: "Descrição deve ter no maximo 500 caracteres",
    });
  }

  const { data, error } = await supabase
    .from("projetos")
    .insert({ nome: nomeTrim, descricao: descricaoTrim, owner_id: res.locals.usuario.id })
    .select("id, nome, descricao, created_at")
    .single();

  if (error) {
    console.error("Erro ao inserir projeto:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.status(201).json({ status: "success", projeto: data });
};




export const listStatusProjetos = async (_req: Request, res: Response) => {
  const usuarioId: string = res.locals.usuario.id;

  const { data, error } = await supabase.rpc("status_projetos", {
    p_usuario_id: usuarioId,
  });

  if (error) {
    console.error("Erro em GET /projetos/status:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  const projetos = new Map<string, {
    id: string;
    nome: string;
    requests: { id: string; nome: string; status: StatusRequisicao }[];
  }>();

  for (const row of (data ?? []) as unknown as StatusRow[]) {
    let projeto = projetos.get(row.projeto_id);

    if (!projeto) {
      projeto = { id: row.projeto_id, nome: row.projeto_nome, requests: [] };
      projetos.set(row.projeto_id, projeto);
    }

    if (row.requisicao_id) {
      projeto.requests.push({
        id: row.requisicao_id,
        nome: row.requisicao_nome ?? "",
        status:
          row.estado ?? "pending",
      });
    }
  }

  res.json([...projetos.values()]);
};




export const deleteProjeto = async (req: Request, res: Response) => {
  const {projectId} = req.params;

  if (res.locals.papel !== "owner") {
    return res.status(403).json({ status: "fail", error: "Apenas o Lider pode deletar o projeto"});
  }

  const { error } = await supabase
    .from("projetos")
    .delete()
    .eq("id", projectId);

  if (error) {
    console.error("Erro ao deletar projeto:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json({ status: "success" });
}





export const editProjeto = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  if (res.locals.papel !== "owner" && res.locals.papel !== "editor") {
    return res
      .status(403)
      .json({ status: "fail", error: "Sem permissao para editar o projeto" });
  }

  const nome = typeof req.body.nome === "string" ? req.body.nome.trim() : '';

  const descricao = typeof req.body.descricao === "string" ? req.body.descricao.trim() : '';

  if (!nome) {
    return res.status(400).json({ status: "fail", error: "Nome é obrigatorio" });
  }
  if (nome.length > 100) {
    return res.status(400).json({ status: "fail", error: "Nome deve ter no maximo 100 caracteres" });
  }
  if (descricao.length > 500) {
    return res.status(400).json({ status: "fail", error: "Descrição deve ter no maximo 500 caracteres" });
  }

  const { data, error } = await supabase
    .from("projetos")
    .update({ nome, descricao: descricao || null })
    .eq("id", projectId)
    .select("id, nome, descricao, created_at")
    .single();

  if (error) {
    console.error("Erro ao editar projeto:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json({ status: "success", projeto: data });
};


