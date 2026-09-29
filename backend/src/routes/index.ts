import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';
import locationRoutes from './location.routes';
import categoryRoutes from './category.routes';
import providerRoutes from './provider.routes';
import foodRoutes from './food.routes';
import userRoutes from './user.routes';
import orderRoutes from './order.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/locations', locationRoutes);
router.use('/providers', providerRoutes);
router.use('/categories', categoryRoutes);
router.use('/foods', foodRoutes);
router.use('/orders', orderRoutes);
router.use('/notifications', notificationRoutes);

export default router;
