import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'table' | 'list' | 'metric' | 'detail' | 'chart';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  variant = 'card', 
  count = 1,
  className = '' 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'metric':
        return (
          <div className={`flex flex-col gap-2 rounded-xl p-5 border border-border bg-surface shadow-sm animate-pulse ${className}`}>
            <div className="flex justify-between items-start">
              <div className="h-4 bg-border rounded w-24"></div>
              <div className="h-6 w-6 bg-border rounded"></div>
            </div>
            <div className="h-8 bg-border rounded w-16 mt-1"></div>
          </div>
        );

      case 'card':
        return (
          <div className={`bg-surface border border-border rounded-lg p-4 animate-pulse ${className}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 bg-border rounded w-32"></div>
              <div className="h-4 w-4 bg-border rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-border rounded w-full"></div>
              <div className="h-4 bg-border rounded w-3/4"></div>
            </div>
            <div className="flex gap-2 mt-4">
              <div className="h-6 bg-border rounded-full w-16"></div>
              <div className="h-6 bg-border rounded-full w-20"></div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div className={`bg-surface border-b border-border p-4 animate-pulse ${className}`}>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-border rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-border rounded w-48"></div>
                <div className="h-3 bg-border rounded w-32"></div>
              </div>
              <div className="h-8 bg-border rounded w-24"></div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className={`bg-surface border-b border-border p-3 animate-pulse ${className}`}>
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 bg-border rounded-full mt-1.5"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-border rounded w-full"></div>
                <div className="h-3 bg-border rounded w-2/3"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-5 bg-border rounded-full w-16"></div>
                  <div className="h-5 bg-border rounded-full w-20"></div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'detail':
        return (
          <div className={`bg-surface border border-border rounded-lg p-6 animate-pulse ${className}`}>
            <div className="space-y-4">
              <div className="h-6 bg-border rounded w-3/4"></div>
              <div className="flex gap-2">
                <div className="h-7 bg-border rounded-full w-24"></div>
                <div className="h-7 bg-border rounded-full w-20"></div>
                <div className="h-7 bg-border rounded-full w-28"></div>
              </div>
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="h-4 bg-border rounded w-full"></div>
                <div className="h-4 bg-border rounded w-full"></div>
                <div className="h-4 bg-border rounded w-5/6"></div>
              </div>
            </div>
          </div>
        );

      case 'chart':
        return (
          <div className={`bg-surface border border-border rounded-lg p-6 animate-pulse ${className}`}>
            <div className="h-5 bg-border rounded w-32 mb-4"></div>
            <div className="h-64 bg-border rounded"></div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>
          {renderSkeleton()}
        </React.Fragment>
      ))}
    </>
  );
};

// Specialized skeleton components for common use cases
export const MetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <SkeletonLoader variant="metric" count={4} />
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="space-y-0">
    <SkeletonLoader variant="table" count={rows} />
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-0">
    <SkeletonLoader variant="list" count={items} />
  </div>
);

export const DetailSkeleton: React.FC = () => (
  <div className="space-y-6">
    <SkeletonLoader variant="detail" />
    <SkeletonLoader variant="detail" />
  </div>
);

export const AppLoadingSkeleton: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-6">
      {/* Logo skeleton */}
      <div className="w-20 h-20 bg-primary/20 rounded-xl animate-pulse"></div>
      
      {/* Text skeleton */}
      <div className="space-y-2 text-center">
        <div className="h-8 bg-border rounded w-48 mx-auto animate-pulse"></div>
        <div className="h-4 bg-border rounded w-32 mx-auto animate-pulse"></div>
      </div>
      
      {/* Loading indicator */}
      <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  </div>
);

// Dashboard-specific skeleton that mimics the actual dashboard layout
export const DashboardLoadingSkeleton: React.FC = () => (
  <div className="flex flex-col h-full overflow-hidden">
    {/* Header skeleton */}
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col gap-1">
          <div className="h-8 bg-border rounded w-64 animate-pulse"></div>
          <div className="flex items-center gap-2 text-secondary text-sm">
            <div className="h-4 w-4 bg-border rounded animate-pulse"></div>
            <div className="h-4 bg-border rounded w-40 animate-pulse"></div>
            <div className="h-4 w-1 bg-border rounded animate-pulse"></div>
            <div className="h-4 bg-border rounded w-24 animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 bg-border rounded w-28 animate-pulse"></div>
          <div className="h-10 bg-primary/30 rounded w-36 animate-pulse"></div>
        </div>
      </div>
    </header>

    {/* Content skeleton */}
    <div className="flex-1 overflow-y-auto px-6 py-6 pb-20 custom-scroll">
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
        
        {/* Metrics skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonLoader variant="metric" count={4} />
        </div>

        {/* Chart & Activity Feed skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart skeleton */}
          <div className="lg:col-span-2 flex flex-col rounded-xl border border-border bg-surface p-6 h-[400px] animate-pulse">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div className="h-6 bg-border rounded w-40 mb-2"></div>
              <div className="flex items-center gap-2 text-secondary text-sm">
                <div className="h-3 bg-border rounded w-24"></div>
                <div className="h-5 bg-border rounded w-20"></div>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full h-full bg-border/20 rounded"></div>
            </div>
          </div>

          {/* Activity Feed skeleton */}
          <div className="flex flex-col rounded-xl border border-border bg-surface overflow-hidden h-[400px] animate-pulse">
            <div className="p-5 border-b border-border flex justify-between items-center bg-gradient-to-r from-surface to-surface-3/30">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 bg-border rounded"></div>
                <div className="h-6 bg-border rounded w-32"></div>
                <div className="h-5 bg-border rounded w-10"></div>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-medium">
                <div className="h-4 bg-border rounded w-16"></div>
                <div className="h-4 w-4 bg-border rounded"></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ListSkeleton items={5} />
            </div>
          </div>
        </div>

        {/* Table skeleton */}
        <div className="flex flex-col gap-4">
          <div className="h-8 bg-border rounded w-48 animate-pulse"></div>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-3 text-secondary text-xs font-semibold uppercase tracking-wider border-b border-border">
                    <th className="px-6 py-4">Severity</th>
                    <th className="px-6 py-4">Vulnerability Name</th>
                    <th className="px-6 py-4">Asset</th>
                    <th className="px-6 py-4">Discovery Time</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton rows={5} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
);
