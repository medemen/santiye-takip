import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

AMBER_TOP = (251, 191, 36)    # #FBBF24
AMBER_MID = (245, 158, 11)    # #F59E0B
AMBER_BOT = (217, 119, 6)     # #D97706
BUILDING = (31, 41, 55)       # #1F2937
WINDOW = (253, 230, 138)      # #FDE68A
WHITE = (255, 255, 255)
CHECK_SHADOW = (0, 0, 0, 80)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size):
    img = Image.new("RGBA", (size, size))
    px = img.load()
    half = size / 2.0
    for y in range(size):
        if y < half:
            c = lerp(AMBER_TOP, AMBER_MID, y / half)
        else:
            c = lerp(AMBER_MID, AMBER_BOT, (y - half) / half)
        for x in range(size):
            px[x, y] = c + (255,)
    return img


def rounded_bg(size, radius_frac=110 / 512.0):
    img = gradient(size)
    radius = int(size * radius_frac)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def build_scene(size, content_scale=1.0, center=True):
    s = size * content_scale / 512.0
    ox = (size - 512 * s) / 2 if center else 0
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


def save_png(img, rel_path):
    path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    return path


def main():
    created = []

    master = Image.alpha_composite(rounded_bg(512), build_scene(512))
    created.append(save_png(master, "public/icon-512.png"))

    legacy_densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, size in legacy_densities.items():
        img = master.resize((size, size), Image.LANCZOS)
        created.append(save_png(img, f"android/app/src/main/res/{folder}/ic_launcher.png"))
        created.append(save_png(img, f"android/app/src/main/res/{folder}/ic_launcher_round.png"))

    foreground_densities = {
        "mipmap-mdpi": 108,
        "mipmap-hdpi": 162,
        "mipmap-xhdpi": 216,
        "mipmap-xxhdpi": 324,
        "mipmap-xxxhdpi": 432,
    }
    for folder, size in foreground_densities.items():
        fg = build_scene(size, content_scale=0.5, center=True)
        created.append(save_png(fg, f"android/app/src/main/res/{folder}/ic_launcher_foreground.png"))

    for path in created:
        im = Image.open(path)
        print(f"{path} {im.size[0]}x{im.size[1]} {os.path.getsize(path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
