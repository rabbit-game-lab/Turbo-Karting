"""Build compact GLBs and true transparent render icons from the same models."""
import bpy
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from common import clear_scene, merge_static_parts, export_glb, camera_at, area
from props import bake_vertex_palette
from items import ITEM_IDS, build_item

out = ROOT / 'public/assets/blender'
icons = ROOT / 'public/assets/icons'
source = ROOT / 'art/blender'
icons.mkdir(parents=True, exist_ok=True)
report = {}
for item in ITEM_IDS:
    clear_scene()
    root = build_item(item)
    merge_static_parts()
    camera = camera_at('Icon camera', (2.8, 4.2, 2.3), (0, 0, .12))
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.25
    area('Key', (1, 3, 5), 500, 4, (1, .88, .72))
    area('Rim', (-3, -2, 3), 650, 3, (.65, .88, 1))
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = 192
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.filepath = str(icons / f'{item}.png')
    bpy.ops.wm.save_as_mainfile(filepath=str(source / f'item-{item}.blend'))
    bpy.ops.render.render(write_still=True)
    # One vertex-colored primitive per power-up keeps hazard instancing cheap.
    bpy.context.view_layer.update()
    for obj in scene.objects:
        if obj.type == 'MESH':
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world
    bake_vertex_palette()
    merge_static_parts()
    for obj in scene.objects:
        if obj.type == 'MESH':
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    path = out / f'item-{item}.glb'
    export_glb(path)
    triangles = 0
    for obj in scene.objects:
        if obj.type == 'MESH':
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
    report[item] = {'triangles': triangles, 'bytes': path.stat().st_size}
(source / 'item-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('HARELINE ITEM REPORT', report)
