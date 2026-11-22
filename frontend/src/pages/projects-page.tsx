import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow, 
} from "@/components/ui/table";
import { useAuthFetch } from "@/hooks/use-auth-fetch";






export function ProjectsStatusTable() {
  const navigate = useNavigate();
  const authFetch = useAuthFetch();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await authFetch("/projetos/status");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "erro ao carregar");

      setProjects(data);
      setError("");
    } catch (err) {
      console.log("error no load:" , err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <div>Carregando...</div>
  if (error) return <div>{error}</div>


  return (
    <div className="ml-1 mt-5">
      <div className="ml-2 py-1 px-2">
        Visao Geral dos Projetos
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-56">Projeto</TableHead>
              <TableHead>Status das Requisições</TableHead>
              <TableHead className="w-40 text-right">Status geral</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {projects.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum Projeto
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => {
                const requisicoes = project.requests || [];
                const allUp = requisicoes.length > 0 && requisicoes.every(req => req.status === "up");
                const allDown = requisicoes.length > 0 && requisicoes.every(req => req.status === "down");

                let overalLabel = "Instável";
                let overalVariant = "secondary";

                if (requisicoes.length === 0) {
                  overalLabel = "Sem Requisições";
                } else if (allUp) {
                  overalLabel = "Operacional"
                } else if (allDown) {
                  overalLabel = "Fora do ar";
                  overalVariant = "destructive";
                }

                return (
                  <TableRow
                    key={requisicoes.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">
                      {project.nome}
                    </TableCell>

                    <TableCell>
                      <div 
                        className="flex flex-wrap gap-2"
                      >
                        {requisicoes.map((req) => {
                          const variant = req.status === "up" 
                                          ? "default" 
                                          : req.status === "down" 
                                            ? "destructive" 
                                            : "secondary";

                          const color = req.status === "up" ? "bg-green-500 text-white" : ""

                          return (
                            <Badge
                              key={req.id}
                              variant={variant}
                              className={color}
                              title={req.nome}
                            >
                              {req.nome.split(" ").slice(1).join(" ")}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <Badge 
                        variant={overalVariant as any}
                      >
                        {overalLabel}
                      </Badge>
                    </TableCell>

                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

