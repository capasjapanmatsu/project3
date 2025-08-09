// Simple SVG data URI placeholder for park images
export const PARK_PLACEHOLDER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#f3f4f6"/>
  <g opacity="0.9">
    <circle cx="200" cy="380" r="60" fill="#e5e7eb"/>
    <circle cx="270" cy="360" r="40" fill="#e5e7eb"/>
    <rect x="120" y="400" width="560" height="20" rx="10" fill="#e5e7eb"/>
    <rect x="200" y="420" width="400" height="16" rx="8" fill="#e5e7eb"/>
  </g>
  <g>
    <path d="M520 320c0 44.183-35.817 80-80 80s-80-35.817-80-80 35.817-80 80-80 80 35.817 80 80z" fill="#d1d5db"/>
    <path d="M470 305c0 13.807-11.193 25-25 25s-25-11.193-25-25 11.193-25 25-25 25 11.193 25 25z" fill="#f9fafb"/>
    <path d="M445 350c-22 0-40 18-40 40h80c0-22-18-40-40-40z" fill="#f9fafb"/>
  </g>
  <text x="400" y="520" text-anchor="middle" font-family="'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" fill="#9ca3af">画像を準備中です</text>
</svg>
`);


