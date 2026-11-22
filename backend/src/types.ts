import type { Method } from "axios";

export interface RequestOptions {
  method?: Method;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

export interface System {
  id: number;
  url: string;
  lastChecked: string;
  statusCode: number;
  status: "up" | "down";
  method: Method;
  headers: Record<string, string>;
  body: unknown;
}

