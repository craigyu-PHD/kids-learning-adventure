import type { ReactNode } from 'react';

export type GameIconTone = 'blue' | 'gold' | 'purple' | 'green' | 'orange';

export default function GameIcon({ children, tone = 'blue', size = 'md', className = '' }: {
  children: ReactNode;
  tone?: GameIconTone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return <span className={`v4-game-icon v4-glossy-icon tone-${tone} size-${size} ${className}`.trim()} aria-hidden="true">{children}</span>;
}
