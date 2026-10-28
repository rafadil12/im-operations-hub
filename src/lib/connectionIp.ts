import { IncomingMessage, Server } from "node:http";

/** Set from the TCP socket. Client-supplied values are overwritten. */
export const CONNECTION_IP_HEADER = "x-im-connection-ip";

type ConnectionRequest = {
  socket?: { remoteAddress?: string | null } | null;
  headers: Record<string, string | string[] | undefined>;
};

/** `::1` and IPv4-mapped addresses become the address shown in Logs Center. */
export function normalizeClientIp(value: string | null | undefined): string | null {
  let ip = value?.trim() ?? "";
  if (!ip) return null;
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1).trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped) ip = mapped[1];
  if (ip === "::1") ip = "127.0.0.1";
  if (!ip) return null;
  return ip.slice(0, 45);
}

export function stampConnectionIp(request: ConnectionRequest): void {
  const address = request.socket?.remoteAddress?.trim();
  if (!address) {
    delete request.headers[CONNECTION_IP_HEADER];
    return;
  }
  request.headers[CONNECTION_IP_HEADER] = address;
}

type Emit = Server["emit"];
type PatchedEmit = Emit & { imConnectionIp?: true };

/** Records the socket address before Next.js reads the request headers. */
export function installConnectionIpCapture(): () => void {
  const proto = Server.prototype;
  const original = proto.emit as PatchedEmit;
  if (original.imConnectionIp) return () => {};

  const patched = function (this: Server, event: string | symbol, ...args: unknown[]) {
    if ((event === "request" || event === "upgrade") && args[0] instanceof IncomingMessage) {
      stampConnectionIp(args[0]);
    }
    return original.apply(this, [event, ...args] as Parameters<Emit>);
  } as PatchedEmit;
  patched.imConnectionIp = true;
  proto.emit = patched;

  return () => {
    if (proto.emit === patched) proto.emit = original;
  };
}
