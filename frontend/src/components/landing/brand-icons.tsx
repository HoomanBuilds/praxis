import type { SVGProps } from "react";

/* ---------------------------------------------------------------------------
   Brand marks for the connectors PRAXIS actually integrates with, drawn as
   inline SVG in their real colours (the reference uses real logos, not
   placeholder swatches).

   Used nominatively — to identify the third-party services the product
   connects to. Each corresponds to a connector in `backend/integrations/`.
--------------------------------------------------------------------------- */

type IconProps = SVGProps<SVGSVGElement>;

/** Slack — four-colour pinwheel. */
export function SlackMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Slack" {...props}>
      <path
        fill="#E01E5A"
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
      />
      <path
        fill="#36C5F0"
        d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
      />
      <path
        fill="#2EB67D"
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
      />
      <path
        fill="#ECB22E"
        d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
      />
    </svg>
  );
}

/** Jira Software. */
export function JiraMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Jira" {...props}>
      <path
        fill="#2684FF"
        d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.762a1.005 1.005 0 0 0-1.001-1.005zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z"
      />
    </svg>
  );
}

/** Google Drive — the 2020 triangular mark. */
export function DriveMark(props: IconProps) {
  return (
    <svg viewBox="0 0 87.3 78" role="img" aria-label="Google Drive" {...props}>
      <path fill="#0066da" d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" />
      <path fill="#00ac47" d="M43.65 25 29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44A9.06 9.06 0 0 0 0 53h27.5z" />
      <path
        fill="#ea4335"
        d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.85 11.5z"
      />
      <path fill="#00832d" d="M43.65 25 57.4 1.2C56.05.4 54.5 0 52.9 0H34.4c-1.6 0-3.15.45-4.5 1.2z" />
      <path fill="#2684fc" d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" />
      <path
        fill="#ffba00"
        d="M73.4 26.5 60.7 4.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
      />
    </svg>
  );
}

/** Google Calendar. */
export function CalendarMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Calendar" {...props}>
      <path fill="#fff" d="M5 5h14v14H5z" />
      <path fill="#4285F4" d="M18.5 2H19a3 3 0 0 1 3 3v.5h-3.5z" />
      <path fill="#1967D2" d="M18.5 5.5H22V19a3 3 0 0 1-3 3h-.5z" />
      <path fill="#EA4335" d="M18.5 18.5V22H5a3 3 0 0 1-3-3v-.5z" />
      <path fill="#188038" d="M2 18.5V5a3 3 0 0 1 3-3h.5v16.5z" />
      <path fill="#FBBC04" d="M5.5 2H18.5v3.5H5.5z" />
      <path
        fill="#1A73E8"
        d="M9.1 14.9c-.5-.35-.86-.86-1.05-1.54l1.1-.45c.1.4.29.72.55.94.26.22.58.33.95.33.38 0 .7-.11.97-.35.27-.23.4-.53.4-.89 0-.37-.14-.67-.42-.9-.29-.24-.64-.35-1.06-.35h-.63v-1.09h.57c.37 0 .68-.1.93-.3.25-.2.37-.47.37-.82 0-.31-.11-.56-.34-.74-.22-.19-.5-.28-.85-.28-.33 0-.6.09-.8.27-.2.18-.35.4-.44.67l-1.09-.45c.15-.44.44-.82.85-1.16.42-.33.95-.5 1.6-.5.47 0 .9.09 1.28.28.38.18.68.44.9.77.22.33.32.7.32 1.11 0 .42-.1.78-.3 1.07-.2.29-.45.51-.75.67v.07c.39.16.71.41.95.75.25.34.37.74.37 1.21s-.12.9-.36 1.27c-.24.37-.57.67-.99.88-.42.22-.9.32-1.42.32-.61.01-1.17-.17-1.68-.53zm7.35-5.9-1.2.87-.6-.91 2.15-1.55h.83v7.32h-1.18z"
      />
    </svg>
  );
}

/**
 * SMTP, OIDC and SEBI filings have no consumer brand mark, so these are drawn
 * glyphs. They deliberately match the optical weight of the real brand marks
 * beside them: one solid colour, filled, ~20px inside a 24px box.
 */
export function MailMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Email" {...props}>
      <path
        fill="#1A73E8"
        d="M3.4 5.5h17.2c.77 0 1.4.63 1.4 1.4v10.2c0 .77-.63 1.4-1.4 1.4H3.4c-.77 0-1.4-.63-1.4-1.4V6.9c0-.77.63-1.4 1.4-1.4Z"
      />
      <path d="M2.6 7.1 12 13.4l9.4-6.3" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Single sign-on — Keycloak-backed OIDC, drawn as a solid key. */
export function SsoMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Single sign-on" {...props}>
      <path
        fill="#E8483C"
        d="M9.2 4.6a6.3 6.3 0 1 0 5.72 8.9h1.93v2.62h2.86V13.5H21a.9.9 0 0 0 .9-.9v-1.7a.9.9 0 0 0-.9-.9h-6.08A6.3 6.3 0 0 0 9.2 4.6Zm-1.5 4.6a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 0 1 0-3.8Z"
      />
    </svg>
  );
}

/** DocuSign — signature glyph on its brand gold. */
export function DocuSignMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="DocuSign" {...props}>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#FFB700" />
      <path
        d="M6.9 15.4c1.9-4.6 2.9-6.9 3.4-6.9.7 0 .4 4.9 1.35 4.9.65 0 1.2-1.35 2-1.35.8 0 .8 1.9 2.25 1.9"
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** SEBI filings — a regulator glyph. Manual field, not a live API. */
export function FilingsMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="SEBI filings" {...props}>
      <path fill="#1F3C88" d="M12 2.6 21.4 7.6v1.9H2.6V7.6z" />
      <path fill="#1F3C88" d="M5.1 11.4h2.5v6.4H5.1zm5.65 0h2.5v6.4h-2.5zm5.65 0h2.5v6.4h-2.5z" />
      <rect x="2.6" y="19.2" width="18.8" height="2.2" rx="1.1" fill="#1F3C88" />
    </svg>
  );
}

/** Audit reports — workbook glyph on the spreadsheet green. */
export function ReportsMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Reports" {...props}>
      <rect x="2.6" y="2.6" width="18.8" height="18.8" rx="4.4" fill="#1D6F42" />
      <path d="M7.6 16.2v-4.1M12 16.2V7.9M16.4 16.2v-2.6" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export const CONNECTOR_MARKS: { name: string; Mark: (p: IconProps) => JSX.Element; live: boolean }[] = [
  { name: "Email", Mark: MailMark, live: true },
  { name: "Calendar", Mark: CalendarMark, live: true },
  { name: "Single sign-on", Mark: SsoMark, live: true },
  { name: "Slack", Mark: SlackMark, live: false },
  { name: "Jira", Mark: JiraMark, live: false },
  { name: "Google Drive", Mark: DriveMark, live: false },
  { name: "DocuSign", Mark: DocuSignMark, live: false },
  { name: "SEBI filings", Mark: FilingsMark, live: false },
  { name: "Reports", Mark: ReportsMark, live: true },
];
