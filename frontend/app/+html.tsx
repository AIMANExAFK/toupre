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
        {/* Typo de marque Toupré : Fredoka (titres/wordmark) + Nunito (texte) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;600;700;800&display=swap"
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
              #root, #root *:not([style*="Ionicons"]):not([style*="ionicons"]) { font-family: 'Nunito', -apple-system, 'Segoe UI', Roboto, sans-serif !important; }
              [data-brand-font], [data-brand-font] * { font-family: 'Fredoka', 'Nunito', sans-serif !important; }
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
                outline: 3px solid #CE4221 !important;
                outline-offset: 2px !important;
                border-radius: 4px;
              }
              /* Sur fond corail, un contour corail serait invisible : on inverse. */
              #root button[style*="rgb(206, 66, 33)"]:focus-visible {
                outline-color: #FFF8F3 !important;
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
