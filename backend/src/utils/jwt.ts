import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { ENV } from '../config/env';
import { JwtPayload } from '../types';

export const signToken = (payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string => {
  return jwt.sign(payload, ENV.JWT_SECRET as Secret, { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, ENV.JWT_SECRET as Secret) as JwtPayload;
};
