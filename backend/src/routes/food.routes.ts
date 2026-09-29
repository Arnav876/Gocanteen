import { Router } from 'express';
import { FoodController } from '../controllers/food.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createFoodSchema, updateFoodSchema } from '../validators/food.validator';

const router = Router();

// Public routes
router.get('/', FoodController.getAllFoods);

// Provider protected: Get authenticated provider stall's menu
router.get('/my-menu', requireAuth, requireRole('PROVIDER', 'ADMIN'), FoodController.getMyMenu);

// Get single food item
router.get('/:id', FoodController.getFoodById);

// Provider protected: Create new food item
router.post(
  '/',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  validate(createFoodSchema),
  FoodController.createFood
);

// Provider protected: Update food item
router.patch(
  '/:id',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  validate(updateFoodSchema),
  FoodController.updateFood
);

// Provider protected: Toggle item availability (Available <-> Out of Stock)
router.patch(
  '/:id/toggle-availability',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  FoodController.toggleAvailability
);

// Provider protected: Delete food item
router.delete(
  '/:id',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  FoodController.deleteFood
);

export default router;
