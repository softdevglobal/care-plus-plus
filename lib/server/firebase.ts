import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export function demoMode() {
  return process.env.APP_MODE === 'demo' && process.env.NODE_ENV !== 'production';
}

export function firebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Configure a Care++ Firebase project before using live mode.');
  const app =
    getApps().find((item) => item.name === 'care-plus-plus') ||
    initializeApp(
      {
        projectId,
        credential:
          process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
            ? cert({
                projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
              })
            : applicationDefault(),
      },
      'care-plus-plus',
    );
  return { auth: getAuth(app), db: getFirestore(app) };
}
