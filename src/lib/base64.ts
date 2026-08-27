// btoa() takes a binary string, and String.fromCharCode(...bytes) overflows the
// call stack well before a full-page PNG fits in it, so convert in chunks.
const CHUNK_SIZE = 0x8000;

export async function blobToDataUrl(blob: Blob, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const parts: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE)));
  }
  return `data:${mimeType};base64,${btoa(parts.join(''))}`;
}
