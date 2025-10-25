type Bytes = Uint8Array<ArrayBufferLike> | Uint8Array;

export function toBase64(bytes: Bytes): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return typeof window === "undefined" ? binary : window.btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  if (typeof window === "undefined") {
    throw new Error("Base64 decoding requires Buffer or window.btoa");
  }

  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
