import "server-only";
import admin from "firebase-admin";

function getServiceAccount() {
  const raw = process.env.FIREBASE_ADMIN_KEY;
  if (!raw) throw new Error("Missing FIREBASE_ADMIN_KEY env var");

  // Some platforms store it with escaped newlines; parse JSON safely.
  const json = JSON.parse(raw);

  // Fix private_key newlines if needed
  if (json.private_key && typeof json.private_key === "string") {
    json.private_key = json.private_key.replace(/\\n/g, "\n");
  }

  return json;
}

if (!admin.apps.length) {
  const serviceAccount = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
