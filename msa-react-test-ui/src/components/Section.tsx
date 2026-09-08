import type { PropsWithChildren, ReactNode } from 'react';

export function Section({ title, actions, children }: PropsWithChildren<{ title: string; actions?: ReactNode }>) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <div>{actions}</div>
      </div>
      {children}
    </section>
  );
}
