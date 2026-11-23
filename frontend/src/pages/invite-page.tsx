import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { useProjects } from "@/context/project-context";





const PAPEIS = { editor: "Editor", viewer: "Leitor" };


export function AcceptInvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const authFetch = useAuthFetch();
  const { reloadProjects } = useProjects();

  const [convite, setConvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepting, setAccepting] = useState(false);



  useEffect(() => {
    async function load() {
      try {
        const res = await authFetch(`/convites/${token}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data.error || "Convite não encontrado");

        setConvite(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);


  async function aceitar() {
    setAccepting(true);
    setError("");

    try {
      const res = await authFetch(`/convites/${token}/aceitar`, { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Não foi possível aceitar o convite");

      await reloadProjects();
      navigate(`/projects/${data.projeto_id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  }


  if (loading) return <p className="p-4">Carregando convite...</p>;

  return (
    <div className="mx-auto mt-10 max-w-md px-2">
      <Card>
        <CardHeader>
          {convite ? (
            <>
              <CardTitle>Convite para o projeto {convite.projeto_nome}</CardTitle>
              <CardDescription>
                {convite.convidado_por
                  ? `${convite.convidado_por} convidou você`
                  : "Você foi convidado"}{" "}
                como {PAPEIS[convite.papel] ?? convite.papel}.
              </CardDescription>
            </>
          ) : (
            <CardTitle>Convite indisponível</CardTitle>
          )}
        </CardHeader>

        <div className="grid gap-3 px-6 pb-6">
          {error && 
            <p className="text-sm text-destructive">{error}</p>
          }

          {convite?.status === "usado" && (
            <p className="text-sm text-muted-foreground">Este convite já foi utilizado.</p>
          )}
          {convite?.status === "expirado" && (
            <p className="text-sm text-muted-foreground">Este convite expirou. Peça um novo ao líder do projeto.</p>
          )}
          {convite?.status === "ok" && !convite.email_confere && (
            <p className="text-sm text-destructive">
              Este convite foi enviado para {convite.email}. Saia e entre com essa conta.
            </p>
          )}

          {convite?.status === "ok" && convite.email_confere && (
            <Button onClick={aceitar} disabled={accepting}>
              {accepting ? "Entrando..." : "Aceitar convite"}
            </Button>
          )}

          <Button variant="outline" onClick={() => navigate("/central")}>
            Ir para a Central
          </Button>
        </div>
      </Card>
    </div>
  );
}