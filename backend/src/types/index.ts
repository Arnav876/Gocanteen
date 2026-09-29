import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string | null;
  preferredLocationId?: string | null;
  provider?: {
    id: string;
    name: string;
    status: string;
    locationId: string;
  } | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
