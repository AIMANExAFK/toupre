import { Platform } from "react-native";

// Gestionnaire de notifications natives (web Notification API + service worker pour push)
// Sur web : utilise window.Notification + service worker pour push background
// Sur natif : utiliserait expo-notifications

export const NotificationsManager = {
  isSupported(): boolean {
    if (Platform.OS !== "web") return false;
    if (typeof window === "undefined") return false;
    return "Notification" in window;
  },

  getPermission(): "granted" | "denied" | "default" | "unsupported" {
    if (!this.isSupported()) return "unsupported";
    return Notification.permission as any;
  },

  async requestPermission(): Promise<"granted" | "denied" | "default" | "unsupported"> {
    if (!this.isSupported()) return "unsupported";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    return result as any;
  },

  show(title: string, options?: NotificationOptions): Notification | null {
    if (!this.isSupported()) return null;
    if (Notification.permission !== "granted") return null;
    try {
      return new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        silent: false,
        ...options,
      });
    } catch {
      return null;
    }
  },

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (Platform.OS !== "web") return null;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      return reg;
    } catch (e) {
      console.warn("[NotificationsManager] SW register failed", e);
      return null;
    }
  },

  // Pour les push notifications cross-platform en prod il faut FCM / APN
  // En démo on simule juste avec Notification API
  async getPushToken(): Promise<string | null> {
    if (Platform.OS !== "web") return null;
    if (Notification.permission !== "granted") return null;
    // Mock : token déterministe par device
    let token = localStorage.getItem("ls_push_token");
    if (!token) {
      token = "web_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem("ls_push_token", token);
    }
    return token;
  },
};

// WebAuthn / Passkey manager
export const PasskeyManager = {
  isSupported(): boolean {
    if (Platform.OS !== "web") return false;
    if (typeof window === "undefined") return false;
    return !!(window as any).PublicKeyCredential;
  },

  async isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      return await (window as any).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  /** Convertit une chaîne base64url en ArrayBuffer */
  b64ToBuffer(b64: string): ArrayBuffer {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  },

  /** Convertit un ArrayBuffer en base64url */
  bufferToB64(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  },

  /** Crée une nouvelle passkey via navigator.credentials.create */
  async register(options: {
    userId: string;
    userName: string;
    displayName: string;
    challenge: string; // base64url
    rpName?: string;
    rpId?: string;
  }): Promise<{ credentialId: string; clientDataJSON: string; attestationObject: string } | null> {
    if (!this.isSupported()) return null;

    const challenge = this.b64ToBuffer(options.challenge);
    const userIdBytes = new TextEncoder().encode(options.userId);

    try {
      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: options.rpName || "LocaShare",
            id: options.rpId || window.location.hostname,
          },
          user: {
            id: userIdBytes,
            name: options.userName,
            displayName: options.displayName,
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, // ES256
            { type: "public-key", alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            userVerification: "required",
            authenticatorAttachment: "platform",
            residentKey: "preferred",
          },
          timeout: 60000,
          attestation: "none",
        },
      })) as PublicKeyCredential | null;

      if (!credential) return null;
      const response = credential.response as AuthenticatorAttestationResponse;
      return {
        credentialId: this.bufferToB64(credential.rawId),
        clientDataJSON: this.bufferToB64(response.clientDataJSON),
        attestationObject: this.bufferToB64(response.attestationObject),
      };
    } catch (e) {
      console.warn("[PasskeyManager] register failed", e);
      return null;
    }
  },

  /** Authentifie via une passkey existante */
  async authenticate(options: {
    challenge: string; // base64url
    allowCredentials: { id: string; type: "public-key" }[];
    rpId?: string;
  }): Promise<{
    credentialId: string;
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
  } | null> {
    if (!this.isSupported()) return null;
    const challenge = this.b64ToBuffer(options.challenge);

    try {
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: options.rpId || window.location.hostname,
          allowCredentials: options.allowCredentials.map((c) => ({
            id: this.b64ToBuffer(c.id),
            type: "public-key",
          })),
          userVerification: "required",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;

      if (!credential) return null;
      const response = credential.response as AuthenticatorAssertionResponse;
      return {
        credentialId: this.bufferToB64(credential.rawId),
        clientDataJSON: this.bufferToB64(response.clientDataJSON),
        authenticatorData: this.bufferToB64(response.authenticatorData),
        signature: this.bufferToB64(response.signature),
      };
    } catch (e) {
      console.warn("[PasskeyManager] authenticate failed", e);
      return null;
    }
  },
};
