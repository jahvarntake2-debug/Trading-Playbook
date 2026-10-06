import { SiteNav } from '@/components/SiteNav';

const steps = [
  ['01', 'Schools list needs', 'A teacher or coordinator creates an inventory with exact items, quantities, and a date they are needed.'],
  ['02', 'Donors choose items', 'People browse local wishlists and pledge supplies they already own or can source through a workplace drive.'],
  ['03', 'We collect and sort', 'Our team confirms a private collection time, checks the supplies, and groups them by school.'],
  ['04', 'Schools confirm delivery', 'The school receives the supplies and shares a delivery confirmation photo so the loop is visible.'],
];

export default function HowItWorksPage() {
  return <main className="min-h-screen bg-ink text-white"><SiteNav /><section className="mx-auto max-w-5xl px-6 py-16 sm:py-24"><p className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">How it works</p><h1 className="max-w-4xl text-5xl leading-tight sm:text-7xl">A clear path from spare supplies to a full classroom shelf.</h1><div className="mt-16 grid gap-4 md:grid-cols-2">{steps.map(([number, title, description]) => <article key={number} className="rounded-lg bg-white p-7 text-ink"><span className="text-5xl font-extrabold text-primary">{number}</span><h2 className="mt-8 text-3xl">{title}</h2><p className="mt-3 text-lg leading-7 text-ink/70">{description}</p></article>)}</div><div className="mt-12 rounded-lg bg-primary p-8"><h2 className="text-3xl">Trust is part of the product.</h2><p className="mt-3 max-w-2xl text-lg text-white/85">No cash is requested in this MVP. Schools are verified, donor details are kept private, and completed deliveries are documented.</p></div></section></main>;
}
