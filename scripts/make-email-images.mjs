// Makes the images used in emails (lib/email-content.ts): the white logo, and one round
// icon per kind of email in the brand colors. Run with `npm run email-images`.
// Email apps don't show SVG, so these are PNGs at twice their shown size (sharp on retina screens).

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { createElement } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const icons = require("lucide-react");

const OUT = "public/email";
mkdirSync(OUT, { recursive: true });

// The logo: shown 168 px wide in the header and 112 px in the footer.
await sharp("brand/png/teamvory-logo-white-1200.png").resize({ width: 336 }).png().toFile(`${OUT}/logo-white.png`);

// Icons: a mint circle with a dark teal line icon, shown at 64 px.
const kinds = {
  invite: "MailOpen",
  schedule: "CalendarCheck",
  changed: "CalendarClock",
  reminder: "BellRing",
  alert: "TriangleAlert",
  swap: "ArrowRightLeft",
  approved: "CircleCheckBig",
  declined: "CircleX",
  password: "KeyRound",
};

for (const [kind, name] of Object.entries(kinds)) {
  const svg = renderToStaticMarkup(createElement(icons[name], { size: 24 }));
  const inner = svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
  const image = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <circle cx="64" cy="64" r="63" fill="#E6FFFA" stroke="#99F6E4" stroke-width="2"/>
  <g transform="translate(36 36) scale(2.3333)" fill="none" stroke="#0F766E" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${inner}</g>
</svg>`;
  writeFileSync(`${OUT}/${kind}.png`, new Resvg(image).render().asPng());
}

console.log(`Wrote ${Object.keys(kinds).length + 1} images to ${OUT}`);
