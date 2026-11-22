import type { Request, Response } from "express";
import { supabase } from "../libs/db.js";
import { isUuid } from "../middleware/require-project-role.js";
import { formatURL } from "../utils/format-url.js";



export const createRequisicao = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const body = req.body;

  const jitter = typeof body.jitter === "boolean" ? body.jitter : true;

  const metodo = body.metodo?.toUpperCase();
  if (!metodo || !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(metodo)) {
    return res.status(400).json({ status: "fail", error: "metodo invalido" });
  }

  const rawUrl = body.url?.trim();
  if (!rawUrl) return res.status(400).json({ status: "fail", error: "URL é obrigatoria" });

  const url = formatURL(rawUrl);
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ status: "fail", error: "URL invalida" });
  }

  const intervalo = body.intervalo_segundos;
  if (![60, 300, 600].includes(intervalo)) {
    return res.status(400).json({ status: "fail", error: "intervalo nao suportado" });
  }

  const headers = body.headers || {};
  if (Object.keys(headers).length > 20) {
    return res.status(400).json({ status: "fail", error: "muitos headers, maximo 20" });
  }

  const metaBom = body.meta_bom_ms || 300;
  const metaAceitavel = body.meta_aceitavel_ms || 700;

  if (metaBom < 1 || metaAceitavel <= metaBom) {
    return res.status(400).json({ status: "fail", error: "metas de tempo invalidas" });
  }

  const usuarioId = res.locals.usuario.id;

  const { data: found } = await supabase
    .from("urls")
    .select("id")
    .eq("projeto_id", projectId)
    .eq("url", url)
    .limit(1);

  let urlId = found?.[0]?.id;

  if (!urlId) {
    const { data: newUrl, error: urlErr } = await supabase
      .from("urls")
      .insert({ projeto_id: projectId, url, created_by: usuarioId })
      .select("id")
      .single();

    if (urlErr) return res.status(500).json({ error: urlErr.message });
    urlId = newUrl.id;
  }

  const nome = `${metodo} ${url}`.slice(0, 100);

  const { data: requisicao, error: reqErr } = await supabase
    .from("requisicoes")
    .insert({
      url_id: urlId,
      nome,
      metodo,
      headers,
      intervalo_segundos: intervalo,
      meta_bom_ms: metaBom,
      meta_aceitavel_ms: metaAceitavel,
      jitter,
      created_by: usuarioId,
    })
    .select("id, nome, metodo, intervalo_segundos, ativo, jitter, created_at")
    .single();

  if (reqErr) {
    console.error("erro ao criar requisicao:", reqErr);
    return res.status(500).json({ status: "fail", error: reqErr.message });
  }

  res.status(201).json({ status: "success", requisicao: { ...requisicao, url } });
};





export const editRequisicao = async (req: Request, res: Response) => {
  const { projectId, requestId } = req.params as { projectId: string; requestId: string };
  const body = req.body;


  if (!isUuid(requestId)) {
    return res.status(404).json({ status: "fail", error: "Request nao encontrado" });
  }

  const { data: found } = await supabase
    .from("requisicoes")
    .select("id, url_id, urls!inner(projeto_id)")
    .eq("id", requestId)
    .eq("urls.projeto_id", projectId)
    .maybeSingle();

  if (!found) return res.status(404).json({ status: "fail", error: "Request nao encontrado"});

  
  if (body.metodo) {
    const m = body.metodo.toUpperCase();
    
    if(!["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].includes(m)) {
      return res.status(400).json({ status: "fail", error: "metodo invalido" });
    }
  }

  if (body.url) {
    const url = formatURL(body.url.trim());
    
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ status: "fail", error: "url invalido" });
    }
  }

  if (body.intervalo_segundos && ![60, 300, 600].includes(body.intervalo_segundos)) {
    return res.status(400).json({ status: "fail", error: "intervalo nao suportado" });
  }

  const { data: updated, error: updateErr } = await supabase
    .from("requisicoes")
    .update({
      nome: body.nome || undefined,
      metodo: body. metodo?.toUpperCase() || undefined,
      headers: body.headers || undefined,
      intervalo_segundos: body.intervalo_segundos || undefined,
      meta_bom_ms: body.meta_bom_ms || undefined,
      meta_aceitavel_ms: body.meta_aceitavel_ms || undefined,
      ativo: typeof body.ativo === "boolean" ? body.ativo : undefined,
      jitter: typeof body.jitter === "boolean" ? body.jitter : undefined,
    })
    .eq("id", requestId)
    .select("id, nome, metodo, intervalo_segundos, ativo, jitter, created_at")
    .single();

  if (updateErr) return res.status(500).json({ status: "fail", error: updateErr.message });

  res.json({ status: "success", requisicao: updated });
}




export const deleteRequisicao = async (req: Request, res: Response) => {
  const { projectId, requestId } = req.params as { projectId: string; requestId: string };

  if(!isUuid(requestId)) {
    return res.status(404).json({ status: "fail", error: "Request nao encontrado" });
  }

  const { data: found } = await supabase
    .from("requisicoes")
    .select("id, url_id, urls!inner(projeto_id)")
    .eq("id", requestId)
    .eq("urls.projeto_id", projectId)
    .maybeSingle();

  if (!found) return res.status(404).json({ status: "fail", error: "Request nao encontrado" });

  const { error: delErr } = await supabase
    .from("requisicoes")
    .delete()
    .eq("id", requestId);

  if (delErr) return res.status(500).json({ error: delErr.message });

  const { count } = await supabase
    .from("requisicoes")
    .select("id", { count: "exact", head: true })
    .eq("url_id", found.url_id);

  if (count === 0) {
    await supabase.from("urls").delete().eq("id", found.url_id);
  }

  res.json({ status: "success" });
}





export const listRequisicoes = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  const { data, error } = await supabase
    .from("requisicoes")
    .select("id, nome, metodo, intervalo_segundos, ativo, created_at, estado, urls!inner(url, projeto_id)")
    .eq("urls.projeto_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("erro ao listar requisicoes:", error);
    return res.status(500).json({ status: "fail", error: error.message }); 
  }

  res.json((data ?? []).map(({ urls, ...r }: any) => ({ ...r, url: urls.url })));
};





export const getRequisicao = async (req: Request, res: Response) => {
  const { projectId, requestId } = req.params as { projectId: string, requestId: string};

  if (!isUuid(requestId)) {
    return res.status(404).json({ error: "Requisicao nao encontrada" });
  }

  try {
    const { data, error } = await supabase
      .from("requisicoes")
      .select("*, urls!inner(url, projeto_id)")
      .eq("urls.projeto_id", projectId)
      .eq("id", requestId)
      .maybeSingle();

    if (error || !data) {
      return res.status(404).json({ error: "Requisicao nao encontrada no projeto" });
    }

    const { urls, ...rest } = data as any;
    return res.json({ ...rest, url: urls.url });

  } catch (err) {
    return res.status(500).json({ error: "Erro ao buscar requisicao" });
  }
};

