import importlib.util
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# generate-icons.py has a hyphen in its name, so it can't be `import`-ed
# normally; load it dynamically to reuse the crane artwork/palette.
_spec = importlib.util.spec_from_file_location(
    "generate_icons", os.path.join(ROOT, "scripts", "generate-icons.py")
)
_gi = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_gi)
AMBER_TOP, AMBER_MID, AMBER_BOT = _gi.AMBER_TOP, _gi.AMBER_MID, _gi.AMBER_BOT
WHITE = _gi.WHITE
build_scene = _gi.build_scene
lerp = _gi.lerp
W, H = 4096, 2304
FONT_DIR = "C:\\Windows\\Fonts"


def load_config():
    with open(os.path.join(ROOT, "data", "santiye.config.json"), "r", encoding="utf-8") as f:
        return json.load(f)


def bg(w, h):
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


def main():
    cfg = load_config()
    app_name = cfg["marka"]["appName"]
    tagline = "Saha Rapor ve İlerleme Takip Sistemi"

    img = bg(W, H)

    # soft light panel behind the crane, keeps the hero area airy
    d = ImageDraw.Draw(img)
    d.ellipse([1760, 520, 4400, 2920], fill=(255, 255, 255, 225))

    # hero scene: centered crane under centered title/tagline
    crane_size = 1300
    crane = build_scene(crane_size, content_scale=1.0, center=True)
    img.alpha_composite(crane, ((W - crane_size) // 2, 1080))

    d = ImageDraw.Draw(img)
    title_font = ImageFont.truetype(os.path.join(FONT_DIR, "arialbd.ttf"), 190)
    tag_font = ImageFont.truetype(os.path.join(FONT_DIR, "arial.ttf"), 84)
    d.text((W / 2, 560), app_name, font=title_font, fill=WHITE, anchor="mm")
    d.text((W / 2, 800), tagline, font=tag_font, fill=(255, 255, 255, 235), anchor="mm")

    out = Image.new("RGB", (W, H), (255, 255, 255))
    out.paste(img, (0, 0), img)
    out_path = os.path.join(ROOT, "play-console", "developer-header.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, "PNG", optimize=True)
    print(f"{out_path} {out.size[0]}x{out.size[1]} {os.path.getsize(out_path) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
