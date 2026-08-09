import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getSiteData, type SiteData } from "../lib/site.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="label">404</p>
        <h1 className="mt-4 text-2xl">Page not found</h1>
        <p className="mt-2 text-[13px] text-subtle">
          This route doesn't exist in the current build.
        </p>
        <div className="mt-6">
          <Link to="/" className="row-link inline-flex text-[12px] text-subtle hover:text-foreground">
            Go home →
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl">This page didn't load</h1>
        <p className="mt-2 text-[13px] text-subtle">
          Something went wrong on our end. Try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="row-link text-[12px] text-subtle hover:text-foreground"
          >
            Try again
          </button>
          <a href="/" className="row-link text-[12px] text-subtle hover:text-foreground">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Founder.env — Building things I wish existed" },
      {
        name: "description",
        content:
          "Founder.env is a build-in-public environment for digital products, websites and experiments.",
      },
      { property: "og:title", content: "Founder.env" },
      { property: "og:description", content: "Building things I wish existed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&family=Inter:wght@300;400;500&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  loader: () => getSiteData(),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function appearanceVars(site: SiteData): Record<string, string> {
  const a = site.appearance;
  if (!a) return {};
  return {
    "--background": a.background_color,
    "--background-2": a.secondary_background_color,
    "--surface": a.surface_color,
    "--surface-2": a.secondary_background_color,
    "--elevated": a.elevated_surface_color,
    "--foreground": a.primary_text_color,
    "--secondary-text": a.secondary_text_color,
    "--muted-text": a.muted_text_color,
    "--accent": a.accent_color,
    "--accent-2": a.secondary_accent_color,
    "--border": a.border_color,
    "--accent-glow": `color-mix(in oklab, ${a.accent_color} ${Math.round(Number(a.glow_intensity ?? 0.18) * 100)}%, transparent)`,
    "--font-heading": `"${a.heading_font}", "Inter", ui-sans-serif, system-ui, sans-serif`,
    "--font-body": `"${a.body_font}", "Geist", ui-sans-serif, system-ui, sans-serif`,
    "--font-mono-stack": `"${a.mono_font}", "IBM Plex Mono", ui-monospace, monospace`,
  };
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const site = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <div style={appearanceVars(site) as React.CSSProperties} className="min-h-screen bg-background">
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
