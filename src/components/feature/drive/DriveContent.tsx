import React from 'react';

interface DriveContentProps {
  children: React.ReactNode;
  className?: string;
}

export default function DriveContent({ children, className = '' }: DriveContentProps) {
  return (
    <div className={`app-stage-content ${className}`}>
      {children}
    </div>
  );
}
