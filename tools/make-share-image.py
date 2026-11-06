# Builds public/images/share.jpg — the 1200x630 preview card shown when the site link
# is pasted into a text, WhatsApp, iMessage, Instagram DM, LinkedIn, etc.
# Usage: python3 tools/make-share-image.py
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "public/images/innocence.jpg")
OUT = os.path.join(ROOT, "public/images/share.jpg")
W, H = 1200, 630
INK, WHITE, BONE, GOLD, STONE = (10, 10, 10), (255, 255, 255), (212, 208, 200), (201, 163, 78), (163, 163, 163)

def font(size, light=False):
    for cand in ([
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ] if not light else [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-ExtraLight.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]):
        if os.path.exists(cand):
            return ImageFont.truetype(cand, size)
    return ImageFont.load_default()

img = Image.new("RGB", (W, H), INK)
d = ImageDraw.Draw(img)

# Painting, whole, inside a white mat on the right
art = Image.open(ART).convert("RGB")
mat_w, mat_h = 540, 470
pad = 14
box_w, box_h = mat_w - 2 * pad, mat_h - 2 * pad
scale = min(box_w / art.width, box_h / art.height)
art = art.resize((int(art.width * scale), int(art.height * scale)), Image.LANCZOS)
mx, my = W - 60 - mat_w, (H - mat_h) // 2
d.rectangle([mx, my, mx + mat_w, my + mat_h], fill=WHITE)
img.paste(art, (mx + (mat_w - art.width) // 2, my + (mat_h - art.height) // 2))

# Words on the left
x = 60
d.text((x, 118), "THE ARTIST", font=font(16), fill=GOLD, spacing=4)
f_big = font(54, light=True)
d.text((x, 160), "Roosevelt", font=f_big, fill=WHITE)
d.text((x, 222), "Washington.", font=f_big, fill=WHITE)
f_mid = font(34, light=True)
d.text((x, 310), "Every piece by", font=f_mid, fill=WHITE)
d.text((x, 352), "his own hand.", font=f_mid, fill=WHITE)
d.line([(x, 430), (x + 72, 430)], fill=GOLD, width=2)
d.text((x, 452), "rooseveltwashington.art", font=font(22), fill=BONE)
d.text((x, 486), "Innocence · limited prints · originals by inquiry", font=font(15), fill=STONE)

# Tricolor hairline at the bottom
third = W // 3
d.rectangle([0, H - 3, third, H], fill=(46, 90, 68))
d.rectangle([third, H - 3, 2 * third, H], fill=GOLD)
d.rectangle([2 * third, H - 3, W, H], fill=(156, 74, 42))

img.save(OUT, "JPEG", quality=88, optimize=True)
print(OUT, os.path.getsize(OUT) // 1024, "KB")
