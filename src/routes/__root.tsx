import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center font-mono">
        <h1 className="text-7xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">SECTOR NO LOCALIZADO</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta solicitada no existe en el sistema.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al puente de mando
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GEOPOLITICA — Motor de Simulación" },
      { name: "description", content: "Motor de simulación geopolítica dura. Mundo vivo, rankings, costes reales." },
      { property: "og:title", content: "GEOPOLITICA — Motor de Simulación" },
      { name: "twitter:title", content: "GEOPOLITICA — Motor de Simulación" },
      { property: "og:description", content: "Motor de simulación geopolítica dura. Mundo vivo, rankings, costes reales." },
      { name: "twitter:description", content: "Motor de simulación geopolítica dura. Mundo vivo, rankings, costes reales." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e2939faa-215e-4be1-bef9-cd35cc1cdc54/id-preview-e59621bf--e9379c61-66ee-46ae-8d78-ff5713c23eda.lovable.app-1776845333676.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e2939faa-215e-4be1-bef9-cd35cc1cdc54/id-preview-e59621bf--e9379c61-66ee-46ae-8d78-ff5713c23eda.lovable.app-1776845333676.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
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

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
