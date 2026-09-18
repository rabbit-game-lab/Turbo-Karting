"""Run with Blender --background --python tools/blender/build_assets.py.
All output is authored locally. No downloaded models, texture sets or add-ons.
"""
import bpy
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from common import clear_scene, merge_static_parts, export_glb, camera_at, area, material, box
from kart import build_kart
from landmarks import build_landmark
from props import orchard, windmill, bake_vertex_palette

out = ROOT / 'public/assets/blender'
source = ROOT / 'art/blender'
out.mkdir(parents=True, exist_ok=True)
source.mkdir(parents=True, exist_ok=True)
report = {}
for weight in ('light', 'medium', 'heavy'):
    clear_scene()
    root = build_kart(weight)
    root['art_reference'] = f'art/references/kart-{weight}.png'
    merge_static_parts()
    triangles = 0
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            obj.data.calc_loop_triangles()
            triangles += len(obj.data.loop_triangles)
    path = out / f'kart-{weight}.glb'
    export_glb(path)
    report[weight] = {'triangles': triangles, 'bytes': path.stat().st_size}
    bpy.ops.wm.save_as_mainfile(filepath=str(source / f'kart-{weight}.blend'))
    # Decimated meshes keep all named articulation pivots and material identities.
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and len(obj.data.polygons) > 30:
            bpy.context.view_layer.objects.active = obj
            mod = obj.modifiers.new('Mobile LOD', 'DECIMATE')
            mod.ratio = .3
            bpy.ops.object.modifier_apply(modifier=mod.name)
    export_glb(out / f'kart-{weight}-low.glb')

for theme in ('meadow', 'desert', 'snow', 'neon'):
    clear_scene()
    root = build_landmark(theme)
    root['art_reference'] = f'art/references/landmark-{theme}.png'
    merge_static_parts()
    export_glb(out / f'landmark-{theme}.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(source / f'landmark-{theme}.blend'))

for name, build in (('orchard', orchard), ('windmill', windmill)):
    clear_scene()
    root = build()
    root['art_reference'] = 'art/references/landmark-meadow.png'
    if name == 'orchard':
        bake_vertex_palette()
    merge_static_parts()
    if name == 'orchard':
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                bpy.context.view_layer.objects.active = obj
                obj.select_set(True)
                bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
                obj.select_set(False)
    export_glb(out / f'prop-{name}.glb')
    bpy.ops.wm.save_as_mainfile(filepath=str(source / f'prop-{name}.blend'))

# A reproducible review render, never included in the runtime payload.
clear_scene()
build_kart('medium')
for obj in bpy.context.scene.objects:
    if obj.parent and obj.parent.name in ('Accessory_cap', 'Accessory_bow'):
        obj.hide_render = True
box('Studio floor', (0, 0, -.12), (200, 200, .12), material('Studio', '#274855', .8), bevel=0)
camera = camera_at('Review camera', (4.5, 6.3, 3.8), (0, 0, 1.25))
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 4.9
area('Warm key', (1, 4, 7), 950, 5, (1, .88, .72))
area('Cool fill', (-4, 1, 4), 600, 4, (.63, .84, 1))
area('Rim', (0, -4, 5), 1200, 3, (.6, 1, 1))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.world.color = (.22, .22, .22)
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(source / 'hero-review.png')
bpy.ops.wm.save_as_mainfile(filepath=str(source / 'hero-review.blend'))
bpy.ops.render.render(write_still=True)
(source / 'asset-report.json').write_text(json.dumps(report, indent=2) + '\n')
print('HARELINE ASSET REPORT', report)
