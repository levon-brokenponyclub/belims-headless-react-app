import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize when a real API key is present — avoids auth/invalid-api-key
// on deployments where VITE_FIREBASE_* env vars are not set.
const _app = import.meta.env.VITE_FIREBASE_API_KEY
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;

export const firebaseAuth = _app ? getAuth(_app) : null!;

let recaptchaVerifier: RecaptchaVerifier | null = null;

export const clearRecaptcha = (containerId?: string): void => {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* already cleared */ }
    recaptchaVerifier = null;
  }
  // Wipe the DOM node so Firebase can render a fresh widget next time.
  const id = containerId ?? "firebase-recaptcha";
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
};

const initRecaptcha = (containerId: string): RecaptchaVerifier => {
  clearRecaptcha(containerId);
  recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
  });
  return recaptchaVerifier;
};

/**
 * Send OTP to phoneNumber (E.164 format, e.g. "+27821234567").
 * Returns a ConfirmationResult — call .confirm(otp) to verify.
 */
export const sendPhoneOTP = async (
  phoneNumber: string,
  recaptchaContainerId: string,
): Promise<ConfirmationResult> => {
  const verifier = initRecaptcha(recaptchaContainerId);
  return signInWithPhoneNumber(firebaseAuth, phoneNumber, verifier);
};

/**
 * After OTP is confirmed, retrieve the Firebase ID token for the
 * signed-in user so the WP bridge endpoint can verify it.
 */
export const getFirebaseIdToken = async (): Promise<string | null> => {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};

export const isFirebaseConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
