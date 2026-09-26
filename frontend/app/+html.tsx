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
        <link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='24'%20fill='%230A0A0A'/%3E%3Ctext%20x='50'%20y='73'%20text-anchor='middle'%20font-family='Georgia,serif'%20font-size='66'%20fill='white'%3Et%3C/text%3E%3Ccircle%20cx='67'%20cy='30'%20r='7'%20fill='%230F7A5F'/%3E%3C/svg%3E" />
        {/* Typo « Slate » : Plus Jakarta Sans, géométrique, graisses modérées */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
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
              /* Wordmark de marque : Fraunces (serif chic) via dataSet brandFont */
              #root [data-brand-font="1"], #root [data-brand-font="1"] * { font-family: 'Fraunces', Georgia, serif !important; }
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
