import { Request, Response } from 'express';
import { query } from '../config/database';
import { sendTicketNotificationEmail } from '../services/emailService';
import logger from '../utils/logger';

// Crear nuevo ticket
export const createTicket = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { subject, message, priority = 'normal' } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!subject || !message) {
      res.status(400).json({ success: false, message: 'Subject and message are required' });
      return;
    }

    // Crear ticket
    const ticketResult = await query(
      `INSERT INTO tickets (user_id, subject, message, priority) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userId, subject, message, priority]
    );

    const ticket = ticketResult.rows[0];

    // Crear mensaje inicial
    await query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin) 
       VALUES ($1, $2, $3, $4)`,
      [ticket.id, userId, message, false]
    );

    // Enviar notificación por email al admin
    try {
      await sendTicketNotificationEmail(ticket, 'new');
    } catch (emailError) {
      logger.error('Failed to send ticket notification email', { error: emailError });
    }

    // Obtener información del usuario para la respuesta
    const userResult = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );

    res.status(201).json({
      success: true,
      ticket: {
        ...ticket,
        user: userResult.rows[0]
      }
    });

    logger.info('New ticket created', { ticketId: ticket.id, userId, subject });
  } catch (error) {
    logger.error('Error creating ticket', { error });
    res.status(500).json({ success: false, message: 'Error creating ticket' });
  }
};

// Obtener tickets del usuario autenticado
export const getUserTickets = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const offset = (page - 1) * limit;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const [tickets, count] = await Promise.all([
      query(
        `SELECT t.*, 
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT created_at FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM tickets t 
         WHERE t.user_id = $1 
         ORDER BY t.created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      query(
        'SELECT COUNT(*) FROM tickets WHERE user_id = $1',
        [userId]
      )
    ]);

    res.json({
      success: true,
      tickets: tickets.rows,
      total: parseInt(count.rows[0]?.count ?? '0'),
      page,
      limit
    });
  } catch (error) {
    logger.error('Error fetching user tickets', { error });
    res.status(500).json({ success: false, message: 'Error fetching tickets' });
  }
};

// Obtener mensajes de un ticket específico
export const getTicketMessages = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Verificar que el ticket pertenece al usuario o es admin
    const ticketCheck = await query(
      'SELECT user_id FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticketCheck.rows.length) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const ticketUserId = ticketCheck.rows[0].user_id;
    const isAdmin = req.user?.role === 'admin';

    if (ticketUserId !== userId && !isAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Obtener mensajes del ticket
    const messagesResult = await query(
      `SELECT tm.*, u.name, u.email, u.role
       FROM ticket_messages tm
       JOIN users u ON tm.sender_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );

    res.json({
      success: true,
      messages: messagesResult.rows
    });
  } catch (error) {
    logger.error('Error fetching ticket messages', { error });
    res.status(500).json({ success: false, message: 'Error fetching messages' });
  }
};

// Agregar mensaje a un ticket
export const addTicketMessage = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'admin';

    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required' });
      return;
    }

    // Verificar que el ticket pertenece al usuario o es admin
    const ticketCheck = await query(
      'SELECT user_id, status FROM tickets WHERE id = $1',
      [ticketId]
    );

    if (!ticketCheck.rows.length) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const ticketUserId = ticketCheck.rows[0].user_id;
    const ticketStatus = ticketCheck.rows[0].status;

    if (ticketUserId !== userId && !isAdmin) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Si el ticket está cerrado, no se pueden agregar mensajes
    if (ticketStatus === 'closed') {
      res.status(400).json({ success: false, message: 'Ticket is closed' });
      return;
    }

    // Agregar mensaje
    const messageResult = await query(
      `INSERT INTO ticket_messages (ticket_id, sender_id, message, is_admin) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [ticketId, userId, message, isAdmin]
    );

    // Actualizar estado del ticket si es admin respondiendo
    if (isAdmin && ticketStatus === 'open') {
      await query(
        'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2',
        ['in_progress', ticketId]
      );
    } else if (!isAdmin && ticketStatus === 'in_progress') {
      await query(
        'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2',
        ['open', ticketId]
      );
    }

    // Actualizar timestamp del ticket
    await query(
      'UPDATE tickets SET updated_at = NOW() WHERE id = $1',
      [ticketId]
    );

    const newMessage = messageResult.rows[0];

    // Enviar notificación por email
    try {
      await sendTicketNotificationEmail({ id: ticketId }, isAdmin ? 'admin_reply' : 'user_reply');
    } catch (emailError) {
      logger.error('Failed to send ticket notification email', { error: emailError });
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });

    logger.info('New ticket message added', { ticketId, userId, isAdmin });
  } catch (error) {
    logger.error('Error adding ticket message', { error });
    res.status(500).json({ success: false, message: 'Error adding message' });
  }
};

// Admin: Obtener todos los tickets
export const adminGetAllTickets = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    const whereClause = status && validStatuses.includes(status) ? 'WHERE t.status = $3' : '';
    const params = status ? [limit, offset, status] : [limit, offset];

    const [tickets, count] = await Promise.all([
      query(
        `SELECT t.*, 
                u.name as user_name, u.email as user_email,
                (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
                (SELECT created_at FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_at
         FROM tickets t
         JOIN users u ON t.user_id = u.id
         ${whereClause}
         ORDER BY t.created_at DESC 
         LIMIT $1 OFFSET $2`,
        params
      ),
      query(
        `SELECT COUNT(*) FROM tickets ${status ? 'WHERE status = $1' : ''}`,
        status ? [status] : []
      )
    ]);

    res.json({
      success: true,
      tickets: tickets.rows,
      total: parseInt(count.rows[0]?.count ?? '0'),
      page,
      limit
    });
  } catch (error) {
    logger.error('Error fetching all tickets', { error });
    res.status(500).json({ success: false, message: 'Error fetching tickets' });
  }
};

// Admin: Actualizar estado de ticket
export const adminUpdateTicketStatus = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { ticketId } = req.params;
    const { status, assigned_to } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const result = await query(
      `UPDATE tickets 
       SET status = $1, assigned_to = $2, updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [status, assigned_to || null, ticketId]
    );

    if (!result.rows.length) {
      res.status(404).json({ success: false, message: 'Ticket not found' });
      return;
    }

    const ticket = result.rows[0];

    // Enviar notificación por email si se resuelve o cierra
    if (status === 'resolved' || status === 'closed') {
      try {
        await sendTicketNotificationEmail(ticket, 'resolved');
      } catch (emailError) {
        logger.error('Failed to send ticket notification email', { error: emailError });
      }
    }

    res.json({
      success: true,
      ticket
    });

    logger.info('Ticket status updated', { ticketId, status, updatedBy: req.user?.id });
  } catch (error) {
    logger.error('Error updating ticket status', { error });
    res.status(500).json({ success: false, message: 'Error updating ticket status' });
  }
};
