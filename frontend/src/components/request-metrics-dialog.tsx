import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAuthFetch } from "@/hooks/use-auth-fetch";




export type MetricsPeriod = "24h" | "7d" | "30d";

type SeriePoint = {
  bucket: string;
  total: number;
  disponiveis: number;
  tempo_medio_ms: number | null;
};

type HistoryRow = {
  id: number;
  status_code: number | null;
  disponibilidade: boolean;
  tempo_resposta_ms: number | null;
  erro: string | null;
  data_verificacao: string;
};

type MetricsDetails = {
  serie: SeriePoint[];
  historico: HistoryRow[];
};

type MetricsRequest = { id: string; metodo: string; url: string };



const chartConfig = {
  tempo: { label: "Response time (ms)", color: "var(--chart-1)" },
} satisfies ChartConfig;


function FormatBucket(iso: string, period: MetricsPeriod) {
  const date = new Date(iso);

  return period === "24h"
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString([], { day: "2-digit", month: "2-digit", hour: "2-digit" });
}




type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  request: MetricsRequest | null;
  period: MetricsPeriod;
};


export function RequestMetricsDialog({
  open,
  onOpenChange,
  projectId,
  request,
  period,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        {request && (
          <MetricsContent projectId={projectId} request={request} period={period} />
        )}
      </DialogContent>
    </Dialog>
  );
}



function MetricsContent({
  projectId,
  request,
  period,
}: {
  projectId: string;
  request: MetricsRequest;
  period: MetricsPeriod;
}) {
  const authFetch = useAuthFetch();
  const [data, setData] = useState<MetricsDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await authFetch(
          `/projetos/${projectId}/requisicoes/${request.id}/metricas?periodo=${period}`,
        );
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error || "Failed to load metrics");
        }

        if (!cancelled) setData(body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authFetch, projectId, request.id, period]);

  const chartData = (data?.serie ?? []).map((point) => ({
    label: FormatBucket(point.bucket, period),
    tempo: point.tempo_medio_ms,
  }));

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Request metrics</DialogTitle>
        <DialogDescription className="truncate font-mono">
          {request.metodo} {request.url}
        </DialogDescription>
      </DialogHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!data && !error && <p className="text-sm text-muted-foreground">Loading...</p>}

      {data && (
        <>
          <div>
            <p className="mb-2 text-sm font-medium">Response time</p>

            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No checks in this period yet.
              </p>
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
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
                  <ChartTooltip content={<ChartTooltipContent />} />
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
            <p className="mb-2 text-sm font-medium">Last checks</p>

            <div className="max-h-64 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {data.historico.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground"
                      >
                        No checks yet. The first one runs within a minute.
                      </TableCell>
                    </TableRow>
                  )}

                  {data.historico.map((row) => (
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
                      <TableCell className="max-w-48 truncate text-muted-foreground">
                        {row.erro ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

