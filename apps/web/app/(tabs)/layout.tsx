"use client";

import type { ReactNode } from "react";

import { BottomNav } from "../../components/BottomNav";
import { useDemoSession } from "../../lib/demo";

export default function TabsLayout({ children }: { children: ReactNode }) {
  const session = useDemoSession();

  return (
    <main className="shell shell--tabs">
      {children}
      {session.tabsUnlocked ? <BottomNav /> : null}
    </main>
  );
}
