// @ts-nocheck
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
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
              [role="tablist"] [role="tab"] * { overflow: visible !important; }
              [role="heading"], [role="heading"] * { overflow: visible !important; }

              /* ─── Aucun outline / halo sur quoi que ce soit ─── */
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
