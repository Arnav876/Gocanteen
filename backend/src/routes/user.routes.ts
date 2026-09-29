import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.use(requireAuth);
router.get('/me', UserController.getProfile);
router.patch('/preferred-location', UserController.updatePreferredLocation);

export default router;
