/**
 * API client with JWT authentication handling
 */

const API_BASE_URL = 'http://localhost:8000';

export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  jira_project_keys: string[] | null;
  jira_base_url: string | null;
  created_at: string;
  last_login: string | null;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface SupportTicketListResponse {
  items: SupportTicket[];
  total: number;
  skip: number;
  limit: number;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  is_admin: boolean;
  created_at: string;
}

export interface CreateSupportTicketRequest {
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
}

export interface CreateTicketCommentRequest {
  comment: string;
}

export interface UpdateTicketStatusRequest {
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
}

export interface UpdateTicketPriorityRequest {
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UserStatsResponse {
  total_users: number;
  active_users: number;
  admin_users: number;
  total_tickets: number;
  open_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
}

export interface AdminActivityItem {
  id: string;
  type: 'user_registered' | 'ticket_created' | 'ticket_resolved';
  title: string;
  detail: string;
  timestamp: string;
}

export interface AdminActivityResponse {
  items: AdminActivityItem[];
}

export interface AdminSystemInfoResponse {
  app_name: string;
  version: string;
  environment: string;
  server_time: string;
  uptime_seconds: number;
  database_connected: boolean;
  database_latency_ms: number | null;
}

export interface UserListResponse {
  items: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface UpdateUserRoleRequest {
  is_admin: boolean;
}

export interface Scan {
  id: string;
  filename: string;
  file_size_mb: number;
  status: 'uploaded' | 'running' | 'completed' | 'failed' | 'processed';
  uploaded_at: string;
  processed_at: string | null;
  metadata?: any;
  job?: {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number | null;
    job_type: string;
  };
}

export interface Asset {
  id: string;
  asset_identifier: string;
  asset_type: string;
  first_seen: string;
  last_seen: string;
}

export interface Vulnerability {
  id: string;
  scan_id: string;
  asset_id: string;
  asset?: Asset;
  plugin_id: string | null;
  cve_id: string | null;
  title: string;
  description: string | null;
  remediation: string | null;
  scanner_severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvss_score: number | null;
  cvss_vector: string | null;
  port: number | null;
  protocol: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  discovered_at: string;
  has_ticket: boolean;
}

export interface VulnerabilityListResponse {
  items: Vulnerability[];
  total: number;
  skip: number;
  limit: number;
}

export interface DashboardStats {
  total_vulnerabilities: number;
  total_assets: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface TrendPoint {
  label: string;
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface TrendResponse {
  points: TrendPoint[];
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  recaptcha_token: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  full_name: string;
  recaptcha_token: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add Authorization header if access token exists
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await fetch(url, { ...config, headers });
          
          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }
          
          return await retryResponse.json();
        } else {
          // Refresh failed, clear tokens and redirect to login
          this.clearTokens();
          window.location.href = '/login';
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    this.setTokens(response.access_token, response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    this.setTokens(response.access_token, response.refresh_token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // User profile endpoints
  async updateProfile(data: { full_name?: string; email?: string }): Promise<User> {
    const response = await this.request<User>('/auth/me/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.request('/auth/me/password', {
      method: 'PUT',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async updateJiraCredentials(jiraApiToken: string): Promise<User> {
    const response = await this.request<User>('/auth/me/jira/credentials', {
      method: 'PUT',
      body: JSON.stringify({ jira_api_token: jiraApiToken }),
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  async updateJiraUrl(jiraBaseUrl: string): Promise<User> {
    const response = await this.request<User>('/auth/me/jira/url', {
      method: 'PUT',
      body: JSON.stringify({ jira_base_url: jiraBaseUrl }),
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  async updateJiraProjects(projectKeys: string[]): Promise<User> {
    const response = await this.request<User>('/auth/me/jira/projects', {
      method: 'PUT',
      body: JSON.stringify({ project_keys: projectKeys }),
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  async addJiraProject(projectKey: string): Promise<User> {
    const response = await this.request<User>(`/auth/me/jira/projects/${projectKey}`, {
      method: 'POST',
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  async removeJiraProject(projectKey: string): Promise<User> {
    const response = await this.request<User>(`/auth/me/jira/projects/${projectKey}`, {
      method: 'DELETE',
    });
    localStorage.setItem('user', JSON.stringify(response));
    return response;
  }

  // Scan endpoints
  async uploadScan(file: File, onProgress?: (progress: number) => void): Promise<Scan> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response format'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.detail || `Upload failed: ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', `${API_BASE_URL}/scans/upload`);
      
      // Add Authorization header
      if (this.accessToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
      }

      xhr.send(formData);
    });
  }

  async listScans(params?: { skip?: number; limit?: number }): Promise<{ items: Scan[]; total: number; skip: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<{ items: Scan[]; total: number; skip: number; limit: number }>(`/scans${query}`);
  }

  async getScan(scanId: string): Promise<Scan> {
    return this.request<Scan>(`/scans/${scanId}`);
  }

  async getScanReport(scanId: string): Promise<{
    scan: Scan;
    statistics: {
      total_vulnerabilities: number;
      total_assets: number;
      risk_score: number;
      severity_counts: { [key: string]: number };
      asset_type_breakdown: { [key: string]: number };
    };
    top_vulnerabilities: Array<{
      id: string;
      title: string;
      severity: string;
      cvss_score: number | null;
      cve_id: string | null;
      asset_identifier: string;
    }>;
    vulnerabilities: Array<{
      id: string;
      title: string;
      severity: string;
      cvss_score: number | null;
      cve_id: string | null;
      asset_identifier: string;
      asset_type: string;
      status: string;
      discovered_at: string;
    }>;
  }> {
    return this.request(`/scans/${scanId}/report`);
  }

  async deleteScan(scanId: string): Promise<{ message: string }> {
    return this.request(`/scans/${scanId}`, {
      method: 'DELETE',
    });
  }

  // Vulnerability endpoints
  async listVulnerabilities(params?: {
    severity?: string;
    status?: string;
    asset_id?: string;
    scan_id?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<VulnerabilityListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.severity) queryParams.append('severity', params.severity);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.asset_id) queryParams.append('asset_id', params.asset_id);
    if (params?.scan_id) queryParams.append('scan_id', params.scan_id);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return this.request<VulnerabilityListResponse>(
      `/vulnerabilities${query ? `?${query}` : ''}`
    );
  }

  async getVulnerability(vulnerabilityId: string): Promise<Vulnerability> {
    return this.request<Vulnerability>(`/vulnerabilities/${vulnerabilityId}`);
  }

  async getDashboardStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/vulnerabilities/dashboard/stats');
  }

  async getTrend(days: 7 | 30 | 90): Promise<TrendPoint[]> {
    console.log(`[TREND] Requesting days=${days}`);
    const data = await this.request<TrendResponse>(`/vulnerabilities/dashboard/trend?days=${days}`);
    console.log(`[TREND] Raw response days=${days}:`, JSON.stringify(data));
    const nonZero = data.points.filter(p => p.critical || p.high || p.medium || p.low || p.info);
    console.log(`[TREND] Non-zero points (${nonZero.length}/${data.points.length}):`, nonZero);
    if (nonZero.length === 0) {
      console.warn('[TREND] All points are zero — check backend logs for [TREND] lines')
    }
    return data.points;
  }

  // Ticket endpoints
  async createTicket(data: {
    vulnerability_ids: string[] | null;
    title?: string;
    description?: string;
    priority?: string;
    issue_type?: string;
  }): Promise<any> {
    return this.request('/tickets/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Support Ticket endpoints
  async createSupportTicket(data: CreateSupportTicketRequest): Promise<SupportTicket> {
    return this.request('/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listSupportTickets(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    priority?: string;
  }): Promise<SupportTicketListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<SupportTicketListResponse>(`/support-tickets${query}`);
  }

  async getSupportTicket(ticketId: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support-tickets/${ticketId}`);
  }

  async updateSupportTicketStatus(ticketId: string, status: UpdateTicketStatusRequest): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support-tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
  }

  // Alias for backward compatibility
  async updateTicketStatus(ticketId: string, status: UpdateTicketStatusRequest): Promise<SupportTicket> {
    return this.updateSupportTicketStatus(ticketId, status);
  }

  async updateSupportTicketPriority(ticketId: string, priority: UpdateTicketPriorityRequest): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support-tickets/${ticketId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(priority),
    });
  }

  async getTicketComments(ticketId: string): Promise<TicketComment[]> {
    return this.request<TicketComment[]>(`/support-tickets/${ticketId}/comments`);
  }

  async createTicketComment(ticketId: string, data: CreateTicketCommentRequest): Promise<TicketComment> {
    return this.request<TicketComment>(`/support-tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteSupportTicket(ticketId: string): Promise<{ message: string }> {
    return this.request(`/support-tickets/${ticketId}`, {
      method: 'DELETE',
    });
  }

  // Admin endpoints
  async getAdminStats(): Promise<UserStatsResponse> {
    return this.request<UserStatsResponse>('/admin/stats');
  }

  async getAdminActivity(): Promise<AdminActivityResponse> {
    return this.request<AdminActivityResponse>('/admin/activity');
  }

  async getAdminSystemInfo(): Promise<AdminSystemInfoResponse> {
    return this.request<AdminSystemInfoResponse>('/admin/system');
  }

  async listUsers(params?: {
    skip?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<UserListResponse>(`/admin/users${query}`);
  }

  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`);
  }

  async updateUserRole(userId: string, isAdmin: boolean): Promise<User> {
    return this.request<User>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ is_admin: isAdmin }),
    });
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    return this.request<User>(`/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: isActive }),
    });
  }

  async listAllSupportTickets(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    priority?: string;
  }): Promise<SupportTicketListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<SupportTicketListResponse>(`/admin/tickets${query}`);
  }

  async getAdminSupportTicket(ticketId: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/admin/tickets/${ticketId}`);
  }

  async updateAdminTicketStatus(ticketId: string, status: UpdateTicketStatusRequest): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/admin/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(status),
    });
  }

  async updateAdminTicketPriority(ticketId: string, priority: UpdateTicketPriorityRequest): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/admin/tickets/${ticketId}/priority`, {
      method: 'PATCH',
      body: JSON.stringify(priority),
    });
  }

  async getAdminTicketComments(ticketId: string): Promise<TicketComment[]> {
    return this.request<TicketComment[]>(`/admin/tickets/${ticketId}/comments`);
  }

  async createAdminTicketComment(ticketId: string, data: CreateTicketCommentRequest): Promise<TicketComment> {
    return this.request<TicketComment>(`/admin/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const apiClient = new ApiClient();

