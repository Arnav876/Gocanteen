import { Router } from 'express';
import { FoodController } from '../controllers/food.controller';

const router = Router();

router.get('/', FoodController.getAllFoods);
router.get('/:id', FoodController.getFoodById);

export default router;
