"""Ten readable power-up silhouettes, modeled after art/references/item-*.png."""
import bpy
import math
from common import group, material, finish, sphere, tube, torus

ITEM_IDS = ('berry-slick', 'acorn-bolt', 'beet-seeker', 'crown-comet',
            'carrot-turbo', 'triple-carrot', 'golden-carrot', 'lucky-clover',
            'storm-bell', 'burrow-bomb')


def lathe(name, profile, mat, parent, segments=24):
    vertices, faces = [], []
    for z, radius in profile:
        for i in range(segments):
            angle = i * math.tau / segments
            vertices.append((math.cos(angle) * radius, math.sin(angle) * radius, z))
    for ring in range(len(profile) - 1):
        for i in range(segments):
            a = ring * segments + i
            b = ring * segments + (i + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, parent)


def leaf(name, p, scale, mat, parent, angle=0):
    obj = sphere(name, p, scale, mat, parent, 12, 6)
    obj.rotation_euler.y = angle
    return obj


def carrot(root, gold=False):
    orange = material('ItemGold' if gold else 'ItemOrange', '#efbd48' if gold else '#f27b23', .3, .7 if gold else .1)
    green = material('ItemLeaf', '#38894d', .4)
    trim = material('ItemTrim', '#ffe3a2', .28, .6)
    profile = [(-.65, .015), (-.55, .1), (-.25, .22), (.05, .32),
               (.34, .4), (.48, .39), (.56, .3), (.57, .02)]
    lathe('Carrot body', profile, orange, root)
    torus('Collar', (0, 0, .48), .32, .035, trim, root, segments=20)
    for i in range(3):
        x = (i - 1) * .2
        leaf('Leaf blade', (x, 0, .8), (.13, .08, .38), green, root, -(i - 1) * .5)
    for z, radius in ((-.25, .223), (.04, .325), (.31, .39)):
        torus('Shallow groove', (0, 0, z), radius, .012, trim if gold else orange, root, segments=20)
    if gold:
        torus('Gold halo', (0, .12, .3), .76, .027, trim, root, rotation=(math.pi / 2, 0, 0))


def build_item(item):
    root = group(f'Item_{item}')
    root['reference'] = f'art/references/item-{item}.png'
    gold = material('ItemTrim', '#ffe3a2', .28, .6)
    ivory = material('ItemIvory', '#fff4dc', .38)
    green = material('ItemLeaf', '#38894d', .4)
    cyan = material('ItemCyan', '#60dfea', .28, .15, .12)
    if item == 'berry-slick':
        red = material('ItemBerry', '#c92559', .2)
        sphere('Slick', (0, 0, -.2), (.95, .75, .1), red, root, 24, 6)
        for i in range(3):
            a = i / 3 * math.tau
            sphere('Berry', (.24 * math.cos(a), .24 * math.sin(a), .03), (.28, .28, .3), red, root, 16, 8)
        for side in (-1, 1):
            leaf('Berry leaf', (side * .3, .15, .42), (.17, .07, .32), green, root, side * .65)
    elif item in ('acorn-bolt', 'beet-seeker'):
        beet = item == 'beet-seeker'
        body = material('ItemBeet' if beet else 'ItemAcorn', '#853b71' if beet else '#b97c3b', .35)
        cap = material('ItemAcornCap', '#59442e', .55)
        sphere('Projectile body', (0, .05, 0), (.38, .63, .38), body, root, 24, 12)
        sphere('Rear cap', (0, -.35, 0), (.4, .24, .4), body if beet else cap, root, 20, 8)
        torus('Rear rim', (0, -.52, 0), .22, .05, cyan if not beet else gold, root, rotation=(math.pi / 2, 0, 0))
        for i in range(3):
            a = i / 3 * math.tau
            fin = leaf('Leaf fin', (math.cos(a) * .44, -.38, math.sin(a) * .44), (.12, .26, .31), green if beet else ivory, root)
            fin.rotation_euler.y = math.pi / 2 - a
        if beet:
            sphere('Amber seeker', (0, .65, 0), (.12, .1, .12), gold, root, 12, 6)
    elif item == 'crown-comet':
        blue = material('ItemComet', '#3767cb', .22, .12)
        sphere('Comet', (0, 0, 0), (.48, .48, .48), blue, root, 24, 12)
        torus('Crown base', (0, 0, .48), .27, .04, gold, root)
        for i in range(5):
            a = i * math.tau / 5
            x, y = math.cos(a) * .29, math.sin(a) * .29
            tube('Crown point', [(x * .8, y * .8, .45), (x, y, .66)], .035, gold, root)
            sphere('Crown jewel', (x, y, .67), (.06, .06, .06), gold, root, 8, 4)
        for side in (-1, 1):
            leaf('Ear fin', (side * .48, -.15, .44), (.13, .07, .4), ivory, root, side * .55)
        for i in range(3):
            tube('Comet tail', [((i - 1) * .2, -.2, -.2), ((i - 1) * .3, -.6, -.25),
                                ((i - 1) * .13, -1.1, .04)], .075, cyan, root)
    elif item in ('carrot-turbo', 'golden-carrot'):
        carrot(root, item == 'golden-carrot')
    elif item == 'triple-carrot':
        for i in range(3):
            a = i * math.tau / 3
            child = group(f'Carrot_{i}', parent=root)
            carrot(child)
            child.scale = (.6, .6, .6)
            child.location = (math.cos(a) * .5, math.sin(a) * .5, 0)
        torus('Orbit', (0, 0, 0), .53, .045, cyan, root)
    elif item == 'lucky-clover':
        for i in range(4):
            a = i * math.tau / 4 + math.pi / 4
            for side in (-1, 1):
                x = math.cos(a) * .3 + math.cos(a + math.pi / 2) * side * .12
                z = math.sin(a) * .3 + math.sin(a + math.pi / 2) * side * .12 + .18
                leaf('Heart leaf', (x, 0, z), (.22, .09, .25), green, root, a)
        sphere('Gold center', (0, .11, .18), (.12, .06, .12), gold, root, 16, 8)
        tube('Curved stem', [(0, 0, .1), (.07, 0, -.35), (-.15, 0, -.6)], .055, green, root)
    elif item == 'storm-bell':
        blue = material('ItemBell', '#42648a', .34, .3)
        lathe('Bell', [(-.42, .52), (-.36, .54), (-.29, .42), (.25, .28), (.4, .17), (.42, .02)], blue, root)
        torus('Bell rim', (0, 0, -.35), .5, .05, gold, root)
        torus('Bell handle', (0, 0, .59), .15, .045, gold, root, rotation=(math.pi / 2, 0, 0))
        sphere('Clapper', (0, 0, -.47), (.13, .13, .13), cyan, root, 16, 8)
        tube('Lightning emblem', [(.11, .34, .24), (-.12, .43, -.04), (.08, .45, -.04), (-.12, .46, -.28)], .035, ivory, root)
    else:
        charcoal = material('ItemBomb', '#283344', .4, .25)
        coral = material('ItemCoral', '#e98465', .45)
        sphere('Bomb body', (0, 0, 0), (.48, .48, .48), charcoal, root, 24, 12)
        torus('Coral stripe', (0, 0, -.05), .474, .045, coral, root)
        torus('Fuse collar', (0, 0, .46), .13, .045, gold, root)
        tube('Fuse', [(0, 0, .46), (.03, 0, .7), (-.09, 0, .82)], .035, gold, root)
        sphere('Fuse glow', (-.09, 0, .83), (.07, .07, .07), coral, root, 8, 4)
        for side in (-1, 1):
            leaf('Rabbit plate', (side * .32, 0, .54), (.1, .07, .25), charcoal, root, side * .4)
    return root
