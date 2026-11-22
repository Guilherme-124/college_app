import nodeCron from "node-cron";
import { supabase } from "./db.js";
import { performCheck } from "../utils/perform-checks.js";



const FALHAS_DOWN = 3;
const SUCESSOS_UP = 2;

const JITTER_MAX_MS = 20_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


export function startScheduler() {
  nodeCron.schedule("* * * * *", async () => {
    try {
      console.log("rodando checks do minuto...");

      const tick = new Date(Math.round(Date.now() / 60_000) * 60_000);

      const { data: requests, error } = await supabase
        .from("requisicoes")
        .select("id, metodo, headers, intervalo_segundos, timeout_ms, estado, jitter, urls(url)")
        .eq("ativo", true)
        .or(`proxima_execucao.is.null,proxima_execucao.lte.${tick.toISOString()}`);

      if (error) {
        console.log("erro ao carregar requests:", error);
        return;
      }

      if (!requests) return;

      for (const req of requests) {
        try {
          const url = (req.urls as any)?.url;
          if (!url) continue;

          if (req.jitter) await sleep(Math.floor(Math.random() * JITTER_MAX_MS));

          const outcome = await performCheck({
            url: url,
            method: req.metodo,
            headers: req.headers || {},
            timeoutMs: req.timeout_ms ?? 10000,
          });
          

          await supabase
            .from("verificacoes")
            .insert({
              requisicao_id: req.id,
              status_code: outcome.statusCode,
              disponibilidade: outcome.available,
              tempo_resposta_ms: outcome.responseTimeMs,
              erro: outcome.error,
            });

          let novoEstado = req.estado;

          const { data: ultimos } = await supabase
            .from("verificacoes")
            .select("disponibilidade")
            .eq("requisicao_id", req.id)
            .order("data_verificacao", { ascending: false })
            .limit(FALHAS_DOWN);

            if (ultimos && ultimos.length > 0) {
              let falhas = 0;
              for (const v of ultimos) {
                if (!v.disponibilidade) falhas++;
              }
              if (falhas >= FALHAS_DOWN) {
                novoEstado = "down";
              }
              else {
                let sucessos = 0;
                for (let i = 0; i < Math.min(ultimos.length, SUCESSOS_UP); i++) {
                  novoEstado = "up";
                }
              }
            }

          await supabase
            .from("requisicoes")
            .update({
              estado: novoEstado,
              ultima_execucao: new Date().toISOString(),
              proxima_execucao: new Date(tick.getTime() + req.intervalo_segundos * 1000).toISOString()
            })
            .eq("id", req.id);
          
        } catch (err) {
          console.log(`falha na req ${req.id}:`, err);
        }        
      };

      console.log(`scheduler: ${requests.length} checks processados`);
    } catch (error) {
      console.log("erro no scheduler:", error);
    }
  });

  console.log("scheduler ativo");
}
