const USER_PIN_ITERATIONS = 180_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export type UserPinCredential = {
  hash: string;
  salt: string;
  iterations: number;
};

async function deriveUserPin(pin: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const saltBytes = new Uint8Array(salt);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes.buffer, iterations },
    material,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

export async function createUserPinCredential(pin: string): Promise<UserPinCredential> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    hash: await deriveUserPin(pin, salt, USER_PIN_ITERATIONS),
    salt: bytesToBase64(salt),
    iterations: USER_PIN_ITERATIONS,
  };
}

export async function verifyUserPin(pin: string, credential: UserPinCredential) {
  if (!credential.hash || !credential.salt || credential.iterations < 100_000) return false;
  try {
    const candidate = await deriveUserPin(pin, base64ToBytes(credential.salt), credential.iterations);
    if (candidate.length !== credential.hash.length) return false;
    let mismatch = 0;
    for (let index = 0; index < candidate.length; index += 1) mismatch |= candidate.charCodeAt(index) ^ credential.hash.charCodeAt(index);
    return mismatch === 0;
  } catch {
    return false;
  }
}
