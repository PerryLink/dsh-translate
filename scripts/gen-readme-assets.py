#!/usr/bin/env python3
"""Generate README image assets for dsh-translate (docs/assets/).

Outputs (idempotent overwrite):
  dsh-translate-flow-light.svg / dsh-translate-flow-dark.svg
      Hero data-flow diagram. Two hand-written SVG files (vector — never
      rasterized to webp). Text inside is command-surface tokens only
      (tools/post-execute, /translate, fix_json, accept, next(), ...), so all
      five README languages share the same pair and get the same reading.
  (no evidence chart) this repo ships no benchmark / measured dataset, so the
      documented rule "only draw evidence when real data exists" keeps the bar
      chart out. The old single-skin hero assets (dsh-translate-flow.svg,
      dsh-translate-hero.png, dsh-translate-demo.png/.gif) are deliberately
      left on disk so existing external links keep resolving; the five READMEs
      reference the new -light/-dark pair only.

Run once:  python scripts/gen-readme-assets.py
Requires:  Pillow (pip install pillow) — the CJK-font probe below guards any
           future raster work; SVG output itself needs no font embedding.
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFont  # noqa: F401  (raster path reserved)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# --- palette: PerryLink family (accent) + GitHub page backgrounds ----------
FAMILY = "#4B67B4"   # family accent (badges labelColor family uses #2B3245)
GREEN = {"light": "#16a34a", "dark": "#3fb950"}
SKIN = {
    "light": dict(bg="#ffffff", box="#f6f8fa", border="#d0d7de",
                  text="#1f2328", sub="#57606a"),
    "dark": dict(bg="#0d1117", box="#161b22", border="#30363d",
                 text="#f0f6fc", sub="#8b949e"),
}
WEBP_QUALITY = 90  # shared with the family asset scripts

# --- CJK font probe: never render text as tofu boxes -----------------------
FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyh.ttc",      # Microsoft YaHei
    r"C:\Windows\Fonts\simhei.ttf",    # SimHei
    r"C:\Windows\Fonts\Deng.ttf",      # DengXian
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]
FONT_PATH = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)
if FONT_PATH is None:
    sys.exit("FATAL: no CJK font found (looked for msyh.ttc, simhei.ttf, "
             "Deng.ttf, Noto Sans CJK, PingFang). Refusing to render text "
             "that could come out as tofu boxes; install one of the probed "
             "fonts and re-run.")


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


# ---------------------------------------------------------------------------
# 1. Hero data-flow SVG (light + dark)
# ---------------------------------------------------------------------------
# Lane 1 = the deterministic repair pipeline behind tools/post-execute.
# Lane 2 = the /translate surface. Node labels are command tokens only.
FLOW_NODES = [
    ("tool result", "JSON text · success"),
    ("extract fence", "parse"),
    ("repair loop", "4 strategies"),
    ("schema validate", "supported subset"),
    ("accept | next()", "audit: counts only"),
]
LANE2 = "/translate · 13 params × 11 vendors · &lt;from&gt; &lt;to&gt; [param]"
FOOTNOTE = "no invented data · translate/fix audit = counts + flags only"


def flow_svg(skin: str) -> str:
    s = SKIN[skin]
    w, h = 1200, 430
    nw, nh, gap = 190, 100, 28
    x0, y0 = 70, 168
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
        f'viewBox="0 0 {w} {h}" role="img" aria-label="dsh-translate data '
        f'flow">',
        '<title>dsh-translate data flow</title>',
        f'<rect width="{w}" height="{h}" rx="18" fill="{s["bg"]}"/>',
        f'<text x="60" y="58" fill="{s["text"]}" font-family="ui-sans-serif,'
        f'system-ui,sans-serif" font-size="30" font-weight="700">'
        f'dsh-translate</text>',
        f'<text x="60" y="92" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="16">tools/post-execute · /translate · '
        f'fix_json</text>',
        f'<line x1="60" y1="118" x2="1140" y2="118" stroke="{s["border"]}"/>',
        f'<text x="{x0}" y="150" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="13">tools/post-execute</text>',
    ]
    for i, (label, sub) in enumerate(FLOW_NODES):
        x = x0 + i * (nw + gap)
        last = i == len(FLOW_NODES) - 1
        accent = GREEN[skin] if last else (FAMILY if i in (1, 2) else s["border"])
        parts.append(
            f'<rect x="{x}" y="{y0}" width="{nw}" height="{nh}" rx="14" '
            f'fill="{s["box"]}" stroke="{accent}" stroke-width="2"/>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 42}" fill="{s["text"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="16" font-weight="700">{label}</text>')
        parts.append(
            f'<text x="{x + nw // 2}" y="{y0 + 70}" fill="{s["sub"]}" '
            f'text-anchor="middle" font-family="ui-monospace,monospace" '
            f'font-size="12">{sub}</text>')
        if not last:
            ax = x + nw + 4
            ay = y0 + nh // 2
            parts.append(
                f'<path d="M{ax} {ay}h{gap - 10}" stroke="{s["sub"]}" '
                f'stroke-width="3"/>')
            parts.append(
                f'<path d="M{ax + gap - 12} {ay - 7}l10 7-10 7" fill="none" '
                f'stroke="{s["sub"]}" stroke-width="3" '
                f'stroke-linecap="round" stroke-linejoin="round"/>')
    # lane 2: the /translate surface, one wide bar under the repair pipeline
    bx, bw, by, bh = x0, 1060, 300, 58
    parts.append(
        f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" rx="12" '
        f'fill="{s["box"]}" stroke="{FAMILY}" stroke-width="2"/>')
    parts.append(
        f'<text x="{bx + bw // 2}" y="{by + 37}" fill="{s["text"]}" '
        f'text-anchor="middle" font-family="ui-monospace,monospace" '
        f'font-size="15">{LANE2}</text>')
    parts.append(
        f'<text x="60" y="404" fill="{s["sub"]}" font-family="ui-monospace,'
        f'monospace" font-size="13">{FOOTNOTE}</text>')
    parts.append('</svg>')
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for skin in ("light", "dark"):
        with open(os.path.join(OUT, f"dsh-translate-flow-{skin}.svg"),
                  "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
    print("wrote 2 SVG assets to docs/assets/ (no evidence chart: this repo "
          "ships no benchmark data)")


if __name__ == "__main__":
    main()
