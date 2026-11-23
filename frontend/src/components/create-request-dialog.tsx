import { Fragment, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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




const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

const TIMER_OPTIONS = [
  { value: "600", label: "10 min" },
  { value: "300", label: "5 min" },
  { value: "60", label: "1 min" },
];

const TIMER_LABELS: Record<string, string> = Object.fromEntries(
  TIMER_OPTIONS.map((option) => [option.value, option.label]),
);

export type RequestPayload = {
  metodo: HttpMethod;
  url: string;
  intervalo_segundos: number;
  headers: Record<string, string>;
};


type HeaderRow = {
  id: string;
  key: string;
  value: string;
};



const newHeaderRow = (): HeaderRow => ({
  id: crypto.randomUUID(),
  key: "",
  value: "",
});



type Props = {
  onCreate: (request: RequestPayload) => Promise<void> | void;
}

export function CreateRequestDialog({ onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<HeaderRow[]>([newHeaderRow()]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState("300");

  function handleOpenChange(next: boolean) {
    if (!next) {
      setMethod("GET");
      setUrl("");
      setHeaders([newHeaderRow()]);
      setError("");
    }
    setOpen(next);
  }

  function updateHeader(id: string, field: "key" | "value", text: string) {
    setHeaders((rows) => {
      const updated = rows.map((row) => row.id === id ? { ...row, [field]: text } : row);


    const last = updated[updated.length - 1];
    return last.key || last.value ? [...updated, newHeaderRow()] : updated
    });
  }

  function removeHeader(id: string) {
    setHeaders((rows) => {
      const remaining = rows.filter((row) => row.id !== id);
      const last = remaining[remaining.length - 1];

      return !last || last.key || last.value 
        ? [...remaining, newHeaderRow()]
        : remaining;
    })
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    setCreating(true);
    setError("");

    try {
      const headersObject: Record<string, string> = {};
      for (const row of headers) {
        const key = row.key.trim();

        if (key) headersObject[key] = row.value.trim();

        await onCreate({ 
          metodo: method, 
          url: url.trim(), 
          intervalo_segundos: Number(timer),
          headers: headersObject 
        });
        handleOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Create Request
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Create a request</DialogTitle>
            </DialogHeader>

            <div className="flex gap-2">
              <Select
                value={method}
                onValueChange={(value) => {
                  if (value) setMethod(value as HttpMethod);
                }}
              >
                <SelectTrigger className="w-32" aria-label="Request method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input 
                aria-label="Request URL"
                placeholder="https://example.com/smt"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="request-timer">Timer</Label>
              <Select
                value={timer}
                onValueChange={(value) => {if (value) setTimer(value)}}
              >
                <SelectTrigger id="request-timer" className="w-40">
                  <SelectValue>{TIMER_LABELS[timer]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">Interval between requests</p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                
                <p className="text-sm font-medium">Headers</p>

                <div className="max-h-60 overflow-y-auto rounded-md border p2">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items center gap-2">
                    <span className="px-1 text-xs font-medium text-muted-foreground">Key</span>
                    <span className="px-1 text-xs font-medium text-muted-foreground">Value</span>
                    <span aria-hidden className="size-9" />

                    {headers.map((row, index) => {
                      const isLast = index === headers.length -1;

                      return (
                        <Fragment key={row.id}>
                          <Input 
                            aria-label="Header key"
                            placeholder="Key"
                            value={row.key}
                            onChange={(e) => updateHeader(row.id, "key", e.target.value)}
                          />

                          <Input 
                            aria-label="Header value"
                            placeholder="Value"
                            value={row.value}
                            onChange={(e) => updateHeader(row.id, "value", e.target.value)}
                          />

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove header"
                            className={isLast ? "invisible" : ""}
                            onClick={() => removeHeader(row.id)}
                          >
                            <Trash2 />
                          </Button>
                        </Fragment>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {error &&<p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>

              <Button 
                type="submit"
                disabled={creating}
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}


