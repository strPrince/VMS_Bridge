import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onClose, collapsed = false, onToggleCollapse }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllRead, markRead, dismiss } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ bottom: number; left: number } | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const isActive = (path: string) => location.pathname === path;

  // Close bell panel on outside click — also mark all as read when closing
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        if (bellOpen) {
          setBellOpen(false);
          markAllRead();
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [bellOpen, markAllRead]);

  const handleBellClick = () => {
    if (bellOpen) {
      setBellOpen(false);
      markAllRead();
    } else {
      const rect = bellRef.current?.getBoundingClientRect();
      if (rect) {
        setPanelPos({
          bottom: window.innerHeight - rect.top + 8,
          left: rect.left,
        });
      }
      setBellOpen(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/' },
    { name: 'Scans', icon: 'radar', path: '/scans' },
    { name: 'Vulnerabilities', icon: 'bug_report', path: '/vulnerabilities' },
    { name: 'Reports', icon: 'description', path: '/reports' },
    { name: 'Settings', icon: 'settings', path: '/settings' },
    { name: 'Help', icon: 'support_agent', path: '/help' },
    user?.is_admin ? { name: 'Admin Panel', icon: 'shield_admin', path: '/admin' } : null,
  ].filter(Boolean) as any[];

  return (
    <div
      className={`flex flex-col bg-surface border-r border-border shrink-0 z-20 h-full lg:h-screen transition-all duration-300 ease-in-out ${
        collapsed ? 'w-17' : 'w-64'
      }`}
    >
      {/* Mobile close button */}
      <div className="lg:hidden flex justify-end p-4">
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-border transition-colors">
          <span className="material-symbols-outlined text-white">close</span>
        </button>
      </div>

      <div className="flex h-full flex-col justify-between p-3 overflow-hidden">
        <div className="flex flex-col gap-4">
          {/* Logo + collapse toggle */}
          <div className={`flex items-center px-1 mb-1 ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && (
              <div className="flex gap-3 items-center">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                  <img src="/VMS_logo.png" alt="VMS Logo" className="w-7 h-7 object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-white text-base font-bold leading-normal truncate">VMS Bridge</h1>
                  <p className="text-secondary text-xs font-normal leading-normal truncate">Vuln. Management Bridge</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-9 bg-primary/10 flex items-center justify-center overflow-hidden">
                <img src="/VMS_logo.png" alt="VMS Logo" className="w-6 h-6 object-contain" />
              </div>
            )}
          </div>

          {/* Toggle collapse button — desktop only */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-3 text-secondary hover:text-white transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[22px] transition-transform duration-300" style={{ transform: collapsed ? 'scaleX(-1)' : 'scaleX(1)' }}>
              menu_open
            </span>
            {!collapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          {/* Nav Items */}
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive(item.path)
                    ? 'bg-surface-3 text-white'
                    : 'hover:bg-surface-3 text-secondary hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined text-[24px] shrink-0 ${
                  isActive(item.path) ? 'text-white' : 'text-secondary group-hover:text-white'
                }`}>
                  {item.icon}
                </span>
                {!collapsed && <p className="text-sm font-medium leading-normal truncate">{item.name}</p>}
              </Link>
            ))}
          </div>
        </div>

        {/* User Profile */}
        <div className="flex flex-col gap-2">
          <div className="h-px bg-border w-full"></div>

          {/* Notification Bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={handleBellClick}
              title="Notifications"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-3 text-secondary hover:text-white transition-colors w-full ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <div className="relative shrink-0">
                <span className="material-symbols-outlined text-[24px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="text-sm font-medium">Notifications</span>}
            </button>

            {/* Bell Panel — rendered fixed so it escapes overflow-hidden containers */}
            {bellOpen && panelPos && (
              <div
                className="fixed z-9999 w-80 rounded-xl border border-border bg-surface-3 shadow-2xl overflow-hidden"
                style={{ bottom: panelPos.bottom, left: panelPos.left }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h4 className="text-white text-sm font-bold">Notifications</h4>
                  <button onClick={() => { markAllRead(); }} className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-72 overflow-y-auto custom-scroll divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-secondary gap-2">
                      <span className="material-symbols-outlined text-3xl opacity-40">notifications_off</span>
                      <p className="text-sm">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n: AppNotification) => (
                      <div
                        key={n.id}
                        className={`flex gap-3 px-4 py-3 transition-colors ${n.read ? 'opacity-60' : 'bg-primary/5'} hover:bg-surface`}
                      >
                        <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                          n.type === 'scan_complete' ? 'text-green-400' :
                          n.type === 'scan_failed' ? 'text-red-400' :
                          n.type === 'jira_ticket' ? 'text-blue-400' : 'text-secondary'
                        }`}>
                          {n.type === 'scan_complete' ? 'check_circle' :
                           n.type === 'scan_failed' ? 'error' :
                           n.type === 'jira_ticket' ? 'confirmation_number' : 'info'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-semibold truncate">{n.title}</p>
                          <p className="text-secondary text-xs mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-secondary/50 text-[10px] mt-1">
                            {n.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => dismiss(n.id)}
                          className="text-secondary hover:text-white shrink-0 self-start"
                          title="Dismiss"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Info */}
          {!collapsed ? (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="size-8 rounded-full bg-linear-to-tr from-primary to-blue-400 flex items-center justify-center text-on-primary text-sm font-bold shrink-0">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-secondary text-xs truncate">{user?.email || ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center py-2" title={user?.full_name || 'User'}>
              <div className="size-8 rounded-full bg-linear-to-tr from-primary to-blue-400 flex items-center justify-center text-on-primary text-sm font-bold">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors group ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[24px] shrink-0">logout</span>
            {!collapsed && <p className="text-sm font-medium leading-normal">Logout</p>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

