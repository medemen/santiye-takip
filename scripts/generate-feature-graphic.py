import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AMBER_TOP = (251, 191, 36)    # #FBBF24
AMBER_MID = (245, 158, 11)    # #F59E0B
AMBER_BOT = (217, 119, 6)     # #D97706
BUILDING = (31, 41, 55)       # #1F2937
WINDOW = (253, 230, 138)      # #FDE68A
WHITE = (255, 255, 255)
CHECK_SHADOW = (0, 0, 0, 80)

W, H = 1024, 500

FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_SEMIBOLD = r"C:\Windows\Fonts\seguisb.ttf"


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient_bg(w, h):
    img = Image.new("RGBA", (w, h))
    px = img.load()
    half = h / 2.0
    for y in range(h):
        if y < half:
            c = lerp(AMBER_TOP, AMBER_MID, y / half)
        else:
            c = lerp(AMBER_MID, AMBER_BOT, (y - half) / half)
        for x in range(w):
            px[x, y] = c + (255,)
    return img


def build_scene(size, content_scale=1.0):
    s = size * content_scale / 512.0
    ox = (size - 512 * s) / 2
    oy = ox

    def X(v):
        return ox + v * s

    def Y(v):
        return oy + v * s

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    base = 432
    towers = [
        (70, 180, 300),
        (195, 305, 230),
        (320, 445, 340),
    ]

    d.ellipse([X(56), Y(436), X(456), Y(472)], fill=(0, 0, 0, 55))

    xstep, ystep, ww, wh = 56, 62, 30, 40
    for x0, x1, top in towers:
        d.rectangle([X(x0), Y(top), X(x1), Y(base)], fill=BUILDING)
        startx = x0 + 22
        while startx + ww <= x1 - 16:
            y = top + 26
            while y + wh <= base - 14:
                d.rectangle([X(startx), Y(y), X(startx + ww), Y(y + wh)], fill=WINDOW)
                y += ystep
            startx += xstep

    pts = [(130, 300), (232, 405), (395, 180)]
    scaled = [(X(p[0]), Y(p[1])) for p in pts]
    d.line(scaled, fill=CHECK_SHADOW, width=max(1, int(62 * s)), joint="curve")
    d.line(scaled, fill=WHITE, width=max(1, int(48 * s)), joint="curve")

    return img


def main():
    canvas = gradient_bg(W, H)

    # Icon scene, left side
    icon_size = 360
    icon = build_scene(icon_size)
    icon_x = 44
    icon_y = (H - icon_size) // 2
    canvas.alpha_composite(icon, (icon_x, icon_y))

    d = ImageDraw.Draw(canvas)

    text_x = icon_x + icon_size + 36
    right_margin = 44
    max_text_w = W - text_x - right_margin

    title = "Şantiye Takip"
    subtitle = "İlerleme Takip Sistemi"

    title_size = 72
    while title_size > 20:
        title_font = ImageFont.truetype(FONT_BOLD, title_size)
        bbox = d.textbbox((0, 0), title, font=title_font)
        if bbox[2] - bbox[0] <= max_text_w:
            break
        title_size -= 2
    title_bbox = d.textbbox((0, 0), title, font=title_font)

    subtitle_size = 32
    while subtitle_size > 14:
        subtitle_font = ImageFont.truetype(FONT_SEMIBOLD, subtitle_size)
        bbox = d.textbbox((0, 0), subtitle, font=subtitle_font)
        if bbox[2] - bbox[0] <= max_text_w:
            break
        subtitle_size -= 2
    subtitle_bbox = d.textbbox((0, 0), subtitle, font=subtitle_font)

    title_h = title_bbox[3] - title_bbox[1]
    subtitle_h = subtitle_bbox[3] - subtitle_bbox[1]
    gap = 22
    block_h = title_h + gap + subtitle_h
    title_y = (H - block_h) // 2 - title_bbox[1]

    shadow = (0, 0, 0, 70)
    d.text((text_x + 3, title_y + 3), title, font=title_font, fill=shadow)
    d.text((text_x, title_y), title, font=title_font, fill=WHITE)

    subtitle_y = title_y + title_h + gap
    d.text((text_x + 2, subtitle_y + 2), subtitle, font=subtitle_font, fill=shadow)
    d.text((text_x, subtitle_y), subtitle, font=subtitle_font, fill=(31, 41, 55))

    out = canvas.convert("RGB")
    path = os.path.join(ROOT, "public", "feature-graphic.png")
    out.save(path, "PNG", optimize=True)
    print(f"{path} {out.size[0]}x{out.size[1]} {os.path.getsize(path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
