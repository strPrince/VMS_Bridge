import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, Scan, Vulnerability } from '../services/api';

interface CommandItem {
  id: string;
  icon: string;
  label: string;
  sublabel?: string;
  group: 'Pages' | 'Scans' | 'Vulnerabilities';
  action: () => void;
}

const STATIC_PAGES: Omit<CommandItem, 'action'>[] = [
  { id: 'page-dashboard',      icon: 'dashboard',    label: 'Dashboard',       group: 'Pages' },
  { id: 'page-scans',          icon: 'radar',        label: 'Scans',           group: 'Pages' },
  { id: 'page-vulnerabilities',icon: 'bug_report',   label: 'Vulnerabilities', group: 'Pages' },
  { id: 'page-reports',        icon: 'description',  label: 'Reports',         group: 'Pages' },
  { id: 'page-settings',       icon: 'settings',     label: 'Settings',        group: 'Pages' },
  { id: 'page-help',           icon: 'support_agent',label: 'Help / Support',  group: 'Pages' },
];

const PAGE_ROUTES: Record<string, string> = {
  'page-dashboard':       '/',
  'page-scans':           '/scans',
  'page-vulnerabilities': '/vulnerabilities',
  'page-reports':         '/reports',
  'page-settings':        '/settings',
  'page-help':            '/help',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scans, setScans] = useState<Scan[]>([]);
  const [vulns, setVulns] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch recent scans + vulns once when palette opens
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIdx(0);
    setTimeout(() => inputRef.current?.focus(), 50);

    const load = async () => {
      setLoading(true);
      try {
        const [s, v] = await Promise.all([
          apiClient.listScans({ limit: 20, skip: 0 }),
          apiClient.listVulnerabilities({ limit: 20, skip: 0 }),
        ]);
        setScans(s.items);
        setVulns(v.items);
      } catch { /* silent */ }
      setLoading(false);
    };
    load();
  }, [open]);

  const go = useCallback((action: () => void) => {
    action();
    onClose();
  }, [onClose]);

  const items = useMemo((): CommandItem[] => {
    const pages: CommandItem[] = STATIC_PAGES.map(p => ({
      ...p,
      action: () => navigate(PAGE_ROUTES[p.id]),
    }));

    const scanItems: CommandItem[] = scans.map(s => ({
      id: `scan-${s.id}`,
      icon: 'radar',
      label: s.filename,
      sublabel: `Scan · ${s.status}`,
      group: 'Scans' as const,
      action: () => navigate(`/vulnerabilities?scan_id=${s.id}`),
    }));

    const vulnItems: CommandItem[] = vulns.map(v => ({
      id: `vuln-${v.id}`,
      icon: 'bug_report',
      label: v.title,
      sublabel: `${v.scanner_severity.toUpperCase()} · ${v.cve_id ?? 'No CVE'}`,
      group: 'Vulnerabilities' as const,
      action: () => navigate(`/vulnerabilities`),
    }));

    const all = [...pages, ...scanItems, ...vulnItems];

    if (!query.trim()) return all.slice(0, 40);

    const q = query.toLowerCase();
    return all.filter(
      item =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [query, scans, vulns, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, items.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter') { e.preventDefault(); if (items[activeIdx]) go(items[activeIdx].action); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, items, activeIdx, onClose, go]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Reset active index when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  // Group items for display
  const groups = ['Pages', 'Scans', 'Vulnerabilities'] as const;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl mx-4 rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="material-symbols-outlined text-secondary text-[22px]">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Go to page, scan, vulnerability…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-secondary/50"
          />
          {loading && <span className="material-symbols-outlined text-secondary text-[18px] animate-spin">progress_activity</span>}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-secondary border border-border font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto custom-scroll">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-secondary gap-2">
              <span className="material-symbols-outlined text-3xl opacity-40">search_off</span>
              <p className="text-sm">No results for "{query}"</p>
            </div>
          ) : (
            (() => {
              let globalIdx = 0;
              return groups.map(group => {
                const groupItems = items.filter(i => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group}>
                    <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-secondary/60 bg-surface-3/30">
                      {group}
                    </div>
                    {groupItems.map(item => {
                      const idx = globalIdx++;
                      const isActive = idx === activeIdx;
                      return (
                        <button
                          key={item.id}
                          data-idx={idx}
                          onMouseEnter={() => setActiveIdx(idx)}
                          onClick={() => go(item.action)}
                          className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                            isActive ? 'bg-primary/15' : 'hover:bg-surface-3/50'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? 'text-primary' : 'text-secondary'}`}>
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[11px] text-secondary truncate">{item.sublabel}</p>
                            )}
                          </div>
                          {isActive && (
                            <kbd className="shrink-0 px-1.5 py-0.5 rounded text-[10px] text-secondary border border-border font-mono">↵</kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              });
            })()
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-surface-3/30 text-[11px] text-secondary">
          <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border font-mono">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border font-mono">↵</kbd> Open</span>
          <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-border font-mono">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
