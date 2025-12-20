// Helper: Convert Float32 audio to 16-bit PCM ArrayBuffer
export const floatTo16BitPCM = (input: number[]) => {
  const buffer = new ArrayBuffer(input.length * 2);
  const output = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
};

// Helper: Convert ArrayBuffer to Base64
export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};