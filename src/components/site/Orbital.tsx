import { useSite, mediaUrl } from "@/lib/useSite";

/** Hero orbital system: concentric rings, drifting nodes, brand mark at centre. */
export function Orbital() {
  const site = useSite();
  const logo = mediaUrl(site, site.brand?.hero_logo_media_id);
  const animate = site.appearance?.orbital_animation_enabled !== false;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-border"
          style={{
            inset: `${i * 11}%`,
            opacity: 0.5 - i * 0.08,
          }}
        />
      ))}

      <div
        className="absolute inset-[8%] rounded-full"
        style={{ animation: animate ? "orbit-spin 34s linear infinite" : undefined }}
      >
        <span
          className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{ background: "var(--accent)", boxShadow: "0 0 12px var(--accent)" }}
        />
      </div>
      <div
        className="absolute inset-[24%] rounded-full"
        style={{ animation: animate ? "orbit-spin 22s linear infinite reverse" : undefined }}
      >
        <span className="absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-[var(--logo-blue)]" />
      </div>

      <div
        className="absolute inset-[30%] rounded-full border"
        style={{
          borderColor: "var(--border-strong)",
          background: "radial-gradient(circle at 50% 50%, var(--accent-glow), transparent 70%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {logo ? (
          <img
            src={logo}
            alt=""
            aria-hidden
            className="w-[26%] object-contain opacity-90"
            style={{ transform: `scale(${Number(site.brand?.hero_logo_scale ?? 1)})` }}
          />
        ) : null}
      </div>

      <div className="absolute bottom-[-6%] left-1/2 -translate-x-1/2 text-center">
        <p className="meta flex items-center gap-2" style={{ color: "var(--accent-2)" }}>
          <span
            className="h-1.5 w-1.5 rounded-full bg-current"
            style={{ animation: "pulse-soft 2.4s ease-in-out infinite" }}
          />
          {site.profile?.founder_status ?? "BUILDING"}
        </p>
        <p className="label mt-3 whitespace-nowrap">{site.profile?.focus}</p>
      </div>
    </div>
  );
}
