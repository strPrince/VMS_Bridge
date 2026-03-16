import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient, SupportTicket, UserStatsResponse, TicketComment, AdminActivityItem, AdminSystemInfoResponse } from '../services/api';

const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [systemInfo, setSystemInfo] = useState<AdminSystemInfoResponse | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [pagination, setPagination] = useState({
    tickets: { skip: 0, limit: 10, total: 0 },
  });

  // Load admin stats
  const loadStats = useCallback(async () => {
    try {
      const data = await apiClient.getAdminStats();
      setStats(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast]);

  // Load recent activity
  const loadActivity = useCallback(async () => {
    try {
      const data = await apiClient.getAdminActivity();
      setActivity(data.items);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast]);

  // Load system info
  const loadSystemInfo = useCallback(async () => {
    try {
      const data = await apiClient.getAdminSystemInfo();
      setSystemInfo(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast]);

  // Load tickets
  const loadTickets = useCallback(async (skip = 0, limit = 10) => {
    try {
      const response = await apiClient.listAllSupportTickets({ skip, limit });
      setTickets(response.items);
      setPagination(prev => ({
        ...prev,
        tickets: { skip, limit, total: response.total },
      }));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast]);

  // Load ticket comments
  const loadTicketComments = useCallback(async (ticketId: string) => {
    try {
      const comments = await apiClient.getAdminTicketComments(ticketId);
      setTicketComments(comments);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast]);

  // Handle ticket selection
  const handleTicketSelect = useCallback(async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await loadTicketComments(ticket.id);
  }, [loadTicketComments]);

  // Update ticket status
  const handleUpdateTicketStatus = useCallback(async (ticketId: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      await apiClient.updateAdminTicketStatus(ticketId, { status });
      showToast('Ticket status updated successfully', 'success');
      await loadTickets(pagination.tickets.skip, pagination.tickets.limit);
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = await apiClient.getAdminSupportTicket(ticketId);
        setSelectedTicket(updatedTicket);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast, loadTickets, pagination.tickets, selectedTicket]);

  // Update ticket priority
  const handleUpdateTicketPriority = useCallback(async (ticketId: string, priority: 'low' | 'medium' | 'high' | 'urgent') => {
    try {
      await apiClient.updateAdminTicketPriority(ticketId, { priority });
      showToast('Ticket priority updated successfully', 'success');
      await loadTickets(pagination.tickets.skip, pagination.tickets.limit);
      if (selectedTicket?.id === ticketId) {
        const updatedTicket = await apiClient.getAdminSupportTicket(ticketId);
        setSelectedTicket(updatedTicket);
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [showToast, loadTickets, pagination.tickets, selectedTicket]);

  // Create ticket comment
  const handleCreateComment = useCallback(async () => {
    if (!newComment.trim() || !selectedTicket) return;

    try {
      await apiClient.createAdminTicketComment(selectedTicket.id, {
        comment: newComment.trim(),
      });
      showToast('Comment added successfully', 'success');
      setNewComment('');
      await loadTicketComments(selectedTicket.id);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  }, [newComment, selectedTicket, showToast, loadTicketComments]);

  // Paginate tickets
  const handleTicketsPageChange = useCallback((page: number) => {
    const skip = (page - 1) * pagination.tickets.limit;
    loadTickets(skip, pagination.tickets.limit);
  }, [loadTickets, pagination.tickets]);

  // Initialize data
  useEffect(() => {
    if (!user?.is_admin) return;

    loadStats();
    loadTickets();
    loadActivity();
    loadSystemInfo();
  }, [user?.is_admin, loadStats, loadTickets, loadActivity, loadSystemInfo]);

  const formatRelativeTime = (value: string) => {
    const now = Date.now();
    const time = new Date(value).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - time) / 1000));
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getActivityMeta = (type: AdminActivityItem['type']) => {
    switch (type) {
      case 'user_registered':
        return { icon: 'person_add', color: 'text-blue-500', bg: 'bg-blue-500/10' };
      case 'ticket_created':
        return { icon: 'support_agent', color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'ticket_resolved':
        return { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10' };
      default:
        return { icon: 'info', color: 'text-secondary', bg: 'bg-surface-3' };
    }
  };

  const databaseStatus = systemInfo?.database_connected;
  const databaseStatusLabel = databaseStatus === true ? 'Connected' : databaseStatus === false ? 'Disconnected' : 'Unknown';
  const databaseStatusColor = databaseStatus === true ? 'text-green-500' : databaseStatus === false ? 'text-red-500' : 'text-secondary';
  const databaseDotColor = databaseStatus === true ? 'bg-green-500' : databaseStatus === false ? 'bg-red-500' : 'bg-gray-500';
  const systemEvents = activity.slice(0, 4);

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

  if (!user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500 text-2xl">block</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-secondary">You do not have permission to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-white">Admin Panel</h1>
          <p className="text-secondary text-sm mt-1">System Management</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => setActiveSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'dashboard'
                  ? 'bg-surface-3 text-white border border-border'
                  : 'text-secondary hover:bg-surface-3 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">dashboard</span>
              <span className="font-medium">Dashboard</span>
            </button>

            <button
              onClick={() => setActiveSection('tickets')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'tickets'
                  ? 'bg-surface-3 text-white border border-border'
                  : 'text-secondary hover:bg-surface-3 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              <span className="font-medium">Support Tickets</span>
            </button>

            <button
              onClick={() => setActiveSection('system')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === 'system'
                  ? 'bg-surface-3 text-white border border-border'
                  : 'text-secondary hover:bg-surface-3 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              <span className="font-medium">System Info</span>
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-surface-3 rounded-lg">
            <div className="w-8 h-8 bg-purple-500/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-500 text-sm">shield_admin</span>
            </div>
            <div>
              <p className="text-white text-sm font-medium">{user.full_name}</p>
              <p className="text-secondary text-xs">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-surface border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-2xl font-bold">
                {activeSection === 'dashboard' && 'Dashboard Overview'}
                {activeSection === 'tickets' && 'Support Tickets'}
                {activeSection === 'system' && 'System Information'}
              </h2>
              <p className="text-secondary text-sm mt-1">
                {activeSection === 'dashboard' && 'Monitor system statistics and performance'}
                {activeSection === 'tickets' && 'Handle support requests and issues'}
                {activeSection === 'system' && 'View system status and configuration'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-secondary text-sm">Last updated</p>
              <p className="text-white text-sm font-medium">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Dashboard */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-secondary text-sm font-medium mb-1">Total Users</p>
                      <p className="text-white text-3xl font-bold">{stats?.total_users || 0}</p>
                      <p className="text-green-500 text-xs mt-1">+12% from last month</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-500">group</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-secondary text-sm font-medium mb-1">Active Users</p>
                      <p className="text-white text-3xl font-bold">{stats?.active_users || 0}</p>
                      <p className="text-green-500 text-xs mt-1">+8% from last month</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-green-500">check_circle</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-secondary text-sm font-medium mb-1">Support Tickets</p>
                      <p className="text-white text-3xl font-bold">{stats?.total_tickets || 0}</p>
                      <p className="text-yellow-500 text-xs mt-1">+5% from last month</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-orange-500">support_agent</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-secondary text-sm font-medium mb-1">Open Tickets</p>
                      <p className="text-white text-3xl font-bold">{stats?.open_tickets || 0}</p>
                      <p className="text-red-500 text-xs mt-1">Requires attention</p>
                    </div>
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-red-500">error</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-white text-lg font-bold mb-4">Ticket Status Distribution</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Open</span>
                      </div>
                      <span className="text-white font-medium">{stats?.open_tickets || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-secondary text-sm">In Progress</span>
                      </div>
                      <span className="text-white font-medium">{stats?.in_progress_tickets || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Resolved</span>
                      </div>
                      <span className="text-white font-medium">{stats?.resolved_tickets || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Closed</span>
                      </div>
                      <span className="text-white font-medium">{stats?.closed_tickets || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-white text-lg font-bold mb-4">User Activity</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Total Users</span>
                      </div>
                      <span className="text-white font-medium">{stats?.total_users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Active Users</span>
                      </div>
                      <span className="text-white font-medium">{stats?.active_users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Administrators</span>
                      </div>
                      <span className="text-white font-medium">{stats?.admin_users || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span className="text-secondary text-sm">Inactive Users</span>
                      </div>
                      <span className="text-white font-medium">{(stats?.total_users || 0) - (stats?.active_users || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-white text-lg font-bold mb-4">Recent Activity</h3>
                {activity.length === 0 ? (
                  <p className="text-secondary text-sm">No recent activity yet.</p>
                ) : (
                  <div className="space-y-4">
                    {activity.map((item) => {
                      const meta = getActivityMeta(item.type);
                      return (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-surface-3 rounded-lg">
                          <div className={`w-8 h-8 ${meta.bg} rounded-full flex items-center justify-center`}>
                            <span className={`material-symbols-outlined ${meta.color} text-sm`}>{meta.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{item.title}</p>
                            <p className="text-secondary text-xs truncate">{item.detail}</p>
                          </div>
                          <span className="text-secondary text-xs whitespace-nowrap">{formatRelativeTime(item.timestamp)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Support Tickets */}
          {activeSection === 'tickets' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Tickets List */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-surface border border-border rounded-xl">
                  <div className="p-6 border-b border-border">
                    <h3 className="text-white text-lg font-bold">Support Tickets ({pagination.tickets.total})</h3>
                  </div>
                  <div className="divide-y divide-border">
                    {tickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className={`p-6 cursor-pointer transition-colors ${
                          selectedTicket?.id === ticket.id ? 'bg-surface-3' : 'hover:bg-surface-3/50'
                        }`}
                        onClick={() => handleTicketSelect(ticket)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-white font-medium mb-1">{ticket.title}</h4>
                            <p className="text-secondary text-sm line-clamp-2">{ticket.description}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(ticket.status)}`}>
                              {getStatusLabel(ticket.status)}
                            </span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(ticket.priority)}`}>
                              {getPriorityLabel(ticket.priority)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-secondary">
                            Created {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            <select
                              value={ticket.status}
                              onChange={(e) => handleUpdateTicketStatus(ticket.id, e.target.value as any)}
                              className="px-2 py-1 text-xs rounded bg-surface-4 text-white border border-border focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                            <select
                              value={ticket.priority}
                              onChange={(e) => handleUpdateTicketPriority(ticket.id, e.target.value as any)}
                              className="px-2 py-1 text-xs rounded bg-surface-4 text-white border border-border focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {pagination.tickets.total > pagination.tickets.limit && (
                    <div className="flex items-center justify-between p-6 border-t border-border">
                      <p className="text-secondary text-sm">
                        Showing {pagination.tickets.skip + 1} to {Math.min(pagination.tickets.skip + pagination.tickets.limit, pagination.tickets.total)} of {pagination.tickets.total} tickets
                      </p>
                      <div className="flex gap-1">
                        {Array.from({
                          length: Math.ceil(pagination.tickets.total / pagination.tickets.limit),
                        }).map((_, index) => (
                          <button
                            key={index}
                            onClick={() => handleTicketsPageChange(index + 1)}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              pagination.tickets.skip / pagination.tickets.limit === index
                                ? 'bg-blue-500 text-on-primary'
                                : 'text-secondary hover:bg-surface-3 hover:text-white'
                            }`}
                          >
                            {index + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-6">
                {selectedTicket ? (
                  <div className="bg-surface border border-border rounded-xl">
                    <div className="p-6 border-b border-border">
                      <h3 className="text-white text-lg font-bold">Ticket Details</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      {/* Ticket Info */}
                      <div>
                        <h4 className="text-white font-medium mb-3">{selectedTicket.title}</h4>
                        <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                      </div>

                      {/* Ticket Metadata */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-3 rounded-lg p-4">
                          <p className="text-secondary text-xs font-medium mb-1">STATUS</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedTicket.status)}`}>
                            {getStatusLabel(selectedTicket.status)}
                          </span>
                        </div>
                        <div className="bg-surface-3 rounded-lg p-4">
                          <p className="text-secondary text-xs font-medium mb-1">PRIORITY</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadgeClass(selectedTicket.priority)}`}>
                            {getPriorityLabel(selectedTicket.priority)}
                          </span>
                        </div>
                        <div className="bg-surface-3 rounded-lg p-4">
                          <p className="text-secondary text-xs font-medium mb-1">CATEGORY</p>
                          <p className="text-white text-sm">{selectedTicket.category || 'N/A'}</p>
                        </div>
                        <div className="bg-surface-3 rounded-lg p-4">
                          <p className="text-secondary text-xs font-medium mb-1">CREATED</p>
                          <p className="text-white text-sm">{new Date(selectedTicket.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Comments */}
                      <div>
                        <h4 className="text-white font-medium mb-4">Comments & Updates</h4>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {ticketComments.map(comment => (
                            <div key={comment.id} className="bg-surface-3 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <span className={`text-xs font-medium px-2 py-1 rounded ${
                                  comment.is_admin ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                  {comment.is_admin ? 'Admin' : 'User'}
                                </span>
                                <span className="text-secondary text-xs">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-white text-sm whitespace-pre-wrap">{comment.comment}</p>
                            </div>
                          ))}
                        </div>

                        {/* Add Comment */}
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment or update..."
                            className="w-full p-3 bg-surface-3 border border-border rounded-lg text-white text-sm placeholder-secondary focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical min-h-[100px]"
                          />
                          <button
                            onClick={handleCreateComment}
                            disabled={!newComment.trim()}
                            className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-on-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Comment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface border border-border rounded-xl p-8">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-surface-3 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary text-3xl">support_agent</span>
                      </div>
                      <h3 className="text-white text-lg font-bold mb-2">No Ticket Selected</h3>
                      <p className="text-secondary text-sm">Select a ticket from the list to view details and manage it</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* System Information */}
          {activeSection === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-white text-lg font-bold mb-4">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-white text-sm">API Server</span>
                      </div>
                      <span className="text-green-500 text-xs font-medium">Online</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 ${databaseDotColor} rounded-full`}></div>
                        <span className="text-white text-sm">Database</span>
                      </div>
                      <span className={`${databaseStatusColor} text-xs font-medium`}>{databaseStatusLabel}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-xl p-6">
                  <h3 className="text-white text-lg font-bold mb-4">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-secondary text-sm">App</span>
                      <span className="text-white text-sm">{systemInfo?.app_name || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-secondary text-sm">Version</span>
                      <span className="text-white text-sm">{systemInfo?.version || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-secondary text-sm">Environment</span>
                      <span className="text-white text-sm">{systemInfo?.environment || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-secondary text-sm">Uptime</span>
                      <span className="text-white text-sm">{systemInfo ? formatUptime(systemInfo.uptime_seconds) : '—'}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-secondary text-sm">Server Time</span>
                      <span className="text-white text-sm">
                        {systemInfo ? new Date(systemInfo.server_time).toLocaleString() : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-secondary text-sm">DB Latency</span>
                      <span className="text-white text-sm">
                        {systemInfo?.database_latency_ms !== null && systemInfo?.database_latency_ms !== undefined
                          ? `${systemInfo.database_latency_ms} ms`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-6">
                <h3 className="text-white text-lg font-bold mb-4">Recent System Events</h3>
                {systemEvents.length === 0 ? (
                  <p className="text-secondary text-sm">No recent events.</p>
                ) : (
                  <div className="space-y-3 font-mono text-xs">
                    {systemEvents.map((item) => {
                      const level = item.type === 'ticket_resolved' ? 'SUCCESS' : 'INFO';
                      const levelColor = item.type === 'ticket_resolved' ? 'text-green-500' : 'text-blue-500';
                      return (
                        <div key={item.id} className="flex gap-4 p-3 bg-surface-3 rounded-lg">
                          <span className={levelColor}>[{level}]</span>
                          <span className="text-white truncate">{item.title} - {item.detail}</span>
                          <span className="text-secondary ml-auto">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;



