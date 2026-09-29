import { Router } from 'express';
import { prisma } from '../config/prisma';
import { requireAuth } from '../middlewares/auth.middleware';
import { AuthenticatedRequest } from '../types';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
