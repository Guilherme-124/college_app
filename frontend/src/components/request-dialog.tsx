import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue  
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Textarea } from "./ui/textarea";




const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"];

const TIMER_OPTIONS = [
  { value: "600", label: "10 min"},
  { value: "300", label: "5 min"},
  { value: "60", label: "1 min"},
];

const BODY_MAX = 4000;


function jsonStatus(text) {
  if (!text.trim()) return "";

  try {
    JSON.parse(text);
    return "JSON válido";
  } catch {
    return "JSON inválido";
  }
}


export function RequestDialog({ open, onOpenChange, title, initial, onSubmit }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <RequestForm
          title={title}
          initial={initial}
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}




function RequestForm({ title, initial, onSubmit, onClose }) {
  const [method, setMethod] = useState(initial?.metodo || "GET");
  const [url, setUrl] = useState(initial?.url || "");

  const [timer, setTimer] = useState(String(initial?.intervalo_segundos || 300));
  const [goodMs, setGoodMs] = useState(String(initial?.meta_bom_ms || 300));
  const [acceptableMs, setAcceptableMs] = useState(String(initial?.meta_aceitavel_ms || 700));

  const [jitter, setJitter] = useState(initial?.jitter ?? true);

  const [bodyString, setBodyString] = useState(initial?.body ?? "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  const [headers, setHeaders] = useState(() => {
    if (!initial?.headers) return [{ key: "", value: "" }];

    const hdrs = Object.entries(initial.headers).map(([key, value]) => ({
      key,
      value: String(value),
    }));

    return [...hdrs, { key: "", value: "" }];
  });

  const disableBody = ["GET", "HEAD"].includes(method);


  function updateHeader(index, field, value) {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;

    const last = newHeaders[newHeaders.length - 1];

    if (last.key !== "" || last.value !== "") {
      newHeaders.push({ key: "", value: "" });
    }

    setHeaders(newHeaders);
  }

  function removeHeader(index) {
    const newHeaders = headers.filter((_, i) => i !== index);

    if (newHeaders.length === 0) {
      setHeaders([{ key: "", value: "" }]);
    } else {
      setHeaders(newHeaders);
    }
  }


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    
    const good = Number(goodMs);
    const acceptable = Number(acceptableMs);

    if (acceptable <= good) {
      setError("O tempo aceitável deve ser maior que o bom");
      return;
    }

    setSaving(true);
    try {
      const headersObj = {};
      headers.forEach(header => {
        if (header.key) headersObj[header.key] = String(header.value);
      });


      await onSubmit({
        metodo: method,
        url: url.trim(),
        body: disableBody ? "" : bodyString,
        intervalo_segundos: Number(timer),
        meta_bom_ms: good,
        meta_aceitavel_ms: acceptable,
        jitter,
        headers: headersObj
      });

      onClose();
    } catch (error) {
      setError("Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }



  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <div className="flex gap-2">
        <Select 
          value={method} 
          onValueChange={setMethod}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input 
          placeholder="https://url.com"
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger
            value="geral"
          >
            Geral
          </TabsTrigger>
          <TabsTrigger
            value="body"
          >
            Body
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="geral"
          className="mt-4 grid min-h-64 content-start gap-4"
        >
          <div className="grid gap-2">
            <Label>Intervalo</Label>
            <Select value={timer} onValueChange={setTimer}>
              <SelectTrigger className="w-48">
                <SelectValue>
                  {TIMER_OPTIONS.find(timOpt => timOpt.value === timer)?.label || "Selecione"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TIMER_OPTIONS.map(timOpt => <SelectItem key={timOpt.value} value={timOpt.value}>{timOpt.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Jitter</Label>
              <p className="text-sm text-muted-foreground">Espalha a execução aleatóriamente em até 20s</p>
            </div>
            <Switch 
              id="request-jitter"
              checked={jitter}
              onCheckedChange={(checked) => setJitter(checked)}
            />
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Metas de tempo (ms)</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-1">
                <Label className="text-ms">Bom até</Label>
                <Input type="number" value={goodMs} onChange={e => setGoodMs(e.target.value)} required/>
              </div>
              <div className=" grid gap-1">
                <Label className="text-ms">Aceitável até</Label>
                <Input type="number" value={acceptableMs} onChange={e => setAcceptableMs(e.target.value)} required/>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium"><Label className="text-xs">Headers</Label></p>
            <div>
              {headers.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input 
                    placeholder="Key"
                    value={String(row.key)}
                    onChange={e => updateHeader(i, "key", e.target.value)}
                  />
                  <Input 
                    placeholder="Value"
                    value={String(row.value)}
                    onChange={e => updateHeader(i, "value", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHeader(i)}
                  >
                    <Trash2 className="h-4 w-4"/>
                  </Button>
                </div>
              ))}
            </div>
          </div>          
        </TabsContent>
        <TabsContent
          value="body"
          className="mt-4 grid min-h-64 content-start gap-2"
        >
          {disableBody ? (
            <p>Requisição atual não envia body</p>
          ) : (
            <>
              <Label htmlFor="request-body">Body</Label>
              <Textarea 
                id="request-body"
                className="min-h-40 text-sm"
                placeholder='{"chave": "valor"}'
                value={bodyString}
                maxLength={BODY_MAX}
                onChange={(e) => setBodyString(e.target.value)}
              />         
              
              <div>
                <span>{jsonStatus(bodyString)}</span>
                <span>{bodyString.length} de {BODY_MAX} characteres</span>
              </div>
            </>

          )}
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button
          type="button" variant="outline" onClick={onClose}
        >
          Cancelar
        </Button>
        
        <Button
          type="submit" disabled={saving}
        >
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
}



