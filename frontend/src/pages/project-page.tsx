import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { History as HistoryIcon, Plus, Trash2 } from "lucide-react";
import { RequestDialog } from "@/components/request-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";




const recursosConfig = {
  memoria: {label: "Memória (%)", color: "var(--chart-2)"},
  processamento: {label: "CPU (%)", color: "var(--chart-3)"}
} satisfies ChartConfig;


function formatBucket(iso: string, period: string) {
  const date = new Date(iso);

  return period === "24h"
    ? date.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"})
    : date.toLocaleDateString([], {day: "2-digit", month: "2-digit", hour: "2-digit"});
}




export function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { projects, loading, deleteProject } = useProjects();
  const authFetch = useAuthFetch();


  const [requests, setRequests] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [recursos, setRecursos] = useState(null);
  const [period, setPeriod] = useState("24h");
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [delReq, setDelReq] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [projectDelete, setProjectDelete] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);


  async function loadData() {
    try {
      const resReq = await authFetch(`/projetos/${projectId}/requisicoes`);
      const dataReq = await resReq.json();
      if (resReq.ok) setRequests(dataReq);

      const resMet = await authFetch(`/projetos/${projectId}/metricas?periodo=${period}`);
      const dataMet = await resMet.json();
      if (resMet.ok) setMetrics(dataMet);
    } catch (err) {
      console.log("Erro ao carregar dados:", err);
    }
  }

  async function loadRecursos() {
    try {
      const res = await authFetch(`/projetos/${projectId}/recursos?periodo=${period}`);
      const data = await res.json();

      if (res.ok) setRecursos(data);
    } catch (error) {
      console.log("Erro ao carregar recursos:", error);
    }
  }


  async function onDeleteProject() {
    setIsDeletingProject(true);

    try {
      await deleteProject(projectId);
      navigate("/central");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erro ao deletar projeto");
    } finally {
      setIsDeletingProject(false);
    }
  }


  useEffect(() => {
    loadData();
    loadRecursos();

    const interval = setInterval(async () => {
      const res = await authFetch(`/projetos/${projectId}/metricas?periodo=${period}`);
      const data = await res.json();
      if (res.ok) setMetrics(data);

      loadRecursos();
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId, period]);


  async function onCreate(payload) {
    const res = await authFetch(`/projetos/${projectId}/requisicoes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao criar");
    loadData();
    loadRecursos();
  }

  async function onEdit(req) {
    const res = await authFetch(`/projetos/${projectId}/requisicoes/${req.id}`);
    const data = await res.json();
    if (res.ok) setEditing(data);
  }

  async function onUpdate(payload) {
    const res = await authFetch(`/projetos/${projectId}/requisicoes/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Erro ao atualizar");
    loadData();
  }

  async function toggleActive(req) {
    const next = !req.ativo;

    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, ativo: next } : r));

    const res = await authFetch(`/projetos/${projectId}/requisicoes/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: next }),
    });
    if (!res.ok) loadData();
    loadRecursos();
  }

  async function onDelete() {
    setIsDeleting(true);
    const res = await authFetch(`/projetos/${projectId}/requisicoes/${delReq.id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setDelReq(null);
      loadData();
      loadRecursos();
    } else {
      setError("Erro ao deletar");
    }
    setIsDeleting(false);
  }

  if (loading) return <p>Carregando...</p>;

  const project = projects.find(p => p.id === projectId);
  if (!project) return <p>Projeto não encontrado</p>;

  const canEdit = project.papel === "owner" || project.papel === "editor";

  const recursosData = (recursos?.serie ?? []).map((p) => ({
    label: formatBucket(p.bucket, period),
    memoria: p.memoria,
    processamento: p.processamento
  }));

  return (
    <div className="space-y-4 px-1">
      {error && (
        <div className="p-3 text-sm font-red-600">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{project.nome}</h1>
          <p className="text-muted-foreground text-sm">{project.descricao}</p>
          {project.papel === "owner" &&
            <Button
              variant="destructive"
              className="my-4"
              onClick={() => setProjectDelete(true)}
            >
              excluir projeto
            </Button>}
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Requisição</Button>
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <h2 className="text-lg font-medium">Métricas</h2>
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map(p => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardDescription>Uptime</CardDescription>
            <CardTitle className="text-3xl">{metrics?.resumo?.uptime ?? "—"}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tempo Médio</CardDescription>
            <CardTitle className="text-3xl">{metrics?.resumo?.tempo_medio_ms ?? "—"} ms</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total de Checks</CardDescription>
            <CardTitle className="text-3xl">{metrics?.resumo?.total ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-medium mb-4">
          Recursos{" "}
          <span className="text-xs font-normal">(simulado)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader>
              <CardDescription>Memória média</CardDescription>
              <CardTitle className="text-3xl">
                {
                  recursos?.resumo?.memoria != null
                    ? `${recursos.resumo.memoria}`
                    : "-"
                }
                </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>CPU média</CardDescription>
              <CardTitle className="text-3xl">
                {
                  recursos?.resumo?.processamento != null
                    ? `${recursos.resumo.processamento}`
                    : "-"
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {recursosData.length === 0 ? (
          <p className="text-sm">Nenhuma requisição ativa</p>
        ) : (
          <div className="rouded-lg border p-4">
            <ChartContainer
              config={recursosConfig}
              className="h-56 w-full"
            >
              <LineChart
                data={recursosData}
                margin={{left: 12, right: 12}}
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
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip content={<ChartTooltipContent />}/>
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="memoria"
                  type="monotone"
                  stroke="var(--color-memoria)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="processamento"
                  type="monotone"
                  stroke="var(--color-processamento)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </div>

      <div className="pt-4">
        <h2 className="text-lg font-medium mb-4">Requisições</h2>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Método</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Memória</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map(req => {
                const m = metrics?.requisicoes?.find(met => met.requisicao_id === req.id);
                const rec = recursos?.requisicoes?.find(r => r.requisicao_id === req.id);

                return (
                  <TableRow key={req.id} className={canEdit ? "cursor-pointer" : ""} onClick={() => canEdit && onEdit(req)}>

                    <TableCell className="font-mono">{req.metodo}</TableCell>

                    <TableCell className="max-w-xs truncate">{req.url}</TableCell>

                    <TableCell>
                      {!req.ativo
                        ? <Badge variant="outline">
                          Pausado
                        </Badge>
                        : req.estado === "pending"
                          ? <Badge variant="outline">
                              Pendente
                            </Badge>
                          : req.estado === "up"
                            ? <Badge className="bg-green-500">
                                Up
                              </Badge>
                            : <Badge variant="destructive">
                                Down
                              </Badge>
                      }
                    </TableCell>

                    <TableCell>{m?.uptime ?? "—"}%</TableCell>
                    <TableCell>{rec ? `${rec.memoria}%` : "-"}</TableCell>
                    <TableCell>{rec ? `${rec.processamento}%` : "-"}</TableCell>
                    <TableCell>{req.intervalo_segundos / 60} min</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={req.ativo ? "text-green-600" : ""}
                        onClick={(e) => { e.stopPropagation(); toggleActive(req); }}
                      >
                        {req.ativo ? "Ativo" : "Inativo"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${projectId}/requests/${req.id}/history`); }}>
                        <HistoryIcon className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setDelReq(req); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <RequestDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={null}
        onSubmit={onCreate}
        title="Nova Requisição"
      />

      <RequestDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        initial={editing}
        onSubmit={onUpdate}
        title="Editar Requisição"
      />

      <Dialog open={delReq !== null} onOpenChange={() => setDelReq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar requisição?</DialogTitle>
            <DialogDescription>Isso apagará todo o histórico de verificações.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelReq(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
              {isDeleting ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={projectDelete} onOpenChange={setProjectDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar projeto?</DialogTitle>
            <DialogDescription>
              Isso apagará o projeto "{project.nome}", todas as suas requisições e todo o histórico de verificações. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteProject}
              disabled={isDeletingProject}
            >
              {isDeletingProject ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


