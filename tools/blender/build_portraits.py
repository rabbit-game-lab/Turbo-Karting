"""Render lightweight menu portraits from the same authored racer geometry."""
import bpy
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from common import clear_scene, camera_at, area, MATERIALS
from kart import build_kart

content = (ROOT / 'src/data/content.ts').read_text()
visuals = (ROOT / 'src/data/visuals.ts').read_text()
output = ROOT / 'public/assets/portraits'
output.mkdir(parents=True, exist_ok=True)


def tint(name, color):
    rgb = [int(color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v < .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
    mat = MATERIALS[name]
    mat.diffuse_color = (*linear, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*linear, 1)


for index, match in enumerate(re.finditer(
    r"id: '(\w+)', name: '[^']+', weightClass: '(\w+)', color: '(#[\da-f]+)', accent: '(#[\da-f]+)'", content
)):
    racer, weight, paint, accent = match.groups()
    visual = re.search(rf"{racer}: \{{ fur: '(#[\da-f]+)', ears: ([\d.]+), width: ([\d.]+), accessory: '(\w+)'", visuals)
    fur, ears, width, accessory = visual.groups()
    clear_scene()
    build_kart(weight)
    tint('Paint', paint)
    tint('Accent', accent)
    tint('Fur', fur)
    for obj in bpy.context.scene.objects:
        # Explicit descendant visibility: hiding an empty does not hide its meshes.
        ancestor = obj
        while ancestor:
            if ancestor.name.startswith('Accessory_'):
                obj.hide_render = ancestor.name != f'Accessory_{accessory}'
                break
            ancestor = ancestor.parent
    head = bpy.data.objects['Head']
    head.rotation_euler.y = math.radians((-5, 3, -7, 2, 5, -3, 0, 6)[index])
    head.scale.x = float(width)
    for name in ('Ear_L', 'Ear_R'):
        bpy.data.objects[name].scale.z = float(ears)
    camera = camera_at('Portrait camera', (1.3, 6, 2.9), (0, -.1, 2.08))
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.65
    area('Soft key', (2, 4, 6), 420, 4, (1, .88, .73))
    area('Sky fill', (-3, 2, 3), 230, 3, (.65, .82, 1))
    area('Edge light', (1, -3, 4), 600, 2, (1, .9, .75))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.world.color = (.16, .16, .16)
    scene.render.film_transparent = True
    scene.render.resolution_x = 320
    scene.render.resolution_y = 400
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = str(output / f'{racer}.png')
    bpy.ops.render.render(write_still=True)
    print('PORTRAIT COMPLETE', racer)
