import axios from "axios";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";



export type CheckOutcome = {
  statusCode: number | null;
  available: boolean;
  responseTimeMs: number | null;
  error: string | null;
};

type CheckInput = {
  url: string;
  method: string;
  headers: Record<string, string>;
  timeoutMs: number;
};


function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^::ffff:/, "");

  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  return (
    ip === "::1" ||
    ip === "::" ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("fe80")
  );
}




async function assertPublicHost(url: string) {
  if (process.env.ALLOW_PRIVATE_HOSTS === "true") return;

  const hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(hostname, { all: true });

  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Private or local addresses are not allowed");
  }
}

export async function performCheck({
  url,
  method,
  headers,
  timeoutMs,
}: CheckInput): Promise<CheckOutcome> {
  try {
    await assertPublicHost(url);

    const startedAt = performance.now();

    const response = await axios({
      url,
      method,
      headers,
      timeout: timeoutMs,
      maxRedirects: 0,
      responseType: "stream",
      validateStatus: () => true,
    });

    const responseTimeMs = Math.round(performance.now() - startedAt);
    response.data.destroy();

    return {
      statusCode: response.status,
      available: response.status >= 200 && response.status < 400,
      responseTimeMs,
      error: null,
    };
  } catch (err) {
    let message = "Request failed";

    if (axios.isAxiosError(err)) {
      message =
        err.code === "ECONNABORTED" || err.code === "ETIMEDOUT"
          ? `Timeout after ${timeoutMs} ms`
          : (err.code ?? err.message);
    } else if (err instanceof Error) {
      message = err.message;
    }

    return {
      statusCode: null,
      available: false,
      responseTimeMs: null,
      error: message.slice(0, 300),
    };
  }
}

