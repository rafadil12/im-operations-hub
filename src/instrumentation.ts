export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installConnectionIpCapture } = await import("./lib/connectionIp");
  installConnectionIpCapture();
}
