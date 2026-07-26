import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, Scan } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { useNotifications } from '../contexts/NotificationContext';
import { TableSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';

const ALLOWED_EXTENSIONS = ['.json', '.xml', '.csv', '.txt', '.sarif', '.cyclonedx'];
const MAX_FILE_SIZE_MB = 100;

interface ScanSummary {
  scanId: string;
  filename: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface DeleteDialogState {
  open: boolean;
  scanId: string;
  filename: string;
}

interface ActionMenuState {
  open: boolean;
  scanId: string;
  anchorY: number;
}

const ScanUpload: React.FC = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<Scan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>({ open: false, scanId: '', filename: '' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState>({ open: false, scanId: '', anchorY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const { success, error } = useToast();
  const { push: pushNotification } = useNotifications();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Close action menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenu(prev => ({ ...prev, open: false }));
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    loadScans(true); // Initial load with loading spinner
    
    // Start polling for scan status updates every 2 seconds
    pollIntervalRef.current = setInterval(() => {
      loadScans(false); // Silent background refresh
    }, 2000);
    
    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [page]);

  const loadScans = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const response = await apiClient.listScans({ skip: page * limit, limit });
      setScans(response.items);
      setTotal(response.total);
    } catch (error) {
      error('Failed to load scans');
      console.error('Error loading scans:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const validateFile = (file: File): string | null => {
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      return `File too large (${fileSizeMB.toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_MB}MB`;
    }
    
    return null;
  };

  const handleUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      error(validationError);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setScanSummary(null);

      const scan = await apiClient.uploadScan(file, (progress) => {
        setUploadProgress(Math.round(progress));
      });

      success(`File "${file.name}" uploaded successfully`);
      setUploadProgress(0);

      // Reload scans list immediately
      await loadScans(false);

      // Poll for completion then fetch vuln counts for summary card
      const fetchAllVulnerabilitiesForScan = async (scanId: string) => {
        const pageSize = 100;
        let skip = 0;
        let total = 0;
        const items: any[] = [];

        do {
          const response = await apiClient.listVulnerabilities({ scan_id: scanId, limit: pageSize, skip });
          total = response.total;
          items.push(...response.items);
          skip += response.items.length;

          if (response.items.length === 0) {
            break;
          }
        } while (items.length < total);

        return { total, items };
      };

      const pollForSummary = async (attempts = 0) => {
        if (attempts > 30) return; // give up after ~60s
        try {
          const resp = await apiClient.listVulnerabilities({ scan_id: scan.id, limit: 1 });
          const allVulns = await fetchAllVulnerabilitiesForScan(scan.id);
          if (allVulns.total > 0) {
            const counts = { critical: 0, high: 0, medium: 0, low: 0 };
            allVulns.items.forEach((v: any) => {
              const sev = v.scanner_severity as keyof typeof counts;
              if (sev in counts) counts[sev]++;
            });
            setScanSummary({
              scanId: scan.id,
              filename: file.name,
              ...counts,
              total: allVulns.total,
            });
            pushNotification('scan_complete', `Scan complete: ${file.name}`, `${allVulns.total} vulnerabilities found (${counts.critical} critical, ${counts.high} high)`, `/vulnerabilities?scan_id=${scan.id}`);
          } else {
            setTimeout(() => pollForSummary(attempts + 1), 2000);
          }
        } catch {
          setTimeout(() => pollForSummary(attempts + 1), 2000);
        }
      };
      setTimeout(() => pollForSummary(), 3000);

    } catch (err: any) {
      error(err.message || 'Upload failed');
      pushNotification('scan_failed', 'Upload failed', err.message || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    // Reset input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

  const openDeleteDialog = (scanId: string, filename: string) => {
    setDeleteDialog({ open: true, scanId, filename });
  };

  const handleDelete = async () => {
    const { scanId, filename } = deleteDialog;
    setDeletingId(scanId);
    setDeleteDialog({ open: false, scanId: '', filename: '' });
    try {
      await apiClient.deleteScan(scanId);
      success('Scan deleted successfully');
      await loadScans(false);
    } catch (err: any) {
      error(err.message || 'Failed to delete scan');
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRescan = (scan: Scan) => {
    setActionMenu(prev => ({ ...prev, open: false }));
    success(`Re-scan queued for "${scan.filename}" — feature coming soon`);
    pushNotification('info', 'Re-scan queued', `"${scan.filename}" will be re-processed once the backend endpoint is available.`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'running':
      case 'pending':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'uploaded':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return 'check_circle';
      case 'running':
        return 'sync';
      case 'pending':
        return 'schedule';
      case 'failed':
        return 'error';
      case 'uploaded':
        return 'upload_file';
      default:
        return 'help';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };
  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col gap-1">
            <h2 className="text-white text-3xl font-bold leading-tight tracking-tight">Scan Upload</h2>
            <div className="flex items-center gap-2 text-secondary text-sm">
              <span className="material-symbols-outlined text-sm">upload_file</span>
              <span>Import vulnerability scan files</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => loadScans(true)}
              disabled={loading}
              className="flex items-center justify-center gap-2 h-10 px-4 bg-surface-3 hover:bg-border text-white text-sm font-bold rounded-lg border border-border transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-8 pb-20 overflow-y-auto custom-scroll">
        <div className="flex flex-col gap-8 max-w-[1400px] mx-auto w-full">
          {/* Upload Area */}
          <div className="w-full">
            <label
              htmlFor="file-upload"
              className={`group relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
                dragActive
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 bg-surface/50 hover:bg-surface-3/50'
              } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <>
                    <div className="p-4 rounded-full bg-surface-3 mb-4">
                      <span className="material-symbols-outlined text-4xl text-primary animate-pulse">upload</span>
                    </div>
                    <p className="mb-2 text-lg text-white font-medium">Uploading... {uploadProgress}%</p>
                    <div className="w-64 h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-surface-3 group-hover:bg-border mb-4 transition-colors">
                      <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                    </div>
                    <p className="mb-2 text-lg text-white font-medium">
                      <span className="font-bold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-secondary">
                      Supported formats: {ALLOWED_EXTENSIONS.join(', ')}
                    </p>
                    <p className="mt-2 text-xs text-secondary/70 font-mono">
                      Max file size: {MAX_FILE_SIZE_MB}MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                className="hidden"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Scan Summary Card — shown after successful parse */}
          {scanSummary && (
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-green-500/30 bg-green-500/5 px-5 py-4 animate-fade-in">
              <span className="material-symbols-outlined text-green-400 text-3xl shrink-0">check_circle</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate mb-1">
                  Scan parsed: <span className="text-secondary font-normal">{scanSummary.filename}</span>
                </p>
                <div className="flex flex-wrap gap-3 text-xs font-bold">
                  <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                    {scanSummary.critical} Critical
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/25">
                    {scanSummary.high} High
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                    {scanSummary.medium} Medium
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-3 text-secondary border border-border">
                    {scanSummary.low} Low
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/vulnerabilities?scan_id=${scanSummary.scanId}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-blue-600 text-on-primary text-xs font-bold rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  View Vulnerabilities
                </button>
                <button
                  onClick={() => setScanSummary(null)}
                  className="p-1.5 rounded-lg hover:bg-border text-secondary hover:text-white transition-colors"
                  title="Dismiss"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          )}

          {/* Recent Uploads Table */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-xl font-bold">Recent Uploads</h3>
              <span className="text-secondary text-sm">{scans.length} scans</span>
            </div>

            {loading ? (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <TableSkeleton rows={10} />
              </div>
            ) : scans.length === 0 ? (
              <EmptyState
                variant="no-scans"
                actions={[
                  {
                    label: 'Upload your first scan',
                    icon: 'cloud_upload',
                    onClick: () => fileInputRef.current?.click(),
                  },
                ]}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-surface">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-3 text-secondary text-xs font-semibold uppercase tracking-wider border-b border-border">
                        <th className="px-6 py-4">Filename</th>
                        <th className="px-6 py-4">Size</th>
                        <th className="px-6 py-4">Upload Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {scans.map((scan) => (
                        <tr 
                          key={scan.id} 
                          onClick={() => navigate(`/vulnerabilities?scan_id=${scan.id}`)}
                          className="group hover:bg-surface-3/50 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded bg-surface-3 text-secondary">
                                <span className="material-symbols-outlined text-[20px]">description</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-white font-medium text-sm">{scan.filename}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-secondary text-sm">{scan.file_size_mb} MB</span>
                          </td>
                          <td className="px-6 py-4 text-secondary text-sm font-mono">{formatDate(scan.uploaded_at)}</td>
                          <td className="px-6 py-4">
                            {scan.job ? (
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(scan.job.status)}`}>
                                  {scan.job.status === 'running' && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                    </span>
                                  )}
                                  {scan.job.status !== 'running' && <span className="material-symbols-outlined text-sm">{getStatusIcon(scan.job.status)}</span>}
                                  {scan.job.status.toUpperCase()}
                                </span>
                                {scan.job.status === 'running' && scan.job.progress !== null && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-cyan-500 transition-all duration-300"
                                        style={{ width: `${scan.job.progress}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-cyan-400 font-mono">{scan.job.progress}%</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(scan.status)}`}>
                                <span className="material-symbols-outlined text-sm">{getStatusIcon(scan.status)}</span>
                                {scan.status.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenu({ open: true, scanId: scan.id, anchorY: e.currentTarget.getBoundingClientRect().bottom });
                              }}
                              className={`text-secondary hover:text-white p-2 rounded hover:bg-border transition-colors ${deletingId === scan.id ? 'opacity-50 pointer-events-none' : ''}`}
                              title="Actions"
                            >
                              {deletingId === scan.id
                                ? <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                                : <span className="material-symbols-outlined text-[20px]">more_vert</span>
                              }
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                {total > limit && (
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-surface-3/30">
                    <div className="text-sm text-secondary">
                      Showing {page * limit + 1}-{Math.min((page + 1) * limit, total)} of {total} scans
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 text-sm bg-surface border border-border rounded text-white hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1.5 text-sm text-white">
                        Page {page + 1} of {Math.ceil(total / limit)}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(Math.ceil(total / limit) - 1, page + 1))}
                        disabled={page >= Math.ceil(total / limit) - 1}
                        className="px-3 py-1.5 text-sm bg-surface border border-border rounded text-white hover:bg-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row Action Menu */}
      {actionMenu.open && (
        <div
          ref={actionMenuRef}
          className="fixed z-50 w-44 rounded-xl border border-border bg-surface shadow-2xl overflow-hidden"
          style={{ top: Math.min(actionMenu.anchorY + 4, window.innerHeight - 160), right: 24 }}
        >
          {(() => {
            const scan = scans.find(s => s.id === actionMenu.scanId);
            if (!scan) return null;
            return (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMenu(p => ({ ...p, open: false })); navigate(`/vulnerabilities?scan_id=${scan.id}`); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-surface-3 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">bug_report</span>
                  View Vulns
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMenu(p => ({ ...p, open: false })); navigate(`/reports?scanId=${scan.id}`); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-surface-3 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">description</span>
                  View Report
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRescan(scan); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-white hover:bg-surface-3 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px] text-secondary">replay</span>
                  Re-scan
                </button>
                <div className="h-px bg-border mx-2" />
                <button
                  onClick={(e) => { e.stopPropagation(); setActionMenu(p => ({ ...p, open: false })); openDeleteDialog(scan.id, scan.filename); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex items-center gap-3">
              <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
              <h3 className="text-white font-bold text-base">Delete Scan</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-secondary text-sm leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">"{deleteDialog.filename}"</span>?
                This will also remove all associated vulnerabilities. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteDialog({ open: false, scanId: '', filename: '' })}
                className="px-4 py-2 rounded-lg text-sm font-medium text-secondary hover:text-white bg-surface-3 hover:bg-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanUpload;
