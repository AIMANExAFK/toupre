// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Toupré — Tout se loue, tout près.</title>
        {/* Typo « Slate » : Plus Jakarta Sans, géométrique, graisses modérées */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
        {/*
          Disable body scrolling on web to make ScrollView components work correctly.
          If you want to enable scrolling, remove `ScrollViewStyleReset` and
          set `overflow: auto` on the body style below.
        */}
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body > div:first-child { position: fixed !important; top: 0; left: 0; right: 0; bottom: 0; }

              /* ─── Typo de marque (sans écraser les polices d'icônes) ─── */
              #root, #root *:not([style*="Ionicons"]):not([style*="ionicons"]) { font-family: 'Plus Jakarta Sans', -apple-system, 'Segoe UI', Roboto, sans-serif !important; }
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }

              /* ─── Aucun outline / halo sur quoi que ce soit ───
                 (règle projet : pas de halo disgracieux au clic souris) */
              *,
              *:focus,
              *:focus-visible,
              *:focus-within,
              *::after,
              *::before {
                outline: 0 none transparent !important;
                outline-width: 0 !important;
                outline-style: none !important;
                outline-color: transparent !important;
                outline-offset: 0 !important;
                -webkit-tap-highlight-color: transparent !important;
                -webkit-focus-ring-color: transparent !important;
              }
              /* Tue tout box-shadow ajouté par le focus de RN Web */
              input:focus,
              input:focus-visible,
              textarea:focus,
              textarea:focus-visible,
              select:focus,
              select:focus-visible,
              button:focus,
              button:focus-visible,
              a:focus,
              a:focus-visible,
              [tabindex]:focus,
              [tabindex]:focus-visible,
              [role]:focus,
              [role]:focus-visible {
                box-shadow: none !important;
              }

              /* ─── Focus clavier visible (spec 002, FR-011) ───
                 :focus-visible ne se déclenche QUE sur navigation clavier — jamais au
                 clic souris. La règle « pas de halo » ci-dessus reste donc respectée
                 pour la souris, tout en rendant le focus perceptible au clavier, sans
                 quoi l'application est inutilisable sans souris. */
              #root a:focus-visible,
              #root button:focus-visible,
              #root input:focus-visible,
              #root textarea:focus-visible,
              #root [tabindex]:focus-visible {
                outline: 3px solid #2563EB !important;
                outline-offset: 2px !important;
                border-radius: 4px;
              }
              /* Champs qui dessinent eux-mêmes leur état de focus (bordure sombre
                 de l'écran de connexion) : pas de second contour par-dessus. Le focus
                 reste visible, il est simplement porté par le champ. */
              #root input[data-focus-propre]:focus-visible {
                outline: none !important;
              }
              @media (prefers-reduced-motion: no-preference) {
                #root a:focus-visible, #root button:focus-visible {
                  transition: outline-offset 120ms ease;
                }
              }
            `,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          height: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </body>
    </html>
  );
}
