'use client';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

export type ClientConfig = { apiKey: string; authDomain: string; projectId: string; appId: string };
export function clientAuth(config: ClientConfig): Auth {
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}
