import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthFetch } from "@/hooks/use-auth-fetch";





const PAPEIS = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Leitor" },
];

const labelPapel = (valor) => PAPEIS.find((p) => p.value === valor)?.label ?? valor;



export function InviteDialog({ open, onOpenChange, projectId }) {
  const authFetch = useAuthFetch();

  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState("editor");
  const [convites, setConvites] = useState([]);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [info, setInfo] = useState("");
  const [link, setLink] = useState("");

  async function loadConvites() {
    try {
      const res = await authFetch(`/projetos/${projectId}/convites`);
      const data = await res.json();
      if (res.ok) setConvites(data);
    } catch (err) {
      console.log("Erro ao carregar convites:", err);
    }
  }

  useEffect(() => {
    if (open) {
      setEmail("");
      setPapel("editor");
      setError("");
      setInfo("");
      setLink("");
      loadConvites();
    }
  }, [open, projectId]);


  async function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setError("");
    setInfo("");
    setLink("");

    try {
      const res = await authFetch(`/projetos/${projectId}/convites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, papel }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "Não foi possível criar o convite");

      if (data.email_enviado) {
        setInfo(`Convite enviado para ${data.convite.email}.`);
      } else {
        setInfo("O convite foi criado, mas o e-mail não pôde ser enviado. Envie o link abaixo manualmente.");
        setLink(data.link);
      }

      setEmail("");
      loadConvites();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function cancelar(id) {
    await authFetch(`/projetos/${projectId}/convites/${id}`, { method: "DELETE" });
    loadConvites();
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar pessoas</DialogTitle>
          <DialogDescription>
            A pessoa recebe um link por e-mail e precisa entrar com esse mesmo e-mail.
          </DialogDescription>
        </DialogHeader>

        <form 
          onSubmit={handleSubmit} 
          className="grid gap-3"
        >
          <div 
            className="grid gap-2"
          >
            <Label htmlFor="invite-email">E-mail</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="pessoa@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Papel</Label>
            <Select 
              value={papel} 
              onValueChange={setPapel}
            >
              <SelectTrigger className="w-48">
                <SelectValue>{labelPapel(papel)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem 
                    key={p.value} 
                    value={p.value}
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && 
            <p 
              className="text-sm text-destructive"
            >
              {error}
            </p>
          }
          {info && 
            <p 
              className="text-sm"
            >
              {info}
            </p>
          }

          {link && (
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={link} 
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(link)}
              >
                Copiar
              </Button>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={sending}
          >
            {sending ? "Enviando..." : "Enviar convite"}
          </Button>
        </form>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Convites pendentes</p>

          {convites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
          ) : (
            convites.map((c) => (
              <div 
                key={c.id} 
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate">{c.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {labelPapel(c.papel)} · expira em {new Date(c.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancelar convite"
                  onClick={() => cancelar(c.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}