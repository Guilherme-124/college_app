import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProjects } from "@/context/project-context";
import { useAuthFetch } from "@/hooks/use-auth-fetch";






const chartConfig = {
  tempo: {label: "Tempo de resposta (ms)", color: "var(--chart-1)"}
};


function formatBucket(iso, period) {
  const date = new Date(iso);

  return period === "24h"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit" });
}



export function RequestHistoryPage() {
  const { projectId, requestId } = useParams();
  const navigate = useNavigate();
  const { projects } = useProjects();
  const authFetch = useAuthFetch();

  const [period, setPeriod] = useState("24h");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [history, setHistory] = useState(null);
  const [serie, setSerie] = useState([]);
  const [error, setError] = useState("");

  const project = projects.find((p) => p.id === projectId);


  async function loadData() {
    try {
      const urlHist = `/projetos/${projectId}/requisicoes/${requestId}/historico?periodo=${period}&estado=${statusFilter}&pagina=${page}`;

      const resHist = await authFetch(urlHist);
      const dataHist = await resHist.json();

      if (resHist.ok) {
        setHistory(dataHist);
        setError("");
      } else {
        setError(dataHist.error || "Erro ao carregar histórico");
      }

      const resMet = await authFetch(`/projetos/${projectId}/requisicoes/${requestId }/metricas?periodo=${period}`);
      const dataMet = await resMet.json();

      if (resMet.ok) setSerie(dataMet.serie || []);
    } catch (error) {
      console.log("Erro no load:", error);
      setError("Algo deu errado no servidor");
    }
  }



  useEffect(() => {
    loadData();

    const interval = setInterval(loadData, 30000);

    return () => clearInterval(interval);
  }, [period, statusFilter, page]);


  const chartData = serie.map((p) => ({
    label: formatBucket(p.bucket, period),
    tempo: p.tempo_medio_ms
  }));


  const totalPages = history ? Math.ceil(history.total / history.por_pagina) : 1;


  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        <ArrowLeft />
        Voltar para {project?.nome ?? "projeto"}
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Historico</h1>

        {history && (
          <>
            <p className="truncate font-mono text-sm">
              {history.requisicao.metodo} {history.requisicao.url}
            </p>
            <p className="text-sm text-muted-foreground">
              A cada {history.requisicao.intervalo_segundos / 60} min ·{" "}
              {history.requisicao.ativo ? "Ativo" : "Inativo"}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {["24h", "7d", "30d"].map((option) => (
            <Button
              key={option}
              size="sm"
              variant={period === option ? "default" : "outline"}
              onClick={() => {setPeriod(option); setPage(1)}}
            >
              {option}
            </Button>
          ))}
        </div>

        <div className="flex gap-1">
          {["all", "up", "down"].map((option) => (
            <Button
              key={option}
              size="sm"
              variant={statusFilter === option ? "default" : "outline"}
              onClick={() => {setStatusFilter(option); setPage(1)}}
            >
              {option === "up" ? "Up" : option === "down" ? "Down" : "Todos"}
            </Button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div>
        <p className="mb-2 text-sm font-medium">Tempo de Resposta</p>

        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem dados neste período
          </p>
        ) : (
          <ChartContainer 
            config={chartConfig} 
            className="h-56 w-full"
          >
            <LineChart 
              data={chartData} 
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid 
                vertical={false} 
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={60}
                tickFormatter={(value) => `${value} ms`}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />} 
              />
              <Line
                dataKey="tempo"
                type="monotone"
                stroke="var(--color-tempo)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Verificações</p>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24">Codigo</TableHead>
                <TableHead className="w-28">Resposta</TableHead>
                <TableHead>Erro</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {history?.verificacoes?.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma verificação encontrada.
                  </TableCell>
                </TableRow>
              )}

              {history?.verificacoes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {new Date(row.data_verificacao).toLocaleString()}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant={row.disponibilidade ? "secondary" : "destructive"}
                      className={row.disponibilidade ? "text-green-600" : ""}
                    >
                      {row.disponibilidade ? "Up" : "Down"}
                    </Badge>
                  </TableCell>

                  <TableCell>{row.status_code ?? "—"}</TableCell>

                  <TableCell>
                    {row.tempo_resposta_ms === null
                      ? "—"
                      : `${row.tempo_resposta_ms} ms`}
                  </TableCell>

                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {row.erro ?? ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {history && (
          <div className="flex items-center justify-between pt-3">
            <p className="text-sm text-muted-foreground">
              {history.total} verificações - Pagina {page} de {totalPages}
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}