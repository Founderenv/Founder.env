import { Link } from 'react-router-dom';
import { QrCode, Users, Tag, Gift, Repeat, Star, BarChart3, Check, ChevronRight, ArrowRight, Sparkles, Store } from 'lucide-react';
import { Logo } from '@/components/layout/Navigation';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-16 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-500/5" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-500 mb-6">
            <Sparkles size={14} /> Premium QR-powered social commerce
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white text-balance">
            Turn every customer<br />into a <span className="text-brand-600 dark:text-brand-500">follower</span>.
          </h1>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-balance">
            Create your digital business presence, grow your customer community and promote your business through one smart QR.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth/business" className="btn-primary text-base px-8 py-3.5">
              <Store size={20} /> List Your Business
            </Link>
            <Link to="/explore" className="btn-outline text-base px-8 py-3.5">
              Explore Businesses <ArrowRight size={18} />
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-400">Your shop deserves followers too.</p>
        </div>
      </section>

      {/* Flow Diagram */}
      <section className="px-4 py-12 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-1 sm:gap-3 flex-wrap">
            {[
              { icon: QrCode, label: 'QR Scan' },
              { icon: Store, label: 'Business Profile' },
              { icon: Users, label: 'Follow' },
              { icon: Tag, label: 'Deals' },
              { icon: Gift, label: 'Rewards' },
              { icon: Repeat, label: 'Repeat Customer' },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-1 sm:gap-3">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-gray-800">
                    <step.icon size={22} className="text-brand-600 dark:text-brand-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{step.label}</span>
                </div>
                {i < arr.length - 1 && <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <Section title="How It Works" subtitle="Three steps to your digital business presence">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { num: '01', title: 'Create your profile', desc: 'Set up your business page with logo, cover, photos, and details. Pick from 10 premium templates.' },
            { num: '02', title: 'Share your QR', desc: 'Get a permanent QR code. Put it on your counter, packaging, or receipt. Every scan becomes a follower.' },
            { num: '03', title: 'Grow & engage', desc: 'Post stories, deals, and clips. Run loyalty, referrals, and Scratch & Win campaigns to keep customers coming back.' },
          ].map((item) => (
            <div key={item.num} className="card p-6">
              <span className="text-3xl font-bold text-brand-600/20 dark:text-brand-500/20">{item.num}</span>
              <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Features */}
      <Section title="Everything your shop needs" subtitle="Premium business profiles with social-commerce built in">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Store, title: 'Business Profiles', desc: 'Premium mini-website with your branding, products, gallery, hours, and reviews.' },
            { icon: QrCode, title: 'Permanent QR Code', desc: 'One QR that never changes. Scan to open your profile, follow, and unlock deals.' },
            { icon: Users, title: 'Customer Followers', desc: 'Turn walk-in customers into a follower community. See who follows you and how they found you.' },
            { icon: Tag, title: 'Stories & Deals', desc: 'Share time-limited stories and deals. Count down, limited claims, and built-in CTAs.' },
            { icon: Star, title: 'Reviews & Ratings', desc: 'Collect verified customer reviews. Reply publicly. Build trust in your community.' },
            { icon: Gift, title: 'Rewards & Loyalty', desc: 'Welcome rewards, visit-based loyalty, referral campaigns, and Scratch & Win games.' },
            { icon: BarChart3, title: 'Analytics', desc: 'Track profile views, QR scans, follower growth, deal engagement, and traffic sources.' },
            { icon: Repeat, title: 'Referral System', desc: 'Let customers refer friends. Reward both sides. Track every share and conversion.' },
            { icon: Sparkles, title: 'Deal Clips', desc: 'Short vertical videos to showcase products and promotions. Like, share, and claim deals directly.' },
          ].map((f) => (
            <div key={f.title} className="card p-5 transition-all hover:shadow-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-500">
                <f.icon size={20} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section title="Simple, transparent pricing" subtitle="Start with a one-time activation. Pro is optional.">
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="card p-6 border-2 border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Lite</h3>
            <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">Free</p>
            <p className="mt-1 text-xs text-gray-500">Fallback when Pro expires</p>
            <ul className="mt-4 space-y-2">
              {['Basic business profile', 'Permanent QR code', 'Basic business information', 'Followers & DMs'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check size={16} className="text-gray-400" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6 border-2 border-brand-500 relative">
            <span className="absolute -top-3 left-6 badge bg-brand-600 text-white">Recommended</span>
            <h3 className="text-sm font-semibold text-brand-600 dark:text-brand-500">Founder.env Pro</h3>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">₹299</span>
              <span className="text-sm text-gray-500">/month</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">₹299 setup today · first ₹199 monthly bill one calendar month later</p>
            <ul className="mt-4 space-y-2">
              {['Everything in Lite', 'Stories & posts', 'Deals & Deal Clips', 'Rewards, loyalty & referrals', 'Scratch & Win campaigns', 'Analytics dashboard', 'All 10 premium templates', 'Review replies'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <Check size={16} className="text-brand-600 dark:text-brand-500" /> {f}
                </li>
              ))}
            </ul>
            <Link to="/onboarding" className="mt-6 btn-primary w-full">Get Started</Link>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-gray-400 max-w-lg mx-auto">
          Lite mode activates automatically if Pro expires. Your business profile is never deleted.
        </p>
      </Section>

      {/* FAQ */}
      <Section title="Frequently asked questions" subtitle="">
        <div className="max-w-2xl mx-auto space-y-3">
          {[
            { q: 'What happens when Pro expires?', a: 'Your profile stays live but switches to Lite mode. You keep your QR code, basic info, followers, and DMs. Upgrade anytime to restore all features.' },
            { q: 'Do I need to print a new QR every time?', a: 'No. Your QR code is permanent. It always points to your Founder.env business profile, no matter how much you update it.' },
            { q: 'Can customers see my business without an account?', a: 'Yes. Anyone who scans your QR can browse your profile, deals, and reviews. They only need to sign in to follow, claim deals, or leave reviews.' },
            { q: 'When does monthly billing start?', a: 'You pay the ₹299 one-time setup fee when you authorise Razorpay Autopay. The first ₹199 monthly payment is scheduled exactly one calendar month later.' },
            { q: 'Can I run multiple businesses?', a: 'Yes. You can create and manage multiple business profiles from a single owner account.' },
          ].map((faq) => (
            <details key={faq.q} className="card p-4 group">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-100 list-none flex items-center justify-between">
                {faq.q}
                <ChevronRight size={18} className="text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{faq.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section className="px-4 py-16 bg-brand-600 dark:bg-brand-700">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="font-display text-3xl font-bold">Your shop deserves followers too.</h2>
          <p className="mt-3 text-white/80">Start building your customer community today.</p>
          <Link to="/auth/business" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-brand-700 hover:bg-brand-50 active:scale-[0.98]">
            <Store size={20} /> List Your Business
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-gray-400">© 2025 Founder.env. Built for local businesses.</p>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <Link to="/explore" className="hover:text-gray-700 dark:hover:text-gray-300">Explore</Link>
            <Link to="/onboarding" className="hover:text-gray-700 dark:hover:text-gray-300">Get Started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="px-4 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}
