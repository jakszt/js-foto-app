import type { ReactNode } from "react";

export default function FotoLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-stretch justify-start bg-background">
      {children}
    </main>
  );
}
