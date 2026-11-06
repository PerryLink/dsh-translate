#!/usr/bin/env python3
"""Generate the dsh-translate README artwork (docs/assets/).

Outputs (idempotent overwrite):
  dsh-translate-hero-{zh,en}-{light,dark}.webp
      1440x576 hero banner drawn with Pillow. Left column: kicker, title,
      two value lines, subtitle, meta, footer. Right side: the two semantic
      motifs of this plugin - a 13 (canonical params) x 11 (vendors) mapping
      lattice with one highlighted query, and a deterministic JSON repair
      card (broken tokens + the four strategy chips + schema check).
  dsh-translate-flow-v5-{light,dark}.svg
      1100x660 hand-written structure diagram. Two independent lanes:
      A = the /translate command face (rosetta table lookup), B = the
      tools/post-execute + fix_json state machine (claim guard, fence/parse,
      bounded strategy loop, fieldCompletion, schema-subset validation,
      accept | next()). Text inside the SVG is command/config tokens plus
      short English labels only, so all five README languages share it.

The old single-skin dsh-translate-flow.svg / -hero.png / demo files are left
on disk on purpose (external links), but the five READMEs reference only the
new files.

Run:      python scripts/gen-readme-assets.py
Requires: Pillow with WebP (the bundled Python has both) and a CJK font
          (msyh.ttc / msyhbd.ttc / consola.ttf on Windows). The script exits
          loudly instead of rendering tofu boxes.
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "assets")

# ---------------------------------------------------------------------------
# Fonts: fail loudly, never render tofu.
# ---------------------------------------------------------------------------
FONT_CANDIDATES = {
    "regular": [r"C:\Windows\Fonts\msyh.ttc",
                r"C:\Windows\Fonts\Deng.ttf",
                "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                "/System/Library/Fonts/PingFang.ttc"],
    "bold": [r"C:\Windows\Fonts\msyhbd.ttc",
             r"C:\Windows\Fonts\msyh.ttc",
             "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
             "/System/Library/Fonts/PingFang.ttc"],
    "mono": [r"C:\Windows\Fonts\consola.ttf",
             r"C:\Windows\Fonts\msyh.ttc",
             "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"],
}
FONTS = {}
for role, paths in FONT_CANDIDATES.items():
    found = next((p for p in paths if os.path.exists(p)), None)
    if found is None:
        sys.exit(f"FATAL: no usable {role} font found (probed {paths}). "
                 "Refusing to render text that could come out as tofu boxes.")
    FONTS[role] = found

# ---------------------------------------------------------------------------
# Palette: PerryLink family accent + the required light/dark page backgrounds.
# ---------------------------------------------------------------------------
PALETTE = {
    "light": dict(
        bg=(249, 246, 253), bg2=(228, 234, 248),
        panel=(253, 252, 255, 255), panel2=(246, 245, 252, 255),
        border=(214, 211, 230), card=(255, 255, 255, 255),
        text=(27, 33, 64), sub=(91, 98, 121), faint=(122, 129, 150),
        accent=(75, 103, 180), accent_soft=(231, 234, 247),
        green=(22, 121, 74), green_soft=(227, 243, 234),
        red=(180, 35, 24), red_soft=(252, 236, 233),
        shadow=(24, 32, 64, 32), dot=(75, 103, 180, 18),
        glow1=(75, 103, 180, 26), glow2=(112, 179, 166, 18),
    ),
    "dark": dict(
        bg=(19, 26, 42), bg2=(12, 16, 22),
        panel=(26, 34, 51, 255), panel2=(16, 24, 42, 255),
        border=(44, 56, 82), card=(30, 40, 60, 255),
        text=(238, 241, 248), sub=(167, 176, 197), faint=(124, 135, 160),
        accent=(132, 150, 245), accent_soft=(34, 43, 69),
        green=(63, 185, 80), green_soft=(23, 51, 36),
        red=(248, 113, 113), red_soft=(58, 30, 35),
        shadow=(0, 0, 0, 70), dot=(132, 150, 245, 22),
        glow1=(73, 99, 180, 48), glow2=(42, 120, 110, 28),
    ),
}

SS = 2  # supersampling factor for the Pillow hero
W, H = 1440, 576


def sc(v: float) -> int:
    return int(round(v * SS))


def mix(bg, fg, alpha: float):
    """Opaque blend of fg over bg (0..1); keeps WebP pixels fully opaque."""
    return tuple(int(round(bg[i] * (1 - alpha) + fg[i] * alpha))
                 for i in range(3)) + (255,)


def font(role: str, size: float) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONTS[role], sc(size))


def text(draw: ImageDraw.ImageDraw, xy, s: str, f, fill, anchor="ls",
         tracking: float = 0.0) -> None:
    x, y = xy
    if tracking:
        cursor = x
        for ch in s:
            draw.text((sc(cursor), sc(y)), ch, font=f, fill=fill, anchor=anchor)
            cursor += draw.textlength(ch, font=f) / SS + tracking
    else:
        draw.text((sc(x), sc(y)), s, font=f, fill=fill, anchor=anchor)


def width(draw: ImageDraw.ImageDraw, s: str, f) -> float:
    return draw.textlength(s, font=f) / SS


def fit_font(draw, role, size, s, max_width, min_size=14):
    """Largest font size (<= size) at which s fits max_width."""
    while size > min_size:
        f = font(role, size)
        if width(draw, s, f) <= max_width:
            return f
        size -= 1
    return font(role, min_size)


def grad_bg(skin: str) -> Image.Image:
    p = PALETTE[skin]
    grad = Image.new("RGB", (1, H * SS))
    top, bottom = p["bg"], p["bg2"]
    for y in range(H * SS):
        t = y / (H * SS - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t)
                                    for i in range(3)))
    return grad.resize((W * SS, H * SS)).convert("RGBA")


def add_glow(img: Image.Image, skin: str) -> None:
    p = PALETTE[skin]
    small = Image.new("RGBA", (W * SS // 4, H * SS // 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(small)
    q = SS / 4  # 1x design coordinates -> quarter-resolution glow layer
    d.ellipse([int(760 * q), int(-140 * q), int(1560 * q), int(300 * q)],
              fill=p["glow1"])
    d.ellipse([int(980 * q), int(330 * q), int(1520 * q), int(720 * q)],
              fill=p["glow2"])
    d.ellipse([int(-160 * q), int(360 * q), int(520 * q), int(760 * q)],
              fill=p["glow1"])
    small = small.filter(ImageFilter.GaussianBlur(28))
    img.alpha_composite(small.resize((W * SS, H * SS), Image.BILINEAR))


def add_dots(img: Image.Image, skin: str) -> None:
    p = PALETTE[skin]
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for y in range(30, H, 26):
        for x in range(26, W, 26):
            d.ellipse([sc(x - 1), sc(y - 1), sc(x + 1), sc(y + 1)],
                      fill=p["dot"])
    img.alpha_composite(layer)


def rounded_mask() -> Image.Image:
    mask = Image.new("L", (W * SS, H * SS), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, W * SS - 1, H * SS - 1], radius=sc(22), fill=255)
    return mask


def panel(img: Image.Image, box, skin: str, radius: float = 20,
          fill_key: str = "panel", dashed: bool = False) -> None:
    p = PALETTE[skin]
    x, y, w, h = box
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([sc(x), sc(y + 7), sc(x + w), sc(y + h + 7)],
                         radius=sc(radius), fill=p["shadow"])
    shadow = shadow.filter(ImageFilter.GaussianBlur(sc(9)))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([sc(x), sc(y), sc(x + w), sc(y + h)],
                        radius=sc(radius), fill=p[fill_key],
                        outline=p["border"], width=max(1, sc(1.1)))


def dashed_line(draw: ImageDraw.ImageDraw, pts, fill, width_px=1.2,
                dash=6, gap=5) -> None:
    """Straight dashed segments between successive points."""
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        dx, dy = x2 - x1, y2 - y1
        dist = (dx * dx + dy * dy) ** 0.5
        if dist == 0:
            continue
        ux, uy = dx / dist, dy / dist
        t = 0.0
        while t < dist:
            a = t
            b = min(t + dash, dist)
            draw.line([sc(x1 + ux * a), sc(y1 + uy * a),
                       sc(x1 + ux * b), sc(y1 + uy * b)],
                      fill=fill, width=max(1, sc(width_px)))
            t += dash + gap


def badge(draw, x, y, letter, skin):
    p = PALETTE[skin]
    draw.ellipse([sc(x - 11), sc(y - 11), sc(x + 11), sc(y + 11)],
                 fill=p["accent_soft"])
    text(draw, (x, y), letter, font("bold", 12), p["accent"], anchor="mm")


# ---------------------------------------------------------------------------
# Hero illustration: rosetta lattice + deterministic repair card.
# ---------------------------------------------------------------------------
def draw_lattice_panel(img: Image.Image, skin: str) -> None:
    p = PALETTE[skin]
    panel(img, (760, 76, 604, 216), skin)
    d = ImageDraw.Draw(img)
    text(d, (786, 110), "PARAMETER ROSETTA", font("bold", 16), p["accent"],
         tracking=1.1)
    text(d, (1338, 110), "13 × 11", font("mono", 16), p["sub"], anchor="rs")

    x0, y0, pitch, cell = 792, 130, 11, 7
    for row in range(13):
        for col in range(11):
            x = x0 + col * pitch
            y = y0 + row * pitch
            hot_row, hot_col = row == 5, col == 1
            alpha = 0.59 if hot_row or hot_col else 0.24
            color = mix(p["panel"], p["accent"], alpha)
            d.rounded_rectangle([sc(x), sc(y), sc(x + cell), sc(y + cell)],
                                radius=sc(1.6), fill=color)
    # highlighted cell (max_tokens at ernie) with a ring
    hx, hy = x0 + 1 * pitch, y0 + 5 * pitch
    d.rounded_rectangle([sc(hx - 2), sc(hy - 2), sc(hx + cell + 2),
                         sc(hy + cell + 2)], radius=sc(2.6),
                        fill=p["panel"])
    d.rounded_rectangle([sc(hx), sc(hy), sc(hx + cell), sc(hy + cell)],
                        radius=sc(2), fill=p["accent"])
    # row / column guides
    dashed_line(d, [(x0 - 10, hy + cell / 2), (hx - 4, hy + cell / 2)],
                mix(p["panel"], p["accent"], 0.5), 1.2, 4, 3)
    dashed_line(d, [(hx + cell / 2, hy + cell + 4),
                    (hx + cell / 2, y0 + 12 * pitch + cell + 9)],
                mix(p["panel"], p["accent"], 0.5), 1.2, 4, 3)

    text(d, (940, 150), "11 vendors →", font("regular", 15), p["sub"])
    text(d, (940, 174), "13 params ↓", font("regular", 15), p["sub"])
    d.line([sc(940), sc(194), sc(1352), sc(194)], fill=p["border"], width=sc(1))
    text(d, (940, 224), "max_tokens", font("bold", 20), p["text"])
    text(d, (940, 254), "→ max_output_tokens", font("mono", 18), p["accent"])
    text(d, (940, 279), "pure lookup · no model call", font("regular", 14),
         p["sub"])


def draw_json_panel(img: Image.Image, skin: str) -> None:
    p = PALETTE[skin]
    panel(img, (760, 314, 604, 198), skin)
    d = ImageDraw.Draw(img)
    text(d, (786, 346), "DETERMINISTIC JSON REPAIR", font("bold", 16),
         p["accent"], tracking=1.1)
    text(d, (1338, 346), "never invents data", font("regular", 14), p["sub"],
         anchor="rs")

    # broken JSON card
    d.rounded_rectangle([sc(786), sc(360), sc(1070), sc(496)], radius=sc(12),
                        fill=p["panel2"], outline=p["border"], width=sc(1))
    mono = font("mono", 17)
    lines = [(388, '{', p["faint"]),
             (414, '  "id": 42,', p["sub"]),
             (440, '  "ok": ', p["sub"]),
             (466, '  "tags": ["a", "b"', p["sub"])]
    for baseline, s, color in lines:
        text(d, (804, baseline), s, mono, color)
    # broken token "tru" in red, with a fracture mark
    prefix = '  "ok": '
    px = 804 + width(d, prefix, mono)
    text(d, (px, 440), "tru", mono, p["red"])
    d.line([sc(px), sc(447), sc(px + 28), sc(447)], fill=p["red"], width=sc(2))
    # unclosed marker at the end of the tags line
    endx = 804 + width(d, '  "tags": ["a", "b"', mono)
    d.rectangle([sc(endx + 2), sc(454), sc(endx + 6), sc(470)], fill=p["red"])
    text(d, (804, 486), "unclosed · invalid", font("regular", 13), p["red"])

    # strategy chips
    chips = ["escapeRepair", "trailingComma", "truncationClosure",
             "fieldCompletion (null)"]
    for i, label in enumerate(chips):
        y = 360 + i * 32
        d.rounded_rectangle([sc(1094), sc(y), sc(1338), sc(y + 26)],
                            radius=sc(8), fill=p["green_soft"])
        d.ellipse([sc(1106), sc(y + 9), sc(1112), sc(y + 15)],
                  fill=p["green"])
        text(d, (1122, y + 14), label, font("mono", 14), p["text"], anchor="lm")
    # check mark is drawn (the CJK fonts have no U+2713 glyph)
    text(d, (1094, 504), "→ schema validate", font("bold", 16), p["green"])
    schema_end = 1094 + width(d, "→ schema validate", font("bold", 16))
    check_x, check_y = schema_end + 9, 493
    d.line([sc(check_x), sc(check_y + 5), sc(check_x + 5), sc(check_y + 10),
            sc(check_x + 13), sc(check_y - 2)], fill=p["green"], width=sc(2.4),
           joint="curve")
    # connector from the broken card to the strategies
    d.line([sc(1072), sc(428), sc(1088), sc(428)], fill=p["green"], width=sc(2))
    d.polygon([(sc(1088), sc(424)), (sc(1094), sc(428)), (sc(1088), sc(432))],
              fill=p["green"])


HERO_COPY = {
    "zh": dict(
        kicker="DSH 插件 · 两条独立表面",
        line1="13 个规范参数 × 11 家厂商，字段名一次对上",
        line2="坏 JSON 当场修好，修不动就原样放行",
        subtitle="纯主机端 · 零网络 · 零模型调用 · 零构建",
        meta="Apache-2.0 · DSH ≥0.2.1 <0.3.0 · Node ^22.19 || ≥24.9",
        footer="github.com/PerryLink/dsh-translate",
        version="v0.2.25 · Apache-2.0",
    ),
    "en": dict(
        kicker="DSH PLUGIN · TWO SURFACES",
        line1="13 canonical params × 11 vendors, mapped.",
        line2="Broken JSON fixed; unrepairable untouched.",
        subtitle="Pure host · no network · no model calls",
        meta="Apache-2.0 · DSH ≥0.2.1 <0.3.0 · Node ^22.19 || ≥24.9",
        footer="github.com/PerryLink/dsh-translate",
        version="v0.2.25 · Apache-2.0",
    ),
}


def build_hero(lang: str, skin: str) -> Image.Image:
    p = PALETTE[skin]
    copy = HERO_COPY[lang]
    img = grad_bg(skin)
    add_glow(img, skin)
    add_dots(img, skin)

    draw_lattice_panel(img, skin)
    draw_json_panel(img, skin)

    d = ImageDraw.Draw(img)
    # accent dot + kicker
    d.ellipse([sc(80), sc(108), sc(88), sc(116)], fill=p["accent"])
    text(d, (100, 115), copy["kicker"], font("bold", 17), p["accent"],
         tracking=1.6)

    # title + accent bar
    d.rounded_rectangle([sc(76), sc(158), sc(81), sc(236)], radius=sc(2.5),
                        fill=p["accent"])
    text(d, (100, 236), "dsh-translate", font("bold", 92), p["text"])

    # two value lines
    f1 = fit_font(d, "regular", 27, copy["line1"], 650)
    f2 = fit_font(d, "regular", 27, copy["line2"], 650)
    text(d, (76, 304), copy["line1"], f1, p["text"])
    text(d, (76, 346), copy["line2"], f2, p["text"])

    # subtitle + meta
    text(d, (76, 394), copy["subtitle"], font("regular", 25), p["sub"])
    meta_f = font("mono", 20)
    text(d, (76, 438), copy["meta"], meta_f, p["faint"])
    text(d, (76, 486), "13 × 11 lookup · 4 repair strategies · 0 network calls",
         font("mono", 17), p["faint"])

    # footer rule + footer
    d.line([sc(76), sc(516), sc(1364), sc(516)], fill=p["border"], width=sc(1))
    text(d, (76, 546), copy["footer"], font("regular", 18), p["sub"])
    text(d, (1364, 546), copy["version"], font("mono", 18), p["faint"],
         anchor="rs")

    out = img.convert("RGBA")
    out.putalpha(Image.composite(out.getchannel("A"), Image.new("L", out.size, 0),
                                 rounded_mask()))
    return out.resize((W, H), Image.LANCZOS)


# ---------------------------------------------------------------------------
# Structure diagram: hand-written SVG, 1100 x 660, light + dark.
# ---------------------------------------------------------------------------
def flow_svg(skin: str) -> str:
    p = PALETTE[skin]
    c = lambda key: "#%02x%02x%02x" % p[key][:3]
    G, GS = c("accent"), c("accent_soft")
    TEXT, SUB, FAINT = c("text"), c("sub"), c("faint")
    BORDER, PANEL = c("border"), c("panel")
    GREEN, GREENS = c("green"), c("green_soft")
    AMBER = "#b26a00" if skin == "light" else "#f0b45f"
    RED, REDS = c("red"), c("red_soft")
    BG1, BG2 = c("bg"), c("bg2")
    SANS = ("ui-sans-serif,system-ui,-apple-system,'Segoe UI',"
            "'Noto Sans',sans-serif")
    MONO = ("ui-monospace,SFMono-Regular,'Cascadia Mono',Consolas,"
            "'Liberation Mono',monospace")

    def card(x, y, w, h, fill=PANEL, stroke=BORDER, dash=None):
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="18" '
                f'fill="{fill}" stroke="{stroke}" stroke-width="1" '
                f'filter="url(#soft)"{dash_attr}/>')

    def txt(x, y, s, cls, anchor="start", size=14, fill=None, weight=None,
            mono=False, tracking=None):
        family = MONO if mono else SANS
        attrs = [f'x="{x}"', f'y="{y}"', f'fill="{fill or TEXT}"',
                 f'font-family="{family}"', f'font-size="{size}"']
        if weight:
            attrs.append(f'font-weight="{weight}"')
        if anchor != "start":
            attrs.append(f'text-anchor="{anchor}"')
        if tracking:
            attrs.append(f'letter-spacing="{tracking}"')
        return f'<text {" ".join(attrs)}>{s}</text>'

    def arrow(d, stroke=SUB, marker="arw"):
        return (f'<path d="{d}" fill="none" stroke="{stroke}" '
                f'stroke-width="1.6" stroke-linecap="round" '
                f'stroke-linejoin="round" marker-end="url(#{marker})"/>')

    def chip(x, y, w, h, fill, stroke=None):
        st = f' stroke="{stroke}" stroke-width="1"' if stroke else ""
        return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}"{st}/>'

    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" '
        'viewBox="0 0 1100 660" role="img" '
        'aria-label="dsh-translate: two independent faces - the /translate '
        'rosetta lookup and the tools/post-execute JSON repair state machine">',
        '<title>dsh-translate structure: parameter rosetta + deterministic JSON repair</title>',
        '<desc>Lane A: /translate reads the 13-parameter by 11-vendor rosetta '
        'table and returns a pair mapping. Lane B: tools/post-execute and '
        'fix_json extract a fence, parse, run a bounded strategy loop '
        '(escapeRepair, trailingComma, truncationClosure), complete required '
        'fields with null, validate against the supported schema subset, then '
        'accept a repaired value or call next() and keep the original.</desc>',
        '<defs>',
        f'<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{BG1}"/>'
        f'<stop offset="1" stop-color="{BG2}"/></linearGradient>',
        '<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">'
        f'<circle cx="1" cy="1" r="1" fill="{G}" opacity="0.075"/></pattern>',
        '<filter id="soft" x="-20%" y="-30%" width="140%" height="170%">'
        '<feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#1b2140" '
        'flood-opacity="0.10"/></filter>',
        '<marker id="arw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" '
        f'markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="{SUB}"/></marker>',
        '<marker id="arw-g" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" '
        f'markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="{GREEN}"/></marker>',
        '<marker id="arw-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" '
        f'markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="{G}"/></marker>',
        '</defs>',
        '<rect width="1100" height="660" rx="22" fill="url(#bg)"/>',
        '<rect width="1100" height="660" rx="22" fill="url(#dots)"/>',
        # header
        txt(56, 56, "dsh-translate", None, size=30, weight="700"),
        txt(56, 82, "index.mjs · inject: commands + tools · pure host", None,
            size=14, fill=SUB, mono=True),
        txt(1044, 56, "no network · no model call · no build step", None,
            anchor="end", size=14, fill=SUB, mono=True),
        f'<line x1="56" y1="100" x2="1044" y2="100" stroke="{BORDER}" stroke-width="1"/>',
    ]

    # ---- Lane A: command face -------------------------------------------
    parts += [
        f'<circle cx="68" cy="122" r="11" fill="{GS}"/>',
        txt(68, 126, "A", None, anchor="middle", size=13, fill=G, weight="700"),
        txt(90, 127, "COMMAND FACE · /translate", None, size=14, weight="700",
            tracking="0.4"),
        txt(1044, 127, "lib/rosetta.mjs · pure lookup", None, anchor="end",
            size=14, fill=SUB, mono=True),
        card(56, 142, 254, 124),
        card(338, 142, 374, 124),
        card(738, 142, 306, 124),
        arrow("M312 204 H330", SUB, "arw"),
        arrow("M714 204 H732", SUB, "arw"),
        # A1 command
        txt(74, 168, "/translate", None, size=15, fill=G, weight="700", mono=True),
        txt(74, 196, "openai ernie max_tokens", None, size=15, mono=True),
        txt(74, 222, "from · to · [param]", None, size=14, fill=SUB),
        txt(74, 246, "vendors · params", None, size=14, fill=SUB),
        # A2 rosetta table
        txt(358, 166, "rosetta table", None, size=14, weight="700"),
        txt(694, 166, "13 × 11", None, anchor="end", size=13, fill=SUB, mono=True),
    ]
    x0, y0, pitch, cell = 358, 176, 7, 4
    for row in range(13):
        for col in range(11):
            x = x0 + col * pitch
            y = y0 + row * pitch
            hot = row == 5 or col == 1
            fill = G if hot else BORDER
            op = "1" if hot else "0.9"
            parts.append(f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" '
                         f'rx="1" fill="{fill}" opacity="{op}"/>')
    hx, hy = x0 + 1 * pitch, y0 + 5 * pitch
    parts += [
        f'<rect x="{hx - 2}" y="{hy - 2}" width="{cell + 4}" height="{cell + 4}" '
        f'rx="2" fill="none" stroke="{G}" stroke-width="1"/>',
        txt(450, 198, "11 vendors →", None, size=14, fill=SUB),
        txt(450, 220, "13 params ↓", None, size=14, fill=SUB),
        txt(450, 244, "one cell = one field", None, size=14, fill=FAINT),
        # A3 pair result
        txt(756, 168, "pair view", None, size=14, weight="700"),
        txt(756, 194, "openai (OpenAI) → ernie", None, size=14, mono=True),
        txt(756, 220, "max_tokens", None, size=15, weight="700", mono=True),
        txt(756, 242, "→ max_output_tokens", None, size=14, fill=G, mono=True),
        # Lane A footnote
        txt(56, 290, "pure lookup · zero model calls · transformRequest() "
            "converts a whole standard request", None, size=14, fill=SUB),
        txt(1044, 290, "no state · no side effects", None, anchor="end",
            size=14, fill=FAINT),
    ]

    # ---- Lane B: repair state machine -----------------------------------
    parts += [
        f'<circle cx="68" cy="312" r="11" fill="{GS}"/>',
        txt(68, 316, "B", None, anchor="middle", size=13, fill=G, weight="700"),
        txt(90, 318, "TOOL-RESULT FACE · tools/post-execute + fix_json", None,
            size=14, weight="700", tracking="0.3"),
        txt(1044, 318, "lib/fix.mjs · deterministic", None, anchor="end",
            size=14, fill=SUB, mono=True),
        # band 1
        card(56, 334, 218, 92),
        card(298, 334, 224, 92),
        card(546, 334, 224, 92),
        card(794, 334, 250, 92, fill=PANEL, stroke=G, dash="5 4"),
        arrow("M274 380 H292", SUB, "arw"),
        arrow("M522 380 H540", SUB, "arw"),
        # B1 input
        txt(74, 356, "INPUT", None, size=14, fill=G, weight="700", tracking="1"),
        txt(74, 381, "success result", None, size=17, weight="700"),
        txt(74, 402, "value: string (JSON)", None, size=14, fill=SUB),
        txt(74, 421, "fix_json: shared core", None, size=14, fill=SUB),
        # B2 claim guard
        txt(316, 356, "CLAIM GATE", None, size=14, fill=G, weight="700",
            tracking="1"),
        txt(504, 356, "no → next()", None, anchor="end", size=14, fill=AMBER),
        txt(316, 381, "claims the result?", None, size=17, weight="700"),
        txt(316, 402, "post-execute only", None, size=14, fill=SUB),
        txt(316, 421, "string/json root", None, size=14, fill=SUB),
        # B3 parse
        txt(564, 356, "PARSE", None, size=14, fill=G, weight="700", tracking="1"),
        txt(752, 356, "valid → next()", None, anchor="end", size=14, fill=GREEN),
        txt(564, 381, "extract · parse", None, size=17, weight="700"),
        txt(564, 402, "looksLikeJsonText()", None, size=14, fill=SUB, mono=True),
        txt(564, 421, "fence → parse", None, size=14, fill=SUB),
        # B4 registry boundary note
        txt(812, 356, "REGISTRY BOUNDARY", None, size=14, fill=G, weight="700",
            tracking="0.8"),
        txt(812, 381, "post-execute sees only", None, size=14, fill=SUB),
        txt(812, 402, "successful string values", None, size=14, fill=SUB),
        txt(812, 421, "failures stay failures", None, size=14, fill=SUB),
        # parse -> loop
        arrow("M658 426 V436 H460 V444", SUB, "arw"),
        # band 2
        card(56, 448, 212, 118),
        card(300, 448, 320, 118),
        card(652, 448, 180, 54),
        card(652, 512, 180, 54),
        card(860, 448, 184, 54),
        card(860, 512, 184, 54),
        # audit
        txt(74, 470, "AUDIT · SIDE CHANNEL", None, size=14, fill=G,
            weight="700", tracking="0.6"),
        txt(74, 494, "translate/fix", None, size=14, weight="700", mono=True),
        txt(74, 516, "tool · call · flags", None, size=14, fill=SUB),
        txt(74, 538, "counts, never payload", None, size=14, fill=SUB),
        txt(74, 558, "log-only · cannot block", None, size=14, fill=FAINT),
        # loop
        txt(318, 472, "repair loop", None, size=17, weight="700"),
        txt(602, 472, "≤ maxSteps (8)", None, anchor="end", size=14, fill=SUB),
        chip(318, 486, 284, 23, GS),
        chip(318, 513, 284, 23, GS),
        chip(318, 540, 284, 23, GS),
        txt(330, 502, "escapeRepair", None, size=14, fill=TEXT, mono=True),
        txt(330, 529, "trailingComma", None, size=14, fill=TEXT, mono=True),
        txt(330, 556, "truncationClosure", None, size=14, fill=TEXT, mono=True),
        # field completion + validate
        txt(670, 470, "fieldCompletion", None, size=14, weight="700"),
        txt(670, 490, "required → null", None, size=14, fill=SUB),
        txt(670, 534, "schema validate", None, size=14, weight="700"),
        txt(670, 554, "subset only", None, size=14, fill=SUB),
        # terminals
        txt(878, 470, "accept", None, size=15, fill=GREEN, weight="700"),
        txt(878, 490, "{ kind, value }", None, size=14, fill=SUB, mono=True),
        txt(878, 534, "next()", None, size=15, weight="700"),
        txt(878, 554, "original kept", None, size=14, fill=SUB),
        # connectors
        arrow("M620 507 H636 V475 H648", SUB, "arw"),
        arrow("M742 502 V508", SUB, "arw"),
        arrow("M832 539 H844", SUB, "arw"),
        f'<path d="M844 539 V475 H856" fill="none" stroke="{GREEN}" '
        f'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" '
        f'marker-end="url(#arw-g)"/>',
        arrow("M844 539 H856", GREEN, "arw-g"),
        # footer
        f'<line x1="56" y1="600" x2="1044" y2="600" stroke="{BORDER}" stroke-width="1"/>',
        txt(56, 626, "no invented data · null is a placeholder", None, size=14,
            fill=SUB),
        txt(1044, 626, "accept is re-validated · next() keeps the original",
            None, anchor="end", size=14, fill=SUB),
        '</svg>',
    ]
    return "\n".join(parts) + "\n"


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    for lang in ("zh", "en"):
        for skin in ("light", "dark"):
            img = build_hero(lang, skin)
            path = os.path.join(
                OUT, f"dsh-translate-hero-{lang}-{skin}.webp")
            img.save(path, "WEBP", quality=90, method=6)
            print(f"wrote {os.path.relpath(path, ROOT)}")
    for skin in ("light", "dark"):
        path = os.path.join(OUT, f"dsh-translate-flow-v5-{skin}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(flow_svg(skin))
        print(f"wrote {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()
