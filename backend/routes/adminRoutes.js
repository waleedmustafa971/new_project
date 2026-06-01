import express from "express";
import authMiddleware from '../middleware/auth.js';
const router = express.Router()
import {createAdmin, getAdmins, updateAdmin, deleteAdmin,
    adminLogin
} from '../controllers/adminController.js';

router.post('/adminLogin', adminLogin);
router.post('/create', createAdmin); //authMiddleware, 
router.get('/getuser', authMiddleware, getAdmins);
router.put('/:id', authMiddleware, updateAdmin);
router.delete('/:id', authMiddleware, deleteAdmin);

//module.exports = router;
export default router