import type { ReactNode } from 'react';

interface ChapterSectionProps {
  index: string;
  label: string;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  id?: string;
}

export default function ChapterSection({
  index,
  label,
  title,
  description,
  children,
  id,
}: ChapterSectionProps) {
  return (
    <section className="landing-chapter" id={id}>
      {(title || description) && (
        <header className="landing-chapter-head">
          <div className="landing-chapter-label">
            <strong>{index}</strong>
            <span>{label}</span>
          </div>
          <div className="landing-chapter-title">
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
        </header>
      )}
      {children}
    </section>
  );
}
