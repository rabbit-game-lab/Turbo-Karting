"""Meadow props follow art/references/landmark-meadow.png."""
import bpy
import math
from common import group, material, tube, box, sphere, cone, rock


def orchard():
    root = group('OrchardTree')
    bark = material('OrchardBark', '#67442f', .95)
    leaves = material('OrchardLeaves', '#4c9343', .9)
    light = material('OrchardSunlitLeaves', '#83b751', .9)
    apple = material('OrchardApple', '#eb6740', .65)
    tube('Curved trunk', [(0, 0, 0), (.16, 0, 1.1), (-.1, .08, 2.4), (0, 0, 3.6)], .25, bark, root)
    for i in range(5):
        a = i / 5 * math.tau
        x, y = math.cos(a), math.sin(a)
        tube('Branch', [(0, 0, 1.6), (x * .8, y * .8, 2.5), (x * 1.2, y * 1.2, 3)], .1, bark, root)
        rock('Leaf cluster', (x * 1.1, y * 1.1, 3.5 + i % 2 * .3), (1.4, 1.3, 1.2), light if i % 2 else leaves, root, i)
        for j in range(2):
            sphere('Apple', (x * 1.7 + j * .25, y * 1.7, 3.1 + j * .3), (.16, .16, .19), apple, root, 8, 4)
    rock('Crown', (0, 0, 4.4), (1.55, 1.55, 1.3), light, root, 7)
    return root


def windmill():
    root = group('OrchardWindmill')
    ivory = material('MillIvory', '#fff0d6', .75)
    teal = material('MillTeal', '#316e73', .65)
    wood = material('MillWood', '#8c5b39', .8)
    gold = material('MillGold', '#dca656', .4, .15)
    cone('Tapered tower', (0, 0, 4), 3.2, 12, ivory, root)
    cone('Roof', (0, 0, 10), 3, 5, teal, root)
    box('Door', (0, 2.3, 1.4), (1.2, .3, 2.6), wood, root, .3)
    for side in (-1, 1):
        box('Tower frame', (side * 1.8, 1.8, 3), (.25, .3, 5.5), teal, root)
    for i in range(4):
        a = i / 4 * math.tau + .3
        x, z = math.cos(a), math.sin(a)
        tube('Sail frame', [(0, 2.4, 7), (x * 5, 2.4, 7 + z * 5)], .12, wood, root)
        sail = box('Ivory sail', (x * 3.1, 2.4, 7 + z * 3.1), (3.4, .14, .85), ivory, root, .04)
        sail.rotation_euler.y = -a
        for j in range(3):
            tube('Sail rib', [(x * (2 + j), 2.55, 7 + z * (2 + j) - .35),
                              (x * (2 + j), 2.55, 7 + z * (2 + j) + .35)], .035, gold, root)
    sphere('Hub', (0, 2.6, 7), (.45, .3, .45), gold, root, 16, 8)
    return root


def bake_vertex_palette():
    """Bake flat base colors into vertices, then merge to one instanced primitive."""
    palette = material('VertexPalette', '#ffffff', .8)
    shader = palette.node_tree.nodes.get('Principled BSDF')
    color_node = palette.node_tree.nodes.new('ShaderNodeVertexColor')
    color_node.layer_name = 'Color'
    palette.node_tree.links.new(color_node.outputs['Color'], shader.inputs['Base Color'])
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH':
            continue
        base = obj.data.materials[0].diffuse_color
        attribute = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
        for corner in attribute.data:
            corner.color = base
        obj.data.materials.clear()
        obj.data.materials.append(palette)
