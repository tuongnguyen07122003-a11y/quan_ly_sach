import crypto from "crypto";

const PALETTES = [
  ["#5c7cfa", "#9775fa"], ["#f76707", "#fcc419"], ["#12b886", "#4dabf7"], ["#e64980", "#ff922b"],
  ["#1c7ed6", "#22b8cf"], ["#7048e8", "#e599f7"], ["#2f9e44", "#94d82d"], ["#c92a2a", "#f06595"],
];

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Xuống dòng theo từ, tối đa maxLines dòng
function wrap(text, max, maxLines) {
  const lines = [];
  let cur = "";
  for (const w of String(text).trim().split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= max) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > max ? `${w.slice(0, max - 1)}…` : w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, max - 1)}…`;
  }
  return lines;
}

// Tạo ảnh bìa SVG (300x420) từ tên sách, tác giả, thể loại. Cùng thể loại -> cùng tông màu.
export function coverSvg({ title = "", author = "", category = "" }) {
  const h = parseInt(crypto.createHash("md5").update(category || title).digest("hex").slice(0, 6), 16);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const lines = wrap(title, 13, 5);
  const size = lines.length > 3 ? 26 : 30;
  const lh = Math.round(size * 1.3);
  const startY = Math.round(200 - ((lines.length - 1) * lh) / 2);
  const tspans = lines.map((l, i) => `<tspan x="150" dy="${i === 0 ? 0 : lh}">${esc(l)}</tspan>`).join("");
  const font = `font-family="'Segoe UI', Arial, sans-serif" text-anchor="middle" fill="#fff"`;
  const authorText = author.length > 24 ? `${author.slice(0, 23)}…` : author;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
<rect width="300" height="420" fill="url(#g)"/>
<rect x="16" y="16" width="268" height="388" rx="6" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
<text x="150" y="64" ${font} font-size="13" letter-spacing="2" opacity=".85">${esc(String(category).toUpperCase())}</text>
<text x="150" y="${startY}" ${font} font-size="${size}" font-weight="700">${tspans}</text>
<line x1="95" y1="338" x2="205" y2="338" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>
<text x="150" y="368" ${font} font-size="17">${esc(authorText)}</text>
</svg>
`;
}
