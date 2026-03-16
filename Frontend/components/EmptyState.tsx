import React from 'react';

// Primary colour tokens (hardcoded so SVG presentation attrs work everywhere)
const P = '#1169d4'; // rgb(17 105 212)

const c = (opacity: number) =>
  `rgba(17,105,212,${opacity})`;

// ─────────────────────────────────────────────
//  SVG Illustrations
// ─────────────────────────────────────────────

const ShieldCheckIllustration: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="52" style={{ fill: c(0.07), stroke: c(0.18) }} strokeWidth="1.5" />
    <circle cx="60" cy="60" r="36" style={{ fill: c(0.1), stroke: c(0.22) }} strokeWidth="1" />
    <path
      d="M60 30 L82 40 L82 58 C82 72 72 82 60 86 C48 82 38 72 38 58 L38 40 Z"
      style={{ fill: c(0.18), stroke: c(0.45) }}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M50 59 L57 66 L71 52"
      stroke={P}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CloudUploadIllustration: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="52" style={{ fill: c(0.07), stroke: c(0.18) }} strokeWidth="1.5" />
    <circle cx="60" cy="60" r="36" style={{ fill: c(0.1), stroke: c(0.22) }} strokeWidth="1" />
    <path
      d="M46 68 C42 68 38 64.5 38 60.5 C38 57 40.5 54 44 53.5 C44 53.3 44 53.2 44 53 C44 48 48 44 53 44 C55.5 44 57.8 45 59.3 46.8 C60.5 45.7 62.2 45 64 45 C67.9 45 71 48.1 71 52 C71 52.3 71 52.7 70.9 53 C74.3 53.8 77 56.8 77 60.5 C77 64.5 73.7 68 69.5 68 Z"
      style={{ fill: c(0.22), stroke: c(0.55) }}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M60 76 L60 60" stroke={P} strokeWidth="2" strokeLinecap="round" />
    <path d="M54 66 L60 60 L66 66" stroke={P} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SupportAgentIllustration: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="52" style={{ fill: c(0.07), stroke: c(0.18) }} strokeWidth="1.5" />
    <circle cx="60" cy="60" r="36" style={{ fill: c(0.1), stroke: c(0.22) }} strokeWidth="1" />
    <path d="M44 58 C44 49 51 42 60 42 C69 42 76 49 76 58" stroke={c(0.55)} strokeWidth="2" strokeLinecap="round" fill="none" />
    <rect x="39" y="57" width="8" height="12" rx="4" style={{ fill: c(0.3), stroke: c(0.55) }} strokeWidth="1.5" />
    <rect x="73" y="57" width="8" height="12" rx="4" style={{ fill: c(0.3), stroke: c(0.55) }} strokeWidth="1.5" />
    <path d="M47 69 C47 75 53 78 60 78 C67 78 73 75 73 69" stroke={c(0.45)} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="60" cy="80" r="2.5" style={{ fill: c(0.5) }} />
    <path d="M57 56 L63 56 M54 60 L66 60 M57 64 L63 64" stroke={P} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SearchOffIllustration: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="52" style={{ fill: c(0.07), stroke: c(0.18) }} strokeWidth="1.5" />
    <circle cx="60" cy="60" r="36" style={{ fill: c(0.1), stroke: c(0.22) }} strokeWidth="1" />
    <circle cx="56" cy="56" r="16" stroke={c(0.45)} strokeWidth="2" style={{ fill: c(0.1) }} />
    <path d="M68 68 L78 78" stroke={c(0.55)} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M50 50 L62 62 M62 50 L50 62" stroke={P} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const FilterIllustration: React.FC = () => (
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="60" cy="60" r="52" style={{ fill: c(0.07), stroke: c(0.18) }} strokeWidth="1.5" />
    <circle cx="60" cy="60" r="36" style={{ fill: c(0.1), stroke: c(0.22) }} strokeWidth="1" />
    <path d="M40 45 L80 45 L66 62 L66 76 L54 82 L54 62 Z" style={{ fill: c(0.18), stroke: c(0.5) }} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M68 50 L76 58 M76 50 L68 58" stroke={P} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─────────────────────────────────────────────
//  EmptyState Component
// ─────────────────────────────────────────────

export type EmptyStateVariant =
  | 'no-scans'
  | 'no-vulnerabilities'
  | 'no-tickets'
  | 'no-results'
  | 'no-filter-results';

interface EmptyStateAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actions?: EmptyStateAction[];
  compact?: boolean;
}

const DEFAULTS: Record<EmptyStateVariant, { title: string; description: string }> = {
  'no-scans': {
    title: 'No scans yet',
    description: 'Upload your first scan to start finding vulnerabilities in your infrastructure.',
  },
  'no-vulnerabilities': {
    title: 'No vulnerabilities found',
    description: "Your scan looks clean! No vulnerabilities matched the current criteria.",
  },
  'no-tickets': {
    title: 'No support tickets yet',
    description: 'Create a ticket whenever you need help — our team is here for you.',
  },
  'no-results': {
    title: 'No results found',
    description: 'We couldn\'t find anything matching your search. Try adjusting your query.',
  },
  'no-filter-results': {
    title: 'No matches for your filters',
    description: 'Try clearing one or more filters to broaden the results.',
  },
};

const ILLUSTRATIONS: Record<EmptyStateVariant, React.FC> = {
  'no-scans': CloudUploadIllustration,
  'no-vulnerabilities': ShieldCheckIllustration,
  'no-tickets': SupportAgentIllustration,
  'no-results': SearchOffIllustration,
  'no-filter-results': FilterIllustration,
};

const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  title,
  description,
  actions,
  compact = false,
}) => {
  const defaults = DEFAULTS[variant];
  const Illustration = ILLUSTRATIONS[variant];

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'py-10 px-4' : 'py-16 px-6'
      }`}
      role="status"
      aria-label={title ?? defaults.title}
    >
      <div className={`mb-5 opacity-90 ${compact ? 'scale-75' : ''}`}>
        <Illustration />
      </div>
      <h3 className={`font-semibold text-white mb-2 ${compact ? 'text-base' : 'text-lg'}`}>
        {title ?? defaults.title}
      </h3>
      <p className={`text-secondary max-w-xs leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
        {description ?? defaults.description}
      </p>
      {actions && actions.length > 0 && (
        <div className={`flex items-center gap-3 flex-wrap justify-center ${compact ? 'mt-4' : 'mt-6'}`}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                action.variant === 'secondary'
                  ? 'bg-surface hover:bg-border text-secondary hover:text-white border border-border'
                  : 'bg-primary hover:bg-blue-600 text-on-primary'
              }`}
            >
              {action.icon && (
                <span className="material-symbols-outlined text-base">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
