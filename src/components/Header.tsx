'use client';

import { ThemeToggle } from './ThemeToggle';
import { LogoutButton } from './LogoutButton';

export function Header() {
  return (
    <header className="header">
      <ThemeToggle />
      <LogoutButton />
    </header>
  );
}
