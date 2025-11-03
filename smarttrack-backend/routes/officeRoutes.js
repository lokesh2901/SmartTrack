import express from 'express';
import {
  addOffice,
  getOffices,
  updateOffice,
  deleteOffice,
} from '../controllers/officeController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// officeRoutes.js
router.post('/', verifyToken(['admin']), addOffice);
router.get('/', verifyToken(['admin', 'hr' , 'employee']), getOffices);
router.put('/:id', verifyToken(['admin']), updateOffice);
router.delete('/:id', verifyToken(['admin']), deleteOffice);


export default router;
