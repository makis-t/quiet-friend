import "server-only";

import admin from "firebase-admin";
import { readFileSync } from "fs";
import path from "path";

const keyPath = path.join(process.cwd(), "firebase-admin-key.json");

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
