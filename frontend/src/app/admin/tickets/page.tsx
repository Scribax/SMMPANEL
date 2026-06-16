'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageCircle, Send, Clock, CheckCircle, AlertCircle,
  X, Loader2, User, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ticketsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  user_name: string;
  user_email: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface TicketMessage {
  id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
  name: string;
  email: string;
  role: string;
}

const statusColors: Record<string, string> = {
  open: 'text-blue-600 bg-blue-100',
  in_progress: 'text-yellow-600 bg-yellow-100',
  resolved: 'text-green-600 bg-green-100',
  closed: 'text-gray-600 bg-gray-100',
};

const priorityColors: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const statusOptions = ['open', 'in_progress', 'resolved', 'closed'];

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsApi.adminGetAllTickets(1, 50, statusFilter || undefined);
      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch {
      toast.error('Error cargando tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      setMessagesLoading(true);
      const response = await ticketsApi.getTicketMessages(ticketId);
      if (response.data.success) {
        setMessages(response.data.messages);
      }
    } catch {
      toast.error('Error cargando mensajes');
    } finally {
      setMessagesLoading(false);
    }
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    try {
      setSendingReply(true);
      await ticketsApi.addMessage(selectedTicket.id, reply);
      setReply('');
      fetchMessages(selectedTicket.id);
      fetchTickets();
      toast.success('Respuesta enviada');
    } catch {
      toast.error('Error enviando respuesta');
    } finally {
      setSendingReply(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      setUpdatingStatus(true);
      await ticketsApi.adminUpdateTicketStatus(selectedTicket.id, { status });
      setSelectedTicket({ ...selectedTicket, status: status as any });
      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: status as any } : t));
      toast.success('Estado actualizado');
    } catch {
      toast.error('Error actualizando estado');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-24 sm:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-indigo-600" />
            Tickets de Soporte
          </h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-auto"
            >
              <option value="">Todos los estados</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 space-y-3 max-h-none lg:max-h-[75vh] overflow-visible lg:overflow-y-auto pr-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="bg-white p-8 rounded-lg text-center text-gray-400">
                No hay tickets
              </div>
            ) : (
              tickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => selectTicket(ticket)}
                  className={`bg-white p-4 rounded-lg shadow-sm cursor-pointer transition-all hover:shadow-md ${
                    selectedTicket?.id === ticket.id ? 'ring-2 ring-indigo-400' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[ticket.status]}`}>
                      {ticket.status}
                    </span>
                    <span className={`text-xs font-medium ${priorityColors[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="font-medium text-gray-900 text-sm truncate">{ticket.subject}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{ticket.user_name} — {ticket.user_email}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.created_at)}</p>
                </motion.div>
              ))
            )}
          </div>

          {/* Ticket Detail */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-white rounded-lg shadow-sm flex flex-col min-h-[420px] lg:h-[75vh]">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 break-words">{selectedTicket.subject}</h2>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {selectedTicket.user_name} &lt;{selectedTicket.user_email}&gt;
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => updateStatus(e.target.value)}
                        disabled={updatingStatus}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.is_admin ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md p-4 rounded-lg text-sm ${
                            msg.is_admin
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          <p className="font-medium mb-1">
                            {msg.name}
                            {msg.is_admin && <span className="ml-2 text-xs bg-white/20 px-1.5 py-0.5 rounded">Admin</span>}
                          </p>
                          <p>{msg.message}</p>
                          <p className={`text-xs mt-2 ${msg.is_admin ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {formatDate(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Reply Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="p-4 sm:p-5 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Escribí tu respuesta..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
                        onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                      />
                      <button
                        onClick={sendReply}
                        disabled={sendingReply || !reply.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 transition-colors w-full sm:w-auto"
                      >
                        {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Responder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm h-[55vh] lg:h-[75vh] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Seleccioná un ticket para ver la conversación</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
