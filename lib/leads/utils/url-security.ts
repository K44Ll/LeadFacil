import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, request } from "undici";
import { normalizeHttpUrl } from "./normalize-url";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.aws.internal",
  "instance-data.ec2.internal",
]);

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part)))
    return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIp(address: string) {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:"))
    return isPrivateIpv4(normalized.slice(7));
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("2001:db8:")
  );
}

async function resolveSafePublicUrl(value: string) {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) throw new Error("URL HTTP/HTTPS inválida.");
  const url = new URL(normalized);
  if (url.username || url.password)
    throw new Error("URL com credenciais não permitida.");
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (
    BLOCKED_HOSTS.has(hostname) ||
    hostname.endsWith(".localhost") ||
    hostname === "169.254.169.254" ||
    hostname === "100.100.100.200"
  )
    throw new Error("Destino de rede não permitido.");
  const literal = hostname.replace(/^\[|\]$/g, "");
  let addresses: Array<{ address: string; family: 4 | 6 }>;
  if (isIP(literal)) {
    if (isPrivateIp(literal))
      throw new Error("Endereço IP privado não permitido.");
    addresses = [{ address: literal, family: isIP(literal) as 4 | 6 }];
  } else {
    addresses = (await lookup(hostname, { all: true, verbatim: true })).map(
      ({ address, family }) => ({ address, family: family as 4 | 6 }),
    );
    if (
      !addresses.length ||
      addresses.some(({ address }) => isPrivateIp(address))
    )
      throw new Error("O domínio resolve para uma rede não permitida.");
  }
  return { url, addresses };
}

export async function assertSafePublicUrl(value: string) {
  return (await resolveSafePublicUrl(value)).url;
}

export interface SafeFetchResult {
  url: string;
  status: number;
  contentType: string;
  body: string;
  bytes: number;
}

export async function safeFetchText(
  value: string,
  options: {
    signal?: AbortSignal;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
  } = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxBytes = options.maxBytes ?? 1_000_000;
  const maxRedirects = options.maxRedirects ?? 3;
  let current = value;
  for (let redirect = 0; redirect <= maxRedirects; redirect++) {
    const resolved = await resolveSafePublicUrl(current);
    current = resolved.url.toString();
    const pinned = resolved.addresses[0];
    const dispatcher = new Agent({
      connect: {
        lookup(_hostname, _options, callback) {
          callback(null, [pinned]);
        },
      },
    });
    const signal = options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(timeoutMs)])
      : AbortSignal.timeout(timeoutMs);
    try {
      const response = await request(current, {
        dispatcher,
        headers: {
          "User-Agent":
            "LeadFacilBot/1.0 (+public contact discovery; respectful crawler)",
          Accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.5",
          ...options.headers,
        },
        signal,
      });
      const header = (name: string) => {
        const value = response.headers[name];
        return Array.isArray(value) ? value[0] : value || "";
      };
      if (response.statusCode >= 300 && response.statusCode < 400) {
        const location = header("location");
        await response.body.dump();
        if (!location || redirect === maxRedirects)
          throw new Error("Limite de redirecionamentos excedido.");
        current = new URL(location, current).toString();
        continue;
      }
      const declared = Number(header("content-length") || 0);
      if (declared > maxBytes) {
        await response.body.dump();
        throw new Error("Resposta excede o tamanho permitido.");
      }
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > maxBytes) {
          response.body.destroy();
          throw new Error("Resposta excede o tamanho permitido.");
        }
        chunks.push(chunk);
      }
      const body = new TextDecoder().decode(Buffer.concat(chunks));
      return {
        url: current,
        status: response.statusCode,
        contentType: header("content-type"),
        body,
        bytes,
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error("Falha ao acessar URL.");
}
