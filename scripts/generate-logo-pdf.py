"""Generate horizontal letterhead PNG for react-pdf (Arabic + key icon)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "brand" / "logo-pdf.png"
FONT_BOLD = ROOT / "public" / "fonts" / "Tajawal-Bold.ttf"
FONT_REG = ROOT / "public" / "fonts" / "Tajawal-Regular.ttf"

NAVY = (0, 51, 102, 255)
MUTED = (26, 82, 118, 255)


def draw_key_icon(draw: ImageDraw.ImageDraw, x: int, y: int, scale: float = 1.0) -> None:
    s = scale
    w = max(2, int(3 * s))
    draw.polygon(
        [
            (x + 40 * s, y + 6 * s),
            (x + 70 * s, y + 26 * s),
            (x + 70 * s, y + 50 * s),
            (x + 10 * s, y + 50 * s),
            (x + 10 * s, y + 26 * s),
        ],
        outline=NAVY,
        width=w,
    )
    draw.line([(x + 28 * s, y + 34 * s), (x + 52 * s, y + 34 * s)], fill=NAVY, width=max(1, int(2 * s)))
    draw.line([(x + 40 * s, y + 28 * s), (x + 40 * s, y + 46 * s)], fill=NAVY, width=max(1, int(2 * s)))
    draw.line([(x + 40 * s, y + 50 * s), (x + 40 * s, y + 100 * s)], fill=NAVY, width=w)
    draw.line([(x + 40 * s, y + 64 * s), (x + 58 * s, y + 64 * s)], fill=NAVY, width=max(2, int(2 * s)))
    draw.line([(x + 40 * s, y + 78 * s), (x + 54 * s, y + 78 * s)], fill=NAVY, width=max(2, int(2 * s)))
    draw.line([(x + 40 * s, y + 100 * s), (x + 52 * s, y + 100 * s)], fill=NAVY, width=max(2, int(2 * s)))


def main() -> None:
    W, H = 900, 180
    img = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    draw = ImageDraw.Draw(img)

    title_font = ImageFont.truetype(str(FONT_BOLD), 36)
    sub_font = ImageFont.truetype(str(FONT_REG), 19)
    phone_font = ImageFont.truetype(str(FONT_BOLD), 18)

    draw_key_icon(draw, W - 118, 30, 1.08)

    # Logical Arabic — Tajawal shapes glyphs natively (no arabic_reshaper).
    title = "شركة ركائز التطوير"
    subtitle = "للاستثمار العقاري و المقاولات العامة"
    phones = "0917920536    0928275932"

    draw.text((32, 30), title, font=title_font, fill=NAVY)
    draw.text((32, 76), subtitle, font=sub_font, fill=MUTED)
    draw.text((32, 118), phones, font=phone_font, fill=NAVY)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, "PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
