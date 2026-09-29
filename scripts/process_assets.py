"""
素材处理：design/raw/*.jpg -> design/dist/images/**
产物整体上传到 OSS 的 baby/images/ 目录（与 miniprogram/constants/assets.ts 对应）

- 角色/插画：按边缘连通区域抠除纯色背景 -> 裁切 -> 等比缩放 -> 256 色量化 PNG
- 场景图：缩放 -> JPG 压缩

用法：python scripts/process_assets.py   (依赖 pillow numpy)
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "design", "raw")
OUT = os.path.join(ROOT, "design", "dist", "images")

# name: (输出路径, 最大边长, 背景容差：>=1 为 RGB 通道差，<1 为 Lab ΔE/100)
CUTOUTS = {
    "char_fox": ("characters/fox.png", 360, 34),
    "char_dino": ("characters/dino.png", 360, 34),
    "char_bunny": ("characters/bunny.png", 360, 0.12),
    "char_robot": ("characters/robot.png", 360, 30),
    "char_bear": ("characters/bear.png", 360, 34),
    "char_penguin": ("characters/penguin.png", 360, 40),
    "device_phone": ("illus/device_phone.png", 400, 30),
    "fox_phone": ("illus/fox_phone.png", 400, 34),
    "state_success": ("illus/success.png", 400, 30),
    "state_offline": ("illus/offline.png", 400, 30),
}

# name: (输出路径, 宽度, jpg 质量)
SCENES = {
    "banner_call": ("scenes/banner_call.jpg", 720, 80),
    "banner_space": ("scenes/banner_space.jpg", 720, 80),
    "banner_story": ("scenes/banner_story.jpg", 720, 80),
    "call_night": ("scenes/call_night.jpg", 600, 78),
    "world_forest": ("scenes/world_forest.jpg", 720, 78),
    "scene_login": ("scenes/login.jpg", 640, 80),
    "scene_friends": ("scenes/friends.jpg", 720, 80),
}


def estimate_bg(arr: np.ndarray) -> np.ndarray:
    border = np.concatenate([arr[0], arr[-1], arr[:, 0], arr[:, -1]])
    return np.median(border, axis=0)


def rgb_to_lab(arr: np.ndarray) -> np.ndarray:
    c = arr / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    m = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ m.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def remove_bg(img: Image.Image, tol: float) -> Image.Image:
    """tol >= 1 按 RGB 最大通道差；tol < 1 表示按 Lab ΔE（tol*100），适合彩色背景"""
    arr = np.asarray(img.convert("RGB")).astype(np.float64)
    h, w, _ = arr.shape
    bg = estimate_bg(arr)
    if tol < 1:
        diff = np.linalg.norm(rgb_to_lab(arr) - rgb_to_lab(bg[None, None, :])[0, 0], axis=2)
        bg_like = diff <= tol * 100
    else:
        diff = np.abs(arr - bg).max(axis=2)
        bg_like = diff <= tol

    # 从四周边缘开始 BFS，只移除与边缘连通的背景
    visited = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bg_like[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg_like[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bg_like[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    alpha = np.where(visited, 0, 255).astype(np.uint8)
    mask = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    return rgba


def trim(img: Image.Image, pad_ratio: float = 0.04) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    side = max(r - l, b - t)
    pad = int(side * pad_ratio)
    side += pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img.crop(bbox), ((side - (r - l)) // 2, (side - (b - t)) // 2))
    return canvas


def save_png(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
        path, optimize=True
    )


def main() -> None:
    for name, (out, size, tol) in CUTOUTS.items():
        img = Image.open(os.path.join(RAW, f"{name}.jpg"))
        cut = trim(remove_bg(img, tol))
        cut.thumbnail((size, size), Image.LANCZOS)
        dst = os.path.join(OUT, out)
        save_png(cut, dst)
        print(f"{out:32s} {os.path.getsize(dst) // 1024:4d} KB")

    for name, (out, width, quality) in SCENES.items():
        img = Image.open(os.path.join(RAW, f"{name}.jpg")).convert("RGB")
        ratio = width / img.width
        img = img.resize((width, int(img.height * ratio)), Image.LANCZOS)
        dst = os.path.join(OUT, out)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        img.save(dst, quality=quality, optimize=True, progressive=True)
        print(f"{out:32s} {os.path.getsize(dst) // 1024:4d} KB")


if __name__ == "__main__":
    main()
