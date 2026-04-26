// src/utils/firebaseAdmin.ts
import * as admin from 'firebase-admin'

// Parse your JSON‐encoded credentials out of the env var
// (make sure FIREBASE_ADMIN_KEY is set in Vercel as the full JSON blob)
const serviceAccount = JSON.parse(
  process.env.FIREBASE_ADMIN_KEY!
) as admin.ServiceAccount

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
}

export const adminDb = admin.firestore()
