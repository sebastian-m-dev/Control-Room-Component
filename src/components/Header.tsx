'use client';

import { ThemeToggle } from './ThemeToggle';
import { DemoModeToggle } from './DemoModeToggle';
import { LogoutButton } from './LogoutButton';

export function Header() {
  return (
    <header className="header">
      <ThemeToggle />
      <LogoutButton />
    </header>
  );
}
