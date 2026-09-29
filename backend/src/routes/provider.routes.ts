import { Router } from 'express';
import { ProviderController } from '../controllers/provider.controller';

const router = Router();

router.get('/', ProviderController.getAllProviders);
router.get('/:id', ProviderController.getProviderById);

export default router;
