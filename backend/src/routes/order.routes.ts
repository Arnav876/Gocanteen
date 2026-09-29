import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);

// Order endpoints will be implemented in subsequent phase
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Orders endpoint ready for Phase 3 ordering system implementation',
    data: [],
  });
});

export default router;
