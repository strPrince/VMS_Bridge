import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiClient } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

type SettingsSection = 'profile' | 'security' | 'jira' | 'preferences';

interface NavItem {
  id: SettingsSection;
  label: string;
  icon: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile',     label: 'Profile',          icon: 'person',          description: 'Personal info & avatar'      },
  { id: 'security',    label: 'Security',          icon: 'lock',            description: 'Password & access'           },
  { id: 'jira',        label: 'Jira Integration',  icon: 'integration_instructions', description: 'Connect your issue tracker' },
  { id: 'preferences', label: 'Preferences',       icon: 'tune',            description: 'Theme & display options'     },
];

const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  
  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  
  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Jira state
  const [jiraApiToken, setJiraApiToken] = useState('');
  const [jiraBaseUrl, setJiraBaseUrl] = useState('');
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [isJiraLoading, setIsJiraLoading] = useState(false);
  const [isJiraUrlLoading, setIsJiraUrlLoading] = useState(false);
  const [newProjectKey, setNewProjectKey] = useState('');
  const [isAddingProject, setIsAddingProject] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setJiraBaseUrl(user.jira_base_url || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileLoading(true);
    
    try {
      await apiClient.updateProfile({ full_name: fullName, email });
      await refreshUser();
      success('Profile updated successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      toastError('Password must be at least 8 characters');
      return;
    }
    
    setIsPasswordLoading(true);
    
    try {
      await apiClient.updatePassword(currentPassword, newPassword);
      success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleJiraUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jiraApiToken.trim()) {
      toastError('Jira API token is required');
      return;
    }
    
    setIsJiraLoading(true);
    
    try {
      await apiClient.updateJiraCredentials(jiraApiToken);
      await refreshUser();
      success('Jira credentials updated successfully');
      setJiraApiToken('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update Jira credentials');
    } finally {
      setIsJiraLoading(false);
    }
  };

  const handleJiraUrlUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!jiraBaseUrl.trim()) {
      toastError('Jira URL is required');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(jiraBaseUrl);
    } catch {
      toastError('Please enter a valid URL (e.g., https://example.atlassian.net)');
      return;
    }
    
    setIsJiraUrlLoading(true);
    
    try {
      await apiClient.updateJiraUrl(jiraBaseUrl);
      await refreshUser();
      success('Jira URL updated successfully');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update Jira URL');
    } finally {
      setIsJiraUrlLoading(false);
    }
  };

  const handleAddProjectKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProjectKey.trim()) {
      toastError('Project key is required');
      return;
    }
    
    // Validate project key format (uppercase alphanumeric)
    const keyRegex = /^[A-Z][A-Z0-9]{1,9}$/;
    if (!keyRegex.test(newProjectKey.toUpperCase())) {
      toastError('Invalid project key format (e.g., PROJ, DEV)');
      return;
    }
    
    setIsAddingProject(true);
    
    try {
      await apiClient.addJiraProject(newProjectKey.toUpperCase());
      await refreshUser();
      success(`Project ${newProjectKey.toUpperCase()} added successfully`);
      setNewProjectKey('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to add project key');
    } finally {
      setIsAddingProject(false);
    }
  };

  const handleRemoveProjectKey = async (projectKey: string) => {
    try {
      await apiClient.removeJiraProject(projectKey);
      await refreshUser();
      success(`Project ${projectKey} removed successfully`);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to remove project key');
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection)!;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Page header */}
      <header className="shrink-0 px-8 py-5 border-b border-border bg-background/95 backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
        <p className="text-secondary text-sm mt-1">Manage your account, integrations and preferences.</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar nav ── */}
        <nav className="w-64 shrink-0 border-r border-border bg-surface h-full overflow-y-auto custom-scroll py-4 px-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary px-3 mb-3">Sections</p>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'text-secondary hover:bg-surface-2 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-[20px] shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-secondary group-hover:text-white'}`}>
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-tight ${isActive ? 'text-primary' : ''}`}>{item.label}</p>
                      <p className="text-xs text-secondary truncate mt-0.5 leading-tight">{item.description}</p>
                    </div>
                    {isActive && (
                      <span className="ml-auto material-symbols-outlined text-[16px] text-primary shrink-0">chevron_right</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Quick user info at bottom of nav */}
          <div className="mt-6 mx-1 p-3 rounded-lg bg-surface-2 border border-border">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-full bg-linear-to-tr from-primary to-blue-400 flex items-center justify-center text-on-primary text-sm font-bold shrink-0">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-secondary truncate">{user?.email || ''}</p>
              </div>
            </div>
            {user?.role && (
              <span className="mt-2 inline-block px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20 capitalize">
                {user.role}
              </span>
            )}
          </div>
        </nav>

        {/* ── Main content area ── */}
        <div className="flex-1 overflow-y-auto p-8 custom-scroll">
          {/* Section breadcrumb / title */}
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-[22px]">{currentNav.icon}</span>
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">{currentNav.label}</h2>
              <p className="text-secondary text-xs">{currentNav.description}</p>
            </div>
          </div>

          <div className="max-w-3xl flex flex-col gap-6 pb-10">

            {/* ── PROFILE SECTION ── */}
            {activeSection === 'profile' && (
              <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border flex justify-between items-center bg-surface-2">
                  <div>
                    <h3 className="text-base font-semibold text-white">Personal Information</h3>
                    <p className="text-secondary text-sm">Update your public profile and contact details.</p>
                  </div>
                </div>
                <form onSubmit={handleProfileUpdate} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 flex items-center gap-4 mb-2">
                    <div className="size-16 rounded-full border-2 border-border shadow-md bg-linear-to-tr from-primary to-blue-400 flex items-center justify-center text-on-primary text-2xl font-bold">
                      {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user?.full_name}</p>
                      <p className="text-xs text-secondary">{user?.email}</p>
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-white">Full Name</span>
                    <input
                      className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 text-sm"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-white">Email Address</span>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 pr-10 text-sm"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      {user?.is_active && (
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-[20px]">check_circle</span>
                      )}
                    </div>
                  </label>

                  <div className="col-span-1 md:col-span-2 flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isProfileLoading}
                      className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-on-primary rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                      {isProfileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ── SECURITY SECTION ── */}
            {activeSection === 'security' && (
              <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border bg-surface-2">
                  <h3 className="text-base font-semibold text-white">Change Password</h3>
                  <p className="text-secondary text-sm">Update your password to keep your account secure.</p>
                </div>
                <form onSubmit={handlePasswordUpdate} className="p-6 grid grid-cols-1 gap-6">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-white">Current Password</span>
                    <div className="relative">
                      <input
                        className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 pr-10 text-sm"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showCurrentPassword ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </div>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-white">New Password</span>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 pr-10 text-sm"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showNewPassword ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>
                      </div>
                    </label>

                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-white">Confirm New Password</span>
                      <input
                        className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 text-sm"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isPasswordLoading}
                      className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-on-primary rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                    >
                      {isPasswordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ── JIRA INTEGRATION SECTION ── */}
            {activeSection === 'jira' && (
              <>
                {/* Connection status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
                  user?.jira_project_keys && user.jira_project_keys.length > 0
                    ? 'bg-green-500/10 border-green-500/25 text-green-400'
                    : 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
                }`}>
                  <div className={`size-2 rounded-full shrink-0 ${user?.jira_project_keys && user.jira_project_keys.length > 0 ? 'bg-green-400' : 'bg-yellow-400'}`} />
                  {user?.jira_project_keys && user.jira_project_keys.length > 0
                    ? `Connected — ${user.jira_project_keys.length} project${user.jira_project_keys.length > 1 ? 's' : ''} linked`
                    : 'Not connected — configure your Jira credentials below'}
                </div>

                {/* Base URL */}
                <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border bg-surface-2 flex items-center gap-3">
                    <div className="size-7 rounded bg-[#0052CC] flex items-center justify-center text-white font-bold text-xs">J</div>
                    <div>
                      <h3 className="text-base font-semibold text-white">Jira Instance URL</h3>
                      <p className="text-secondary text-sm">Your Atlassian workspace base URL.</p>
                    </div>
                  </div>
                  <form onSubmit={handleJiraUrlUpdate} className="p-6">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-white">Base URL</span>
                      <div className="flex gap-3">
                        <input
                          className="flex-1 rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 text-sm"
                          type="url"
                          value={jiraBaseUrl}
                          onChange={(e) => setJiraBaseUrl(e.target.value)}
                          placeholder="https://your-domain.atlassian.net"
                        />
                        <button
                          type="submit"
                          disabled={isJiraUrlLoading}
                          className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-on-primary rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 whitespace-nowrap"
                        >
                          {isJiraUrlLoading ? 'Saving...' : 'Save URL'}
                        </button>
                      </div>
                      <p className="text-xs text-secondary">e.g. https://example.atlassian.net</p>
                    </label>
                  </form>
                </section>

                {/* API Token */}
                <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border bg-surface-2">
                    <h3 className="text-base font-semibold text-white">API Credentials</h3>
                    <p className="text-secondary text-sm">Authenticate with your Jira personal API token.</p>
                  </div>
                  <form onSubmit={handleJiraUpdate} className="p-6 flex flex-col gap-5">
                    <label className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-white">Jira API Token</span>
                      <div className="relative">
                        <input
                          className="w-full rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 pr-10 text-sm"
                          type={showJiraToken ? 'text' : 'password'}
                          value={jiraApiToken}
                          onChange={(e) => setJiraApiToken(e.target.value)}
                          placeholder="Paste your Jira API token here"
                        />
                        <button
                          type="button"
                          onClick={() => setShowJiraToken(!showJiraToken)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showJiraToken ? 'visibility' : 'visibility_off'}
                          </span>
                        </button>
                      </div>
                      <p className="text-xs text-secondary">Generate a token from Jira → Account Settings → Security.</p>
                    </label>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isJiraLoading}
                        className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-on-primary rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
                      >
                        {isJiraLoading ? 'Updating...' : 'Update Credentials'}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Project Keys */}
                <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border bg-surface-2">
                    <h3 className="text-base font-semibold text-white">Project Keys</h3>
                    <p className="text-secondary text-sm">Map vulnerability tickets to specific Jira projects.</p>
                  </div>
                  <div className="p-6 flex flex-col gap-5">
                    <form onSubmit={handleAddProjectKey} className="flex gap-3">
                      <input
                        className="flex-1 rounded-lg border-border bg-surface-2 text-white focus:border-primary focus:ring-primary h-11 px-4 text-sm uppercase"
                        type="text"
                        value={newProjectKey}
                        onChange={(e) => setNewProjectKey(e.target.value)}
                        placeholder="Project key (e.g. PROJ, DEV)"
                        maxLength={10}
                      />
                      <button
                        type="submit"
                        disabled={isAddingProject}
                        className="px-5 py-2.5 bg-primary hover:bg-blue-600 text-on-primary rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        {isAddingProject ? 'Adding...' : 'Add'}
                      </button>
                    </form>

                    {user?.jira_project_keys && user.jira_project_keys.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
                          Connected Projects ({user.jira_project_keys.length})
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {user.jira_project_keys.map((key) => (
                            <div
                              key={key}
                              className="group flex items-center gap-2 px-3 py-2 bg-surface-2 border border-border rounded-lg text-sm text-white hover:border-primary/50 transition-colors"
                            >
                              <span className="font-mono font-medium">{key}</span>
                              <button
                                onClick={() => handleRemoveProjectKey(key)}
                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                                title="Remove project"
                              >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 bg-surface-2 rounded-lg border border-dashed border-border">
                        <span className="material-symbols-outlined text-4xl text-secondary">folder_open</span>
                        <p className="text-secondary text-sm mt-2">No project keys configured yet.</p>
                        <p className="text-secondary text-xs mt-1">Add keys above to enable ticket creation.</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* ── PREFERENCES SECTION ── */}
            {activeSection === 'preferences' && (
              <>
                {/* Theme */}
                <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border bg-surface-2">
                    <h3 className="text-base font-semibold text-white">Appearance</h3>
                    <p className="text-secondary text-sm">Choose the theme that feels right for you.</p>
                  </div>
                  <div className="p-6 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-white">Color Theme</p>
                      <p className="text-xs text-secondary">Switch between light and dark mode.</p>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        aria-pressed={theme === 'dark'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          theme === 'dark' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">dark_mode</span>
                        Dark
                      </button>
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        aria-pressed={theme === 'light'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          theme === 'light' ? 'bg-primary text-on-primary shadow-sm' : 'text-secondary hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">light_mode</span>
                        Light
                      </button>
                    </div>
                  </div>
                </section>

                {/* Notification / display hints */}
                <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border bg-surface-2">
                    <h3 className="text-base font-semibold text-white">Display</h3>
                    <p className="text-secondary text-sm">Control how information is presented.</p>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      { label: 'Compact sidebar',    desc: 'Show only icons in the navigation sidebar.' },
                      { label: 'Show severity badges', desc: 'Display colored severity labels on vulnerability rows.' },
                      { label: 'Auto-refresh dashboards', desc: 'Automatically refresh data every 60 seconds.' },
                    ].map((pref) => (
                      <div key={pref.label} className="flex items-center justify-between p-5 gap-4">
                        <div>
                          <p className="text-sm font-medium text-white">{pref.label}</p>
                          <p className="text-xs text-secondary">{pref.desc}</p>
                        </div>
                        {/* Toggle placeholder — wire to real state when backend supports it */}
                        <button
                          type="button"
                          className="w-11 h-6 rounded-full bg-surface-2 border border-border flex items-center px-0.5 transition-colors relative shrink-0 cursor-not-allowed opacity-50"
                          title="Coming soon"
                          disabled
                        >
                          <span className="size-5 rounded-full bg-secondary block transition-transform" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
