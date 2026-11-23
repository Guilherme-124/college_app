import type { Request, Response } from "express";
import { supabase } from "../libs/db.js";
import { isUuid } from "../middleware/require-project-role.js";
import { sendEmail } from "../utils/send-email.js";





const STATUS_PENDENTE = "pendente";
const STATUS_ACEITO = "aceito";
const PAPEIS_CONVIDAVEIS = ["editor", "viewer"];

const VALIDADE_DIAS = 7;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const agora = () => new Date().toISOString();


export const createConvite = async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };

  if (res.locals.papel !== "owner") {
    return res.status(403).json({ status: "fail", error: "Apenas o líder pode convidar pessoas" });
  }

  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const papel = typeof req.body.papel === "string" ? req.body.papel : "";

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ status: "fail", error: "E-mail inválido" });
  }
  if (!PAPEIS_CONVIDAVEIS.includes(papel)) {
    return res.status(400).json({ status: "fail", error: "Papel inválido" });
  }


  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (usuario) {
    const { data: membro } = await supabase
      .from("projeto_membros")
      .select("usuario_id")
      .eq("projeto_id", projectId)
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    if (membro) {
      return res.status(409).json({ status: "fail", error: "Essa pessoa já participa do projeto" });
    }
  }


  const { data: pendente } = await supabase
    .from("projeto_convites")
    .select("id")
    .eq("projeto_id", projectId)
    .eq("email", email)
    .eq("status", STATUS_PENDENTE)
    .gt("expires_at", agora())
    .limit(1);

  if (pendente && pendente.length > 0) {
    return res.status(409).json({
      status: "fail",
      error: "Já existe um convite pendente para esse e-mail",
    });
  }

  const expiresAt = new Date(Date.now() + VALIDADE_DIAS * 24 * 60 * 60 * 1000).toISOString();

  const { data: convite, error } = await supabase
    .from("projeto_convites")
    .insert({
      projeto_id: projectId,
      email,
      papel,
      status: STATUS_PENDENTE,
      convidado_por: res.locals.usuario.id,
      expires_at: expiresAt,
    })
    .select("id, email, papel, expires_at, token")
    .single();

  if (error) {
    console.error("Erro ao criar convite:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  const { data: projeto } = await supabase
    .from("projetos")
    .select("nome")
    .eq("id", projectId)
    .maybeSingle();

  const nomeProjeto = projeto?.nome ?? "um projeto";
  const quem = res.locals.usuario.nome || res.locals.usuario.email || "Alguém";
  const link = `${process.env.FRONTEND_URL ?? ""}/convite/${convite.token}`;

  const enviado = await sendEmail(
    [email],
    `Convite para o projeto ${nomeProjeto}`,
    `<p><strong>${escapeHtml(quem)}</strong> convidou você para o projeto
       <strong>${escapeHtml(nomeProjeto)}</strong> no Uptime Monitor.</p>
     <p><a href="${link}">Aceitar convite</a></p>
     <p>Entre com este mesmo e-mail (${escapeHtml(email)}). O convite vale por ${VALIDADE_DIAS} dias.</p>`,
  );

  res.status(201).json({
    status: "success",
    convite: {
      id: convite.id,
      email: convite.email,
      papel: convite.papel,
      expires_at: convite.expires_at,
    },
    email_enviado: enviado,
    link,
  });
};




export const listConvites = async (req: Request, res: Response) => {
  const { projectId } = req.params as { projectId: string };

  if (res.locals.papel !== "owner") {
    return res.status(403).json({ status: "fail", error: "Apenas o líder pode ver os convites" });
  }

  const { data, error } = await supabase
    .from("projeto_convites")
    .select("id, email, papel, expires_at")
    .eq("projeto_id", projectId)
    .eq("status", STATUS_PENDENTE)
    .gt("expires_at", agora())
    .order("expires_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar convites:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json(data ?? []);
};




export const deleteConvite = async (req: Request, res: Response) => {
  const { projectId, conviteId } = req.params as { projectId: string; conviteId: string };

  if (res.locals.papel !== "owner") {
    return res.status(403).json({ status: "fail", error: "Apenas o líder pode cancelar convites" });
  }
  if (!isUuid(conviteId)) {
    return res.status(404).json({ status: "fail", error: "Convite não encontrado" });
  }

  const { error } = await supabase
    .from("projeto_convites")
    .delete()
    .eq("id", conviteId)
    .eq("projeto_id", projectId)
    .eq("status", STATUS_PENDENTE);

  if (error) {
    console.error("Erro ao cancelar convite:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json({ status: "success" });
};


async function findConvite(token: string) {
  const { data } = await supabase
    .from("projeto_convites")
    .select("id, projeto_id, email, papel, status, expires_at, convidado_por")
    .eq("token", token)
    .maybeSingle();

  return data;
}




export const getConvite = async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };

  if (!isUuid(token)) {
    return res.status(404).json({ status: "fail", error: "Convite não encontrado" });
  }

  const convite = await findConvite(token);
  if (!convite) {
    return res.status(404).json({ status: "fail", error: "Convite não encontrado" });
  }

  const { data: projeto } = await supabase
    .from("projetos")
    .select("nome")
    .eq("id", convite.projeto_id)
    .maybeSingle();

  const { data: quem } = await supabase
    .from("usuarios")
    .select("nome, email")
    .eq("id", convite.convidado_por)
    .maybeSingle();

  let status = "ok";
  if (convite.status !== STATUS_PENDENTE) status = "usado";
  else if (new Date(convite.expires_at) < new Date()) status = "expirado";

  const emailUsuario = String(res.locals.usuario.email ?? "").toLowerCase();

  res.json({
    projeto_nome: projeto?.nome ?? "",
    papel: convite.papel,
    email: convite.email,
    convidado_por: quem?.nome || quem?.email || "",
    status,
    email_confere: emailUsuario === String(convite.email).toLowerCase(),
  });
};




export const aceitarConvite = async (req: Request, res: Response) => {
  const { token } = req.params as { token: string };

  if (!isUuid(token)) {
    return res.status(404).json({ status: "fail", error: "Convite não encontrado" });
  }

  const convite = await findConvite(token);
  if (!convite) {
    return res.status(404).json({ status: "fail", error: "Convite não encontrado" });
  }

  if (convite.status !== STATUS_PENDENTE) {
    return res.status(409).json({ status: "fail", error: "Este convite já foi utilizado" });
  }
  if (new Date(convite.expires_at) < new Date()) {
    return res.status(410).json({ status: "fail", error: "Este convite expirou" });
  }

  const usuario = res.locals.usuario;
  const emailUsuario = String(usuario.email ?? "").toLowerCase();

  if (emailUsuario !== String(convite.email).toLowerCase()) {
    return res.status(403).json({
      status: "fail",
      error: `Este convite foi enviado para ${convite.email}. Você está conectado como ${usuario.email ?? "outra conta"}.`,
    });
  }

  const { data: jaMembro } = await supabase
    .from("projeto_membros")
    .select("usuario_id")
    .eq("projeto_id", convite.projeto_id)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (!jaMembro) {
    const { error: insertError } = await supabase.from("projeto_membros").insert({
      projeto_id: convite.projeto_id,
      usuario_id: usuario.id,
      papel: convite.papel,
      adicionado_por: convite.convidado_por,
    });

    if (insertError) {
      console.error("Erro ao adicionar membro:", insertError);
      return res.status(500).json({ status: "fail", error: insertError.message });
    }
  }

  await supabase
    .from("projeto_convites")
    .update({ status: STATUS_ACEITO })
    .eq("id", convite.id);

  res.json({ status: "success", projeto_id: convite.projeto_id });
};


