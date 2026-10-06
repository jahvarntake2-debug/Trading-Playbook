import Link from 'next/link';

const links = [
  { href: '/', label: 'Home' },
  { href: '/donate', label: 'Donate supplies' },
  { href: '/request', label: 'Request supplies' },
  { href: '/impact', label: 'Our impact' },
  { href: '/how-it-works', label: 'How it works' },
];

export function SiteNav() {
  return (
    <nav className="border-b border-line bg-canvas" aria-label="Main navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-ink">
          SUPPLY<span className="text-primary">/</span>SHARE
        </Link>
        <div className="hidden items-center gap-6 text-sm font-medium text-ink/70 md:flex">
          {links.slice(1).map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-primary">
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/donate" className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-blue-600">
          Give supplies
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto border-t border-line px-6 py-3 text-sm font-medium text-ink/70 md:hidden">
        {links.slice(1).map((link) => (
          <Link key={link.href} href={link.href} className="whitespace-nowrap hover:text-primary">
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
