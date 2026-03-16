import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient, Vulnerability, VulnerabilityListResponse } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

// ── Filter Chip ──────────────────────────────────────────
interface FilterChipProps {
  label: string;
  value: string;
  colorClass?: string;
  onRemove: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, value, colorClass, onRemove }) => (
  <span
    className={`inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium border transition-colors ${
      colorClass ?? 'bg-primary/15 text-primary border-primary/30'
    }`}
  >
    <span className="text-current opacity-60">{label}:</span>
    <span className="font-semibold capitalize">{value.replace(/_/g, ' ')}</span>
    <button
      onClick={onRemove}
      className="ml-0.5 flex items-center justify-center w-4 h-4 rounded-full hover:bg-white/20 transition-colors"
      aria-label={`Remove ${label} filter`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
    </button>
  </span>
);

const Vulnerabilities: React.FC = () => {
    
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const { push: pushNotification } = useNotifications();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Filters
  const scanIdFromUrl = searchParams.get('scan_id');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  const selectedVuln = vulnerabilities.find(v => v.id === selectedId);

  const loadVulnerabilities = async () => {
    try {
      setLoading(true);
      const response: VulnerabilityListResponse = await apiClient.listVulnerabilities({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
        scan_id: scanIdFromUrl || undefined,
        search: searchTerm || undefined,
        skip: page * limit,
        limit,
      });
      
      setVulnerabilities(response.items);
      setTotal(response.total);
      
      // Auto-select first item if none selected
      if (response.items.length > 0 && !selectedId) {
        setSelectedId(response.items[0].id);
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to load vulnerabilities', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVulnerabilities();
  }, [severityFilter, statusFilter, searchTerm, page]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-tone-critical/10 text-tone-critical border-tone-critical/25';
      case 'high': return 'bg-tone-high/10 text-tone-high border-tone-high/25';
      case 'medium': return 'bg-tone-medium/10 text-tone-medium border-tone-medium/25';
      case 'low': return 'bg-tone-low/10 text-tone-low border-tone-low/25';
      case 'info': return 'bg-tone-info/10 text-tone-info border-tone-info/25';
      default: return 'bg-surface text-secondary border-border';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-tone-critical/10 text-tone-critical border-tone-critical/25';
      case 'in_progress': return 'bg-tone-warning/10 text-tone-warning border-tone-warning/25';
      case 'resolved': return 'bg-tone-success/10 text-tone-success border-tone-success/25';
      case 'false_positive': return 'bg-tone-neutral/10 text-tone-neutral border-tone-neutral/25';
      default: return 'bg-surface text-secondary border-border';
    }
  };

  const severityCounts = {
    critical: vulnerabilities.filter(v => v.scanner_severity === 'critical').length,
    high: vulnerabilities.filter(v => v.scanner_severity === 'high').length,
    medium: vulnerabilities.filter(v => v.scanner_severity === 'medium').length,
    low: vulnerabilities.filter(v => v.scanner_severity === 'low').length,
    info: vulnerabilities.filter(v => v.scanner_severity === 'info').length,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-white">Vulnerabilities</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-surface text-secondary">{total} total</span>
          {scanIdFromUrl && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/50 flex items-center gap-1">
              Filtered by Scan
              <button 
                onClick={() => navigate('/vulnerabilities')}
                className="hover:text-white"
                title="Clear scan filter"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              try {
                await apiClient.createTicket({ vulnerability_ids: null }); // null means all vulnerabilities
                showToast('Tickets created successfully!', 'success');
                pushNotification('jira_ticket', 'Tickets created', 'Jira/support tickets have been created for all vulnerabilities.');
              } catch (error: any) {
                showToast(error.message || 'Failed to create tickets', 'error');
              }
            }}
            className="flex items-center gap-2 h-8 px-3 bg-primary hover:bg-blue-600 text-on-primary text-sm font-medium rounded transition-colors"
            title="Create tickets for all vulnerabilities"
          >
            <span className="material-symbols-outlined text-sm">confirmation_number</span>
            <span>Create All Tickets</span>
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search vulnerabilities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-3 py-1.5 pl-9 text-sm bg-surface border border-border rounded text-white placeholder-secondary focus:outline-none focus:border-primary"
            />
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-secondary text-sm">search</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main List */}
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <div className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={() => setSeverityFilter('')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  severityFilter === '' 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-surface text-secondary hover:text-white hover:bg-border'
                }`}
              >
                All ({total})
              </button>
              <button 
                onClick={() => setSeverityFilter('critical')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  severityFilter === 'critical' 
                    ? 'bg-tone-critical/20 text-tone-critical border-tone-critical/25' 
                    : 'bg-tone-critical/10 text-tone-critical border-transparent hover:border-tone-critical/25'
                }`}
              >
                Critical ({severityCounts.critical})
              </button>
              <button 
                onClick={() => setSeverityFilter('high')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  severityFilter === 'high' 
                    ? 'bg-tone-high/20 text-tone-high border-tone-high/25' 
                    : 'bg-tone-high/10 text-tone-high border-transparent hover:border-tone-high/25'
                }`}
              >
                High ({severityCounts.high})
              </button>
              <button 
                onClick={() => setSeverityFilter('medium')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  severityFilter === 'medium' 
                    ? 'bg-tone-medium/20 text-tone-medium border-tone-medium/25' 
                    : 'bg-tone-medium/10 text-tone-medium border-transparent hover:border-tone-medium/25'
                }`}
              >
                Medium ({severityCounts.medium})
              </button>
              <button 
                onClick={() => setSeverityFilter('low')}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                  severityFilter === 'low' 
                    ? 'bg-tone-low/20 text-tone-low border-tone-low/25' 
                    : 'bg-tone-low/10 text-tone-low border-transparent hover:border-tone-low/25'
                }`}
              >
                Low ({severityCounts.low})
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-surface border border-border rounded text-white focus:outline-none focus:border-primary"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False Positive</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips */}
          {(severityFilter || statusFilter || searchTerm || scanIdFromUrl) && (
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-secondary font-medium mr-1">Active filters:</span>
              {severityFilter && (
                <FilterChip
                  label="Severity"
                  value={severityFilter}
                  colorClass={
                    severityFilter === 'critical' ? 'bg-tone-critical/10 text-tone-critical border-tone-critical/30' :
                    severityFilter === 'high'     ? 'bg-tone-high/10 text-tone-high border-tone-high/30' :
                    severityFilter === 'medium'   ? 'bg-tone-medium/10 text-tone-medium border-tone-medium/30' :
                    severityFilter === 'low'      ? 'bg-tone-low/10 text-tone-low border-tone-low/30' :
                    undefined
                  }
                  onRemove={() => setSeverityFilter('')}
                />
              )}
              {statusFilter && (
                <FilterChip
                  label="Status"
                  value={statusFilter}
                  colorClass="bg-surface text-secondary border-border"
                  onRemove={() => setStatusFilter('')}
                />
              )}
              {searchTerm && (
                <FilterChip
                  label="Search"
                  value={`"${searchTerm}"`}
                  colorClass="bg-primary/10 text-primary border-primary/25"
                  onRemove={() => setSearchTerm('')}
                />
              )}
              {scanIdFromUrl && (
                <FilterChip
                  label="Scan"
                  value="filtered by scan"
                  colorClass="bg-primary/15 text-primary border-primary/30"
                  onRemove={() => navigate('/vulnerabilities')}
                />
              )}
              {/* Clear All */}
              {[severityFilter, statusFilter, searchTerm].filter(Boolean).length > 1 && (
                <button
                  onClick={() => { setSeverityFilter(''); setStatusFilter(''); setSearchTerm(''); }}
                  className="text-xs text-secondary hover:text-white underline underline-offset-2 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          <div className="flex-1 overflow-auto px-4 pb-4 custom-scroll">
            {loading ? (
              <TableSkeleton rows={10} />
            ) : vulnerabilities.length === 0 ? (
              <EmptyState
                variant={severityFilter || statusFilter || searchTerm || scanIdFromUrl ? 'no-filter-results' : 'no-vulnerabilities'}
                actions={
                  severityFilter || statusFilter || searchTerm
                    ? [
                        {
                          label: 'Clear filters',
                          icon: 'filter_alt_off',
                          onClick: () => { setSeverityFilter(''); setStatusFilter(''); setSearchTerm(''); },
                          variant: 'secondary',
                        },
                      ]
                    : scanIdFromUrl
                    ? [
                        {
                          label: 'View all vulnerabilities',
                          icon: 'open_in_browser',
                          onClick: () => navigate('/vulnerabilities'),
                        },
                      ]
                    : [
                        {
                          label: 'Upload a scan',
                          icon: 'cloud_upload',
                          onClick: () => navigate('/scan-upload'),
                        },
                      ]
                }
              />
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface/50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Severity</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Vulnerability</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Asset</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">CVE</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Port</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 text-xs font-semibold text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {vulnerabilities.map((vuln) => (
                    <tr 
                      key={vuln.id}
                      onClick={() => setSelectedId(vuln.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedId === vuln.id 
                          ? 'bg-primary/10 border-l-2 border-l-primary' 
                          : 'hover:bg-surface/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium uppercase border ${getSeverityColor(vuln.scanner_severity)}`}>
                          {vuln.scanner_severity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-white">{vuln.title}</div>
                        {vuln.cvss_score && (
                          <div className="text-xs text-secondary mt-1">CVSS: {vuln.cvss_score.toFixed(1)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-secondary">
                        {vuln.asset?.asset_identifier || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        {vuln.cve_id ? (
                          <span className="text-sm font-mono text-blue-400">{vuln.cve_id}</span>
                        ) : (
                          <span className="text-xs text-secondary">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-secondary">
                        {vuln.port ? `${vuln.port}/${vuln.protocol || 'tcp'}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize border ${getStatusColor(vuln.status)}`}>
                          {vuln.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (vuln.has_ticket) return; // Already has ticket
                            try {
                              await apiClient.createTicket({ vulnerability_ids: [vuln.id] });
                              showToast(`Ticket created for ${vuln.title}!`, 'success');
                              pushNotification('jira_ticket', 'Ticket created', `A ticket has been created for "${vuln.title}".`);
                              // Refresh the list to update has_ticket
                              loadVulnerabilities();
                            } catch (error: any) {
                              showToast(error.message || 'Failed to create ticket', 'error');
                            }
                          }}
                          disabled={vuln.has_ticket}
                          className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors ${
                            vuln.has_ticket 
                              ? 'bg-green-500/20 text-green-400 border-green-500/30 cursor-not-allowed' 
                              : 'bg-primary/20 hover:bg-primary/30 text-primary hover:text-white border-primary/30 hover:border-primary/50'
                          }`}
                          title={vuln.has_ticket ? "Ticket already created" : "Create ticket for this vulnerability"}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {vuln.has_ticket ? 'check_circle' : 'confirmation_number'}
                          </span>
                          <span>{vuln.has_ticket ? 'Ticket Created' : 'Ticket'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Details Panel */}
        {selectedVuln && (
          <div className="w-[500px] border-l border-border bg-background overflow-auto custom-scroll shrink-0">
            <div className="p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-white mb-2">{selectedVuln.title}</h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium uppercase border ${getSeverityColor(selectedVuln.scanner_severity)}`}>
                      {selectedVuln.scanner_severity}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize border ${getStatusColor(selectedVuln.status)}`}>
                      {selectedVuln.status.replace('_', ' ')}
                    </span>
                    {selectedVuln.cvss_score && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-surface text-white border border-border">
                        CVSS: {selectedVuln.cvss_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => navigate(`/reports?id=${selectedVuln.id}`)}
                    className="p-2 hover:bg-surface rounded transition-colors"
                    title="Open Full Report"
                  >
                    <span className="material-symbols-outlined text-secondary hover:text-primary">open_in_full</span>
                  </button>
                  <button 
                    onClick={() => setSelectedId(null)}
                    className="p-2 hover:bg-surface rounded transition-colors"
                  >
                    <span className="material-symbols-outlined text-secondary">close</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Asset Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary">Identifier:</span>
                      <span className="text-white font-mono">{selectedVuln.asset?.asset_identifier || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Type:</span>
                      <span className="text-white capitalize">{selectedVuln.asset?.asset_type || 'Unknown'}</span>
                    </div>
                    {selectedVuln.port && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Port/Protocol:</span>
                        <span className="text-white">{selectedVuln.port}/{selectedVuln.protocol || 'tcp'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedVuln.cve_id && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">CVE Information</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-secondary">CVE ID:</span>
                        <a 
                          href={`https://nvd.nist.gov/vuln/detail/${selectedVuln.cve_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline font-mono"
                        >
                          {selectedVuln.cve_id}
                        </a>
                      </div>
                      {selectedVuln.cvss_vector && (
                        <div className="flex justify-between">
                          <span className="text-secondary">CVSS Vector:</span>
                          <span className="text-white font-mono text-xs">{selectedVuln.cvss_vector}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedVuln.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                    <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{selectedVuln.description.trim()}</p>
                  </div>
                )}

                {selectedVuln.remediation && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Remediation</h3>
                    <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{selectedVuln.remediation.trim()}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Metadata</h3>
                  <div className="space-y-1 text-sm">
                    {selectedVuln.plugin_id && (
                      <div className="flex justify-between">
                        <span className="text-secondary">Plugin ID:</span>
                        <span className="text-white font-mono">{selectedVuln.plugin_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-secondary">Discovered:</span>
                      <span className="text-white">{new Date(selectedVuln.discovered_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vulnerabilities;

