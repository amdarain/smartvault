import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, className, padding = 'md', hover = false, onClick }: CardProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm',
        paddingMap[padding],
        hover && 'transition-shadow hover:shadow-md cursor-pointer',
        onClick && 'text-left w-full',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </Tag>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon, iconColor = 'text-emerald-600', trend, onClick }: StatCardProps) {
  return (
    <Card hover={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 truncate">{subtitle}</p>
          )}
          {trend && (
            <p className={clsx('mt-1 text-xs font-medium', trend.value >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
            </p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex-shrink-0 ml-4', iconColor)}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
