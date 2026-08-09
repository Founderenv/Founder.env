import { Link } from "@tanstack/react-router";
import { useSite } from "@/lib/useSite";

export function Footer() {
  const site = useSite();
  const ig = site.socials.find((s) => s.platform === "INSTAGRAM");
  const gh = site.socials.find((s) => s.platform === "GITHUB");
  const mail = site.socials.find((s) => s.platform === "EMAIL");

  return (
    <footer>
      <div className="border-t bg-[var(--background-2)] py-20">
        <div className="shell text-center">
          <p className="label">Still building.</p>
          <p className="mx-auto mt-4 max-w-md text-[13px] text-subtle">
            Follow the journey, explore the code, or get in touch.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {ig?.url ? (
              <a href={ig.url} target="_blank" rel="noreferrer" className="row-link py-2.5 text-[12px] text-subtle hover:border-border-strong hover:text-foreground">
                Instagram ↗
              </a>
            ) : null}
            {gh?.url ? (
              <a href={gh.url} target="_blank" rel="noreferrer" className="row-link py-2.5 text-[12px] text-subtle hover:border-border-strong hover:text-foreground">
                GitHub ↗
              </a>
            ) : null}
            {mail?.email ? (
              <a href={`mailto:${mail.email}`} className="row-link py-2.5 text-[12px] text-subtle hover:border-border-strong hover:text-foreground">
                Email ↗
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-[13px]">{site.brand?.brand_text ?? "founder.env"}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {site.profile?.bio ?? "Building things I wish existed."}
            </p>
          </div>
          <nav className="flex gap-6">
            {site.nav.map((item) => (
              <Link key={item.id} to={item.href} className="text-[12px] text-subtle hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} {site.profile?.brand_name ?? "Founder.env"}
          </p>
        </div>
      </div>
    </footer>
  );
}
