import type { Request, Response } from "express";
import { supabase } from "../libs/db.js";
import { isUuid } from "../middleware/require-project-role.js";



const STEP_MS: Record<PeriodKey, number> = {
  "24h": 15 * 60 * 1000,
  "7d": 60 * 60 * 1000,
  "30d": 6 * 60 * 60 * 1000,
};



const clamp = (n: number, min: number, max: number) =>
  Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}



function seededRandom(seed: number) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}



function simularUso(requisicaoId: string, timestampMs: number) {
  const base = hashString(requisicaoId);
  const fase = (base % 1000) / 100;
  const slot = Math.floor(timestampMs / 60_000);

  const ruidoMem = seededRandom(base ^ slot) - 0.5;
  const ruidoCpu = seededRandom((base + 1) ^ slot) - 0.5;

  return {
    memoria: clamp(45 + 15 * Math.sin(timestampMs / 3_600_000 + fase) + ruidoMem * 10, 5, 95),
    processamento: clamp(30 + 25 * Math.sin(timestampMs / 1_800_000 + fase) + ruidoCpu * 20, 1, 99),
  };
}




const PERIODS = {
  "24h": { ms: 24 * 60 * 60 * 1000, bucket: "15 minutes" },
  "7d": { ms: 7 * 24 * 60 * 60 * 1000, bucket: "1 hour" },
  "30d": { ms: 30 * 24 * 60 * 60 * 1000, bucket: "6 hours" },
} as const;

type PeriodKey = keyof typeof PERIODS;



function isPeriodKey(value: unknown): value is PeriodKey {
  return typeof value === "string" && Object.hasOwn(PERIODS, value);
}


function parsePeriod(value: unknown): PeriodKey {
  return isPeriodKey(value) ? value : "24h";
}


const roundDec = (n: number) => Math.round(n * 10) / 10;
const HISTORY_PAGE_SIZE = 25;



interface MetricRow {
  requisicao_id: string;
  total: number | string;
  disponiveis: number | string;
  tempo_medio_ms: number | string | null;
  ultima_verificacao: string | null;
  ultimo_status_code: number | null;
  ultima_disponibilidade: boolean | null;
}

interface SerieRow {
  bucket: string;
  total: number | string;
  disponiveis: number | string;
  tempo_medio_ms: number | string | null;
}




export const getProjetoMetricas = async (
  req: Request<{ projectId: string }>,
  res: Response,
) => {
  const period = PERIODS[parsePeriod(req.query.periodo)];
  const dataInicio = new Date(Date.now() - period.ms).toISOString();

  const { data, error } = await supabase.rpc("metricas_projeto", {
    p_projeto: req.params.projectId,
    p_datainicio: dataInicio,
  });

  if (error) {
    console.error("erro ao carregar metricas_projeto:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  const requisicoes = ((data ?? []) as unknown as MetricRow[]).map((r) => {
    const total = Number(r.total);
    const disponiveis = Number(r.disponiveis);

    return {
      requisicao_id: r.requisicao_id,
      total,
      disponiveis,
      uptime: total > 0 ? roundDec((disponiveis / total) * 100) : null,
      tempo_medio_ms: r.tempo_medio_ms === null ? null : Number(r.tempo_medio_ms),
      ultima_verificacao: r.ultima_verificacao,
      ultimo_status_code: r.ultimo_status_code,
      ultima_disponibilidade: r.ultima_disponibilidade,
    };
  });


  let total = 0;
  let disponiveis = 0;
  let somaTempo = 0;
  let countTempo = 0;

  requisicoes.forEach(r => {
    total += r.total;
    disponiveis += r.disponiveis;
    if (r.tempo_medio_ms && r.disponiveis > 0) {
      somaTempo += r.tempo_medio_ms * r.disponiveis;
      countTempo += r.disponiveis;
    }
  });

  const tempoMedio = countTempo > 0 ? Math.round(somaTempo / countTempo) : null;

  res.json({
    resumo: {
      total,
      uptime: total > 0 ? roundDec((disponiveis / total) * 100) : null,
      tempo_medio_ms: tempoMedio,
    },
    requisicoes,
  });
};




export const getRequisicaoMetricas = async (
  req: Request<{ projectId: string; requestId: string }>,
  res: Response,
) => {
  const { projectId, requestId } = req.params;

  if (!isUuid(requestId)) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const { data: owned, error: ownedError } = await supabase
    .from("requisicoes")
    .select("id, urls!inner(projeto_id)")
    .eq("id", requestId)
    .eq("urls.projeto_id", projectId)
    .maybeSingle();

  if (ownedError) {
    console.error("find requisicao error:", ownedError);
    return res.status(500).json({ status: "fail", error: ownedError.message });
  }

  if (!owned) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const period = PERIODS[parsePeriod(req.query.periodo)];
  const dataInicio = new Date(Date.now() - period.ms).toISOString();

  const [serieResult, historicoResult] = await Promise.all([
    supabase.rpc("metricas_serie", {
      p_requisicao: requestId,
      p_datainicio: dataInicio,
      p_bucket: period.bucket,
    }),
    supabase
      .from("verificacoes")
      .select("id, status_code, disponibilidade, tempo_resposta_ms, erro, data_verificacao")
      .eq("requisicao_id", requestId)
      .order("data_verificacao", { ascending: false })
      .limit(20),
  ]);

  if (serieResult.error || historicoResult.error) {
    const err = serieResult.error || historicoResult.error;
    console.error("Erro nos detalhes de métricas:", err);
    return res.status(500).json({ status: "fail", error: err?.message });
  }

  const serie = ((serieResult.data ?? []) as unknown as SerieRow[]).map((p) => ({
    bucket: p.bucket,
    total: Number(p.total),
    disponiveis: Number(p.disponiveis),
    tempo_medio_ms: p.tempo_medio_ms === null ? null : Number(p.tempo_medio_ms),
  }));

  res.json({ serie, historico: historicoResult.data ?? [] });
};




export const getRequisicaoHistorico = async (
  req: Request<{ projectId: string; requestId: string }>,
  res: Response,
) => {
  const { projectId, requestId } = req.params;

  if (!isUuid(requestId)) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const { data: owned, error: ownedError } = await supabase
    .from("requisicoes")
    .select("id, metodo, intervalo_segundos, ativo, urls!inner(projeto_id, url)")
    .eq("id", requestId)
    .eq("urls.projeto_id", projectId)
    .maybeSingle();

  if (ownedError) {
    console.error("find requisicao error:", ownedError);
    return res.status(500).json({ status: "fail", error: ownedError.message });
  }

  const requisicao = owned as any;

  if (!requisicao) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const dataInicio = new Date(
    Date.now() - PERIODS[parsePeriod(req.query.periodo)].ms,
  ).toISOString();

  const estado = req.query.estado;
  const pagina = Math.min(
    Math.max(1, Number(req.query.pagina) || 1),
    10000,
  );
  const from = (pagina - 1) * HISTORY_PAGE_SIZE;

  let query = supabase
    .from("verificacoes")
    .select(
      "id, status_code, disponibilidade, tempo_resposta_ms, erro, data_verificacao",
      { count: "exact" },
    )
    .eq("requisicao_id", requestId)
    .gte("data_verificacao", dataInicio);

  if (estado === "up") query = query.eq("disponibilidade", true);
  if (estado === "down") query = query.eq("disponibilidade", false);

  const { data, count, error } = await query
    .order("data_verificacao", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + HISTORY_PAGE_SIZE - 1);

  if (error) {
    console.error("Erro ao pegar historico:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  res.json({
    requisicao: {
      id: requisicao.id,
      metodo: requisicao.metodo,
      url: requisicao.urls.url,
      intervalo_segundos: requisicao.intervalo_segundos,
      ativo: requisicao.ativo,
    },
    total: count ?? 0,
    pagina,
    por_pagina: HISTORY_PAGE_SIZE,
    verificacoes: data ?? [],
  });
};





export const getRequisicaoRecursos = async (
  req: Request<{ projectId: string; requestId: string }>,
  res: Response,
) => {
  const { projectId, requestId } = req.params;

  if (!isUuid(requestId)) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const { data: owned, error: ownedError } = await supabase
    .from("requisicoes")
    .select("id, urls!inner(projeto_id)")
    .eq("id", requestId)
    .eq("urls.projeto_id", projectId)
    .maybeSingle();

  if (ownedError) {
    console.error("find requisicao error:", ownedError);
    return res.status(500).json({ status: "fail", error: ownedError.message });
  }

  if (!owned) {
    return res.status(404).json({ status: "fail", error: "Request not found" });
  }

  const key = parsePeriod(req.query.periodo);
  const step = STEP_MS[key];
  const fim = Math.floor(Date.now() / step) * step;
  const inicio = fim - PERIODS[key].ms;

  const serie = [];
  for (let t = inicio; t <= fim; t += step) {
    serie.push({ bucket: new Date(t).toISOString(), ...simularUso(requestId, t) });
  }

  res.json({ simulado: true, serie });
};




export const getProjetoRecursos = async (
  req: Request<{ projectId: string }>,
  res: Response,
) => {
  const { data, error } = await supabase
    .from("requisicoes")
    .select("id, urls!inner(projeto_id)")
    .eq("urls.projeto_id", req.params.projectId)
    .eq("ativo", true);

  if (error) {
    console.error("erro ao carregar requisicoes do projeto:", error);
    return res.status(500).json({ status: "fail", error: error.message });
  }

  const ids = (data ?? []).map((r) => r.id as string);

  if (ids.length === 0) {
    return res.json({
      simulado: true,
      resumo: { memoria: null, processamento: null },
      requisicoes: [],
      serie: [],
    });
  }

  const media = (valores: number[]) =>
    Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 100) / 100;

  const key = parsePeriod(req.query.periodo);
  const step = STEP_MS[key];
  const fim = Math.floor(Date.now() / step) * step;
  const inicio = fim - PERIODS[key].ms;


  const serie = [];
  for (let t = inicio; t <= fim; t += step) {
    const usos = ids.map((id) => simularUso(id, t));

    serie.push({
      bucket: new Date(t).toISOString(),
      memoria: media(usos.map((u) => u.memoria)),
      processamento: media(usos.map((u) => u.processamento)),
    });
  }


  const requisicoes = ids.map((id) => ({
    requisicao_id: id,
    ...simularUso(id, fim),
  }));

  res.json({
    simulado: true,
    resumo: {
      memoria: media(requisicoes.map((r) => r.memoria)),
      processamento: media(requisicoes.map((r) => r.processamento)),
    },
    requisicoes,
    serie,
  });
};

