import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { apiClient, SupportTicket, SupportTicketListResponse, TicketComment, CreateSupportTicketRequest, CreateTicketCommentRequest } from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const SupportTickets: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { push: pushNotification } = useNotifications();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState({
    tickets: true,
    comments: false,
    createTicket: false,
    createComment: false,
  });
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 10,
    total: 0,
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    category: '',
  });

  // Load user tickets
  const loadTickets = useCallback(async (skip = 0, limit = 10) => {
    try {
      setLoading(prev => ({ ...prev, tickets: true }));
      const response: SupportTicketListResponse = await apiClient.listSupportTickets({ skip, limit });
      setTickets(response.items);
      setPagination({ skip, limit, total: response.total });
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, tickets: false }));
    }
  }, [showToast]);

  // Load ticket comments
  const loadTicketComments = useCallback(async (ticketId: string) => {
    try {
      setLoading(prev => ({ ...prev, comments: true }));
      const comments = await apiClient.getTicketComments(ticketId);
      setTicketComments(comments);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, comments: false }));
    }
  }, [showToast]);

  // Handle ticket selection
  const handleTicketSelect = useCallback(async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadTicketComments(ticket.id);
  }, [loadTicketComments]);

  // Create new ticket
  const handleCreateTicket = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim() || !createForm.description.trim()) {
      showToast('Title and description are required', 'error');
      return;
    }

    try {
      setLoading(prev => ({ ...prev, createTicket: true }));
      const request: CreateSupportTicketRequest = {
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
        category: createForm.category || undefined,
      };
      await apiClient.createSupportTicket(request);
      showToast('Ticket created successfully', 'success');
      pushNotification('jira_ticket', 'Support ticket created', `"${createForm.title}" has been submitted successfully.`);
      setCreateForm({ title: '', description: '', priority: 'medium', category: '' });
      setShowCreateForm(false);
      await loadTickets(pagination.skip, pagination.limit);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, createTicket: false }));
    }
  }, [createForm, showToast, loadTickets, pagination]);

  // Create comment
  const handleCreateComment = useCallback(async () => {
    if (!selectedTicket || !newComment.trim()) return;

    try {
      setLoading(prev => ({ ...prev, createComment: true }));
      const request: CreateTicketCommentRequest = { comment: newComment };
      await apiClient.createTicketComment(selectedTicket.id, request);
      setNewComment('');
      await loadTicketComments(selectedTicket.id);
      showToast('Comment added successfully', 'success');
      pushNotification('info', 'Comment added', `Reply posted on ticket "${selectedTicket.title}"`);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(prev => ({ ...prev, createComment: false }));
    }
  }, [selectedTicket, newComment, showToast, loadTicketComments]);

  // Update ticket status
  const handleUpdateTicketStatus = useCallback(async (ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    const statusLabel: Record<string, string> = {
      open: 'Open',
      in_progress: 'In Progress',
      resolved: 'Resolved',
      closed: 'Closed',
    };
    const ticketTitle = tickets.find(t => t.id === ticketId)?.title ?? selectedTicket?.title ?? 'Ticket';
    try {
      await apiClient.updateTicketStatus(ticketId, { status });
      showToast('Ticket status updated successfully', 'success');
      pushNotification('info', 'Ticket status updated', `"${ticketTitle}" marked as ${statusLabel[status] ?? status}.`);
      await loadTickets(pagination.skip, pagination.limit);
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: status as any } : null);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast, loadTickets, pagination, selectedTicket, tickets, pushNotification]);

  // Get status badge class
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-tone-critical/10 text-tone-critical border-tone-critical/25';
      case 'in_progress':
        return 'bg-tone-warning/10 text-tone-warning border-tone-warning/25';
      case 'resolved':
        return 'bg-tone-success/10 text-tone-success border-tone-success/25';
      case 'closed':
        return 'bg-tone-neutral/10 text-tone-neutral border-tone-neutral/25';
      default:
        return 'bg-tone-neutral/10 text-tone-neutral border-tone-neutral/25';
    }
  };

  // Get priority badge class
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-tone-low/10 text-tone-low border-tone-low/25';
      case 'medium':
        return 'bg-tone-medium/10 text-tone-medium border-tone-medium/25';
      case 'high':
        return 'bg-tone-high/10 text-tone-high border-tone-high/25';
      case 'urgent':
        return 'bg-tone-critical/10 text-tone-critical border-tone-critical/25';
      default:
        return 'bg-tone-neutral/10 text-tone-neutral border-tone-neutral/25';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  // Load data on mount
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-3xl font-bold leading-tight tracking-tight">Help & Support</h2>
            <p className="text-secondary text-sm">Create and manage your support requests</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-on-primary text-sm font-medium rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Ticket
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-6 max-w-[1600px] mx-auto w-full">
          {/* Create Ticket Form */}
          {showCreateForm && (
            <div className="bg-surface border border-border rounded-lg p-6 mb-6">
              <h3 className="text-white text-lg font-bold mb-4">Create New Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Title</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical min-h-[120px]"
                    placeholder="Detailed description of your issue"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Priority</label>
                    <select
                      value={createForm.priority}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Category (Optional)</label>
                    <input
                      type="text"
                      value={createForm.category}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Bug, Feature, General"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading.createTicket}
                    className="flex-1 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-on-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading.createTicket ? 'Creating...' : 'Create Ticket'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 bg-surface-3 hover:bg-surface-4 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tickets List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-surface border border-border rounded-lg">
                <div className="p-6 border-b border-border">
                  <h3 className="text-white text-lg font-bold">Your Tickets</h3>
                </div>
                <div className="p-6">
                  {loading.tickets ? (
                    <TableSkeleton columns={4} rows={5} />
                  ) : tickets.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {tickets.map(ticket => (
                          <div
                            key={ticket.id}
                            className={`p-4 border border-border rounded-lg cursor-pointer transition-colors ${
                              selectedTicket?.id === ticket.id ? 'bg-surface-3 border-blue-500/50' : 'hover:bg-surface-3'
                            }`}
                            onClick={() => handleTicketSelect(ticket)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-white font-medium truncate pr-4">{ticket.title}</h4>
                              <div className="flex gap-2 flex-shrink-0">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  getStatusBadgeClass(ticket.status)
                                }`}>
                                  {getStatusLabel(ticket.status)}
                                </span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  getPriorityBadgeClass(ticket.priority)
                                }`}>
                                  {getPriorityLabel(ticket.priority)}
                                </span>
                              </div>
                            </div>
                            <p className="text-secondary text-sm mb-2 line-clamp-2">{ticket.description}</p>
                            <div className="flex items-center justify-between text-xs text-secondary">
                              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                              {ticket.category && <span>{ticket.category}</span>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {pagination.total > pagination.limit && (
                        <div className="flex items-center justify-between mt-6">
                          <p className="text-sm text-secondary">
                            Showing {pagination.skip + 1} to {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total} tickets
                          </p>
                          <div className="flex gap-1">
                            {Array.from({
                              length: Math.ceil(pagination.total / pagination.limit),
                            }).map((_, index) => (
                              <button
                                key={index}
                                onClick={() => loadTickets(index * pagination.limit, pagination.limit)}
                                className={`px-3 py-1 text-sm rounded-lg ${
                                  pagination.skip / pagination.limit === index
                                    ? 'bg-surface-3 text-white'
                                    : 'text-secondary hover:bg-surface-3 hover:text-white'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <EmptyState
                      variant="no-tickets"
                      actions={[
                        {
                          label: 'Create a ticket',
                          icon: 'add',
                          onClick: () => setShowCreateForm(true),
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="space-y-6">
              {selectedTicket ? (
                <div className="bg-surface border border-border rounded-lg">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-white text-lg font-bold">Ticket Details</h3>
                  </div>
                  <div className="p-6 space-y-6">
                    {/* Ticket Info */}
                    <div>
                      <h4 className="text-white font-medium mb-2">{selectedTicket.title}</h4>
                      <p className="text-secondary text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>

                    {/* Ticket Metadata */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-secondary text-sm">Status</span>
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value)}
                          className="px-3 py-1 text-xs rounded-lg bg-surface-3 text-white border border-border focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-secondary text-sm">Priority</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          getPriorityBadgeClass(selectedTicket.priority)
                        }`}>
                          {getPriorityLabel(selectedTicket.priority)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-secondary text-sm">Category</span>
                        <span className="text-white text-sm">{selectedTicket.category || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-border">
                        <span className="text-secondary text-sm">Created At</span>
                        <span className="text-white text-sm">
                          {new Date(selectedTicket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {selectedTicket.updated_at && (
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-secondary text-sm">Updated At</span>
                          <span className="text-white text-sm">
                            {new Date(selectedTicket.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {selectedTicket.resolved_at && (
                        <div className="flex justify-between items-center py-2 border-b border-border">
                          <span className="text-secondary text-sm">Resolved At</span>
                          <span className="text-white text-sm">
                            {new Date(selectedTicket.resolved_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Comments */}
                    <div>
                      <h4 className="text-white font-medium mb-4">Comments</h4>
                      <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                        {loading.comments ? (
                          <div className="space-y-3">
                            <div className="h-4 bg-surface-3 rounded w-3/4 animate-pulse"></div>
                            <div className="h-4 bg-surface-3 rounded w-1/2 animate-pulse"></div>
                            <div className="h-4 bg-surface-3 rounded w-5/6 animate-pulse"></div>
                          </div>
                        ) : ticketComments.length > 0 ? (
                          ticketComments.map(comment => (
                            <div key={comment.id} className="bg-surface-3 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <span className={`text-xs font-medium ${
                                  comment.is_admin ? 'text-purple-500' : 'text-blue-500'
                                }`}>
                                  {comment.is_admin ? 'Admin' : 'You'}
                                </span>
                                <span className="text-xs text-secondary">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-white whitespace-pre-wrap">{comment.comment}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-secondary text-sm">No comments yet</p>
                        )}
                      </div>

                      {/* Add Comment */}
                      <div className="space-y-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical min-h-[80px]"
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleCreateComment())}
                        />
                        <button
                          onClick={handleCreateComment}
                          disabled={!newComment.trim() || loading.createComment}
                          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-on-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading.createComment ? 'Adding...' : 'Add Comment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-lg p-6">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-secondary text-6xl mb-2">support_agent</span>
                    <p className="text-secondary text-sm">Select a ticket to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;



