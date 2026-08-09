import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useSite, mediaUrl } from "@/lib/useSite";

export function Header() {
  const site = useSite();
  const logo = mediaUrl(site, site.brand?.header_logo_media_id);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const instagram = site.socials.find((s) => s.platform === "INSTAGRAM");

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-md transition-colors ${
        scrolled ? "border-b bg-background/85" : "border-b border-transparent"
      }`}
    >
      <div className="shell flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          {logo ? (
            <img
              src={logo}
              alt={site.brand?.brand_text ?? "Founder.env"}
              style={{
                height: `${(site.brand?.header_logo_height ?? 22) * Number(site.brand?.header_logo_scale ?? 1)}px`,
              }}
              className="w-auto object-contain"
            />
          ) : null}
          {site.brand?.show_brand_text !== false ? (
            <span className="font-display text-[13px] tracking-tight text-foreground">
              {site.brand?.brand_text ?? "founder.env"}
            </span>
          ) : null}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {site.nav.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className="text-[12px] text-subtle transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          {instagram?.url ? (
            <a
              href={instagram.url}
              target="_blank"
              rel="noreferrer"
              className="text-[12px] text-subtle transition-colors hover:text-foreground"
            >
              Instagram ↗
            </a>
          ) : null}
        </nav>

        <button
          type="button"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center border border-border text-subtle md:hidden"
        >
          <span className="text-[13px]">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open ? (
        <div className="border-t bg-background md:hidden">
          <div className="shell flex flex-col gap-1 py-3">
            {site.nav.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setOpen(false)}
                className="py-2 text-[13px] text-subtle"
              >
                {item.label}
              </Link>
            ))}
            {instagram?.url ? (
              <a href={instagram.url} target="_blank" rel="noreferrer" className="py-2 text-[13px] text-subtle">
                Instagram ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
