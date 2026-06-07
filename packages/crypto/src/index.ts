// E2E şifreleme wrapper arayüzü (Signal Protocol / libsignal).
// docs/11-security-trust-safety.md. Faz 9'da libsignal ile implemente edilir.
// Sunucu yalnızca prekey bundle ve ciphertext taşır — düz metni asla görmez.

export interface PreKeyBundle {
  identityKey: string;
  registrationId: number;
  signedPreKey: { keyId: number; publicKey: string; signature: string };
  preKey?: { keyId: number; publicKey: string };
}

export interface EncryptedMessage {
  type: number;
  body: string; // base64 ciphertext
}

export interface E2ESession {
  encrypt(plaintext: string): Promise<EncryptedMessage>;
  decrypt(message: EncryptedMessage): Promise<string>;
}

export interface E2EProvider {
  /** Cihaz için kimlik + prekey üretir (kayıt sırasında). */
  generateIdentity(): Promise<PreKeyBundle>;
  /** Karşı tarafın bundle'ı ile oturum kurar (X3DH). */
  startSession(remoteBundle: PreKeyBundle): Promise<E2ESession>;
  /** Kayıtlı oturumu yükler. */
  loadSession(remoteUserId: string): Promise<E2ESession | null>;
}

/**
 * Placeholder — gerçek implementasyon Faz 9'da `@signalapp/libsignal-client` ile.
 * Şimdilik açık metin döndürür; production'da ASLA kullanılmaz.
 */
export function createDevE2EProvider(): E2EProvider {
  const passthrough: E2ESession = {
    async encrypt(plaintext: string) {
      return { type: 0, body: Buffer.from(plaintext, 'utf8').toString('base64') };
    },
    async decrypt(message: EncryptedMessage) {
      return Buffer.from(message.body, 'base64').toString('utf8');
    },
  };
  return {
    async generateIdentity() {
      return {
        identityKey: 'dev-identity',
        registrationId: 1,
        signedPreKey: { keyId: 1, publicKey: 'dev', signature: 'dev' },
      };
    },
    async startSession() {
      return passthrough;
    },
    async loadSession() {
      return passthrough;
    },
  };
}
