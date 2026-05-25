import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import {
  createTicket,
  getUserTickets,
  getTicketMessages,
  addTicketMessage,
  adminGetAllTickets,
  adminUpdateTicketStatus,
} from '../controllers/ticketController';

const router = Router();

// Rutas para usuarios autenticados
router.use(authenticate);

// Crear nuevo ticket
router.post('/', createTicket);

// Obtener tickets del usuario
router.get('/my-tickets', getUserTickets);

// Obtener mensajes de un ticket específico
router.get('/:ticketId/messages', getTicketMessages);

// Agregar mensaje a un ticket
router.post('/:ticketId/messages', addTicketMessage);

// Admin: obtener todos los tickets
router.get('/admin/all', requireAdmin, adminGetAllTickets);

// Admin: actualizar estado de ticket
router.put('/admin/:ticketId/status', requireAdmin, adminUpdateTicketStatus);

export default router;
