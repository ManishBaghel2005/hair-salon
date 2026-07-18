import express from 'express';
import { bookAppointment, getBookedSlots, getAllAppointments, adminLogin } from '../controllers/appointment.controllers.js';

const router = express.Router();

router.post('/book', bookAppointment);
router.get('/booked-slots', getBookedSlots);
router.get('/all', getAllAppointments); 
router.post('/admin/login', adminLogin); // Admin login endpoint

export default router;