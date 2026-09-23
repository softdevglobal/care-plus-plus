import OperationsWorkspace from '@/components/operations/workspace';
import { demoMode } from '@/lib/server/firebase';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Care++ | Operations' };
export default function OperationsPage() {
  return (
    <OperationsWorkspace
      demo={demoMode()}
      config={{
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      }}
    />
  );
}
