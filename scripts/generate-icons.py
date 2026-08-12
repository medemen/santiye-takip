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

    # ground shadow
    d.ellipse([X(150), Y(438), X(362), Y(472)], fill=(0, 0, 0, 55))

    # foundation
    d.rectangle([X(196), Y(404), X(316), Y(432)], fill=BUILDING)

    # mast (vertical tower)
    mast_l, mast_r = 244, 268
    mast_top, mast_bot = 150, 410
    d.rectangle([X(mast_l), Y(mast_top), X(mast_r), Y(mast_bot)], fill=BUILDING)

    # operator cab, just below the jib
    d.rectangle([X(230), Y(150), X(282), Y(182)], fill=BUILDING)
    d.rectangle([X(240), Y(159), X(272), Y(173)], fill=WINDOW)

    # cathead (apex above the jib, anchors the support cables)
    apex_top = 84
    jib_top, jib_bot = 128, 150
    d.rectangle([X(242), Y(apex_top + 10), X(270), Y(jib_top)], fill=BUILDING)
    d.polygon(
        [(X(240), Y(apex_top + 14)), (X(272), Y(apex_top + 14)), (X(256), Y(apex_top))],
        fill=BUILDING,
    )

    # jib (long, right) and counter-jib (short, left)
    jib_left, jib_right = 128, 452
    d.rectangle([X(jib_left), Y(jib_top), X(jib_right), Y(jib_bot)], fill=BUILDING)

    # support cables from the apex to both jib tips
    cable_w = max(1, int(11 * s))
    apex_pt = (X(256), Y(apex_top))
    d.line([apex_pt, (X(jib_right - 14), Y(jib_top))], fill=WHITE, width=cable_w, joint="curve")
    d.line([apex_pt, (X(jib_left + 14), Y(jib_top))], fill=WHITE, width=cable_w, joint="curve")

    # counterweight, hanging from the short counter-jib end
    d.rectangle([X(jib_left + 4), Y(jib_bot), X(jib_left + 52), Y(jib_bot + 42)], fill=BUILDING)

    # hoist line and hook block, hanging from the long jib end
    hook_x = jib_right - 34
    hook_w = max(1, int(9 * s))
    d.line([(X(hook_x), Y(jib_bot)), (X(hook_x), Y(296))], fill=BUILDING, width=hook_w)
    d.rectangle([X(hook_x - 24), Y(296), X(hook_x + 24), Y(332)], fill=WINDOW)

    return img


def save_png(img, rel_path):
    path = os.path.join(ROOT, rel_path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG", optimize=True)
    return path


def developer_icon(size=512):
    """Play Console developer page icon: 24-bit PNG, no transparency."""
    img = gradient(size)
    img.alpha_composite(build_scene(size))
    return img.convert("RGB")


def main():
    created = []

    master = Image.alpha_composite(rounded_bg(512), build_scene(512))
    created.append(save_png(master, "public/icon-512.png"))

    dev_icon = developer_icon(512)
    created.append(save_png(dev_icon, "play-console/developer-icon.png"))

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
