import Link from 'next/link';

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center bg-muted p-6 text-center"><div><p className="text-sm font-semibold uppercase tracking-wider text-primary">404</p><h1 className="mt-3 text-5xl">This page is not on the supply list.</h1><Link href="/" className="mt-7 inline-block rounded-md bg-primary px-6 py-4 font-semibold text-white hover:bg-blue-600">Back home</Link></div></main>;
}
