export const roles = ['provider_admin', 'staff', 'participant', 'super_admin'] as const;
export type Role = (typeof roles)[number];
export type Actor = {
  uid: string;
  name: string;
  email: string;
  role: Role;
  providerId: string;
  verified: boolean;
};
