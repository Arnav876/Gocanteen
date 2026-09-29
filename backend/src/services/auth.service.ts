import { UserRole } from '@prisma/client';
import { prisma } from '../config/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AppError } from '../middlewares/error.middleware';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  preferredLocationId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new AppError('An account with this email already exists.', 409);
    }

    // Verify location if provided
    if (input.preferredLocationId) {
      const loc = await prisma.location.findUnique({
        where: { id: input.preferredLocationId },
      });
      if (!loc) {
        throw new AppError('Preferred location not found.', 404);
      }
    }

    const passwordHash = await hashPassword(input.password);

    // Register user with CUSTOMER role by default
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        fullName: input.fullName.trim(),
        passwordHash,
        role: UserRole.CUSTOMER,
        phoneNumber: input.phoneNumber?.trim() || null,
        preferredLocationId: input.preferredLocationId || null,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        preferredLocationId: true,
        preferredLocation: {
          select: {
            id: true,
            name: true,
            hallName: true,
          },
        },
        createdAt: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user,
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
      include: {
        preferredLocation: {
          select: {
            id: true,
            name: true,
            hallName: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            status: true,
            counterNumber: true,
            locationId: true,
            isOpen: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await comparePassword(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Omit passwordHash from response
    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      user: sanitizedUser,
      token,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        preferredLocationId: true,
        preferredLocation: {
          select: {
            id: true,
            name: true,
            hallName: true,
            crowdStatus: true,
            avgPrepTimeMin: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            status: true,
            counterNumber: true,
            locationId: true,
            isOpen: true,
            rating: true,
            reviewCount: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404);
    }

    return user;
  }
}
