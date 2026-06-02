"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Plus,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { ticketsApi } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
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

const statusColors = {
  open: "text-blue-400 bg-blue-400/10",
  in_progress: "text-yellow-400 bg-yellow-400/10",
  resolved: "text-green-400 bg-green-400/10",
  closed: "text-gray-400 bg-gray-400/10",
};

const statusIcons = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle,
  closed: X,
};

const priorityColors = {
  low: "text-gray-400",
  normal: "text-blue-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(
    new Set(),
  );

  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: "",
    message: "",
    priority: "normal" as const,
  });
  const [creatingTicket, setCreatingTicket] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await ticketsApi.getMyTickets();
      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (error) {
      toast.error("Error loading tickets");
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
    } catch (error) {
      toast.error("Error loading messages");
    } finally {
      setMessagesLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setCreatingTicket(true);
      const response = await ticketsApi.createTicket(newTicket);
      if (response.data.success) {
        toast.success("Ticket created successfully");
        setNewTicket({ subject: "", message: "", priority: "normal" });
        setShowNewTicketForm(false);
        fetchTickets();
      }
    } catch (error) {
      toast.error("Error creating ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      setSendingMessage(true);
      const response = await ticketsApi.addMessage(
        selectedTicket.id,
        newMessage,
      );
      if (response.data.success) {
        setNewMessage("");
        fetchMessages(selectedTicket.id);
        fetchTickets(); // Update last message time
      }
    } catch (error) {
      toast.error("Error sending message");
    } finally {
      setSendingMessage(false);
    }
  };

  const selectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const toggleTicketExpanded = (ticketId: string) => {
    const newExpanded = new Set(expandedTickets);
    if (newExpanded.has(ticketId)) {
      newExpanded.delete(ticketId);
    } else {
      newExpanded.add(ticketId);
    }
    setExpandedTickets(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-300 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-64 mb-8"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-dark-100 p-6 rounded-lg">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-300 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary-400" />
              Soporte Técnico
            </h1>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm">
              Gestioná tus tickets de soporte
            </p>
          </div>
          <button
            onClick={() => setShowNewTicketForm(true)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo Ticket
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tickets List */}
          <div className="lg:col-span-1 space-y-4">
            {tickets.length === 0 ? (
              <div className="bg-dark-100 p-8 rounded-lg text-center">
                <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">No tickets yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Create your first support ticket
                </p>
              </div>
            ) : (
              tickets.map((ticket) => {
                const StatusIcon = statusIcons[ticket.status];
                const isExpanded = expandedTickets.has(ticket.id);

                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-dark-100 p-4 rounded-lg cursor-pointer transition-all ${
                      selectedTicket?.id === ticket.id
                        ? "ring-2 ring-primary-400"
                        : ""
                    }`}
                    onClick={() => selectTicket(ticket)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="w-4 h-4" />
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${statusColors[ticket.status]}`}
                          >
                            {ticket.status}
                          </span>
                          <span
                            className={`text-xs ${priorityColors[ticket.priority]}`}
                          >
                            {ticket.priority}
                          </span>
                        </div>
                        <h3 className="text-white font-medium">
                          {ticket.subject}
                        </h3>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTicketExpanded(ticket.id);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="text-sm text-gray-400"
                        >
                          <p>Messages: {ticket.message_count}</p>
                          <p>
                            Last updated: {formatDate(ticket.last_message_at)}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <div className="bg-dark-100 rounded-lg min-h-[400px] lg:h-[600px] flex flex-col">
                {/* Ticket Header */}
                <div className="p-6 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-semibold text-white">
                      {selectedTicket.subject}
                    </h2>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${statusColors[selectedTicket.status]}`}
                    >
                      {selectedTicket.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Created: {formatDate(selectedTicket.created_at)}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
                    </div>
                  ) : (
                    messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.is_admin ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-md p-4 rounded-lg ${
                            message.is_admin
                              ? "bg-gray-700 text-white"
                              : "bg-primary-500 text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium">
                              {message.name}
                            </span>
                            {message.is_admin && (
                              <span className="text-xs bg-primary-600 px-2 py-1 rounded">
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs opacity-75 mt-2">
                            {formatDate(message.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== "closed" && (
                  <div className="p-6 border-t border-gray-700">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-dark-200 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                        onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex bg-dark-100 rounded-lg h-[600px] items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">
                    Seleccioná un ticket para ver los mensajes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Modal */}
        <AnimatePresence>
          {showNewTicketForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50"
              onClick={() => setShowNewTicketForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-dark-100 rounded-lg p-6 max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold text-white mb-4">
                  Create New Ticket
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, subject: e.target.value })
                      }
                      className="w-full bg-dark-200 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) =>
                        setNewTicket({
                          ...newTicket,
                          priority: e.target.value as any,
                        })
                      }
                      className="w-full bg-dark-200 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message
                    </label>
                    <textarea
                      value={newTicket.message}
                      onChange={(e) =>
                        setNewTicket({ ...newTicket, message: e.target.value })
                      }
                      className="w-full bg-dark-200 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 min-h-[120px]"
                      placeholder="Describe your issue in detail"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowNewTicketForm(false)}
                    className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createTicket}
                    disabled={creatingTicket}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {creatingTicket ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      "Create Ticket"
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
