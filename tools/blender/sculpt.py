"""Reference-driven surface recipes; no opaque imported geometry."""
import bpy
import math
from common import finish, sphere, tube, box, torus


def bonnet(parent, paint, stripe, weight):
    # Cross sections match the long domed noses in art/references/kart-*.png.
    sections = [(0.3, .62, .35, .68), (.55, .66, .38, .64),
                (.9, .61, .35, .59), (1.2, .48, .28, .52), (1.47, .29, .19, .46)]
    if weight == 'heavy':
        sections = [(y, w * 1.14, h * .85, z) for y, w, h, z in sections]
    vertices, faces = [], []
    rings = 24
    for y, width, height, center in sections:
        for i in range(rings):
            angle = i / rings * math.tau
            vertices.append((math.sin(angle) * width, y, center + math.cos(angle) * height))
    for j in range(len(sections) - 1):
        for i in range(rings):
            a, b = j * rings + i, j * rings + (i + 1) % rings
            faces.append((a, b, b + rings, a + rings))
    faces.append(tuple(reversed(range(rings))))
    faces.append(tuple((len(sections) - 1) * rings + i for i in range(rings)))
    mesh = bpy.data.meshes.new('Sculpted bonnet')
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new('Sculpted bonnet', mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, 'Sculpted bonnet', paint, parent)
    vertices, faces = [], []
    for y, width, height, center in sections:
        for side in (-1, 1):
            angle = side * .14
            vertices.append((math.sin(angle) * width, y, center + math.cos(angle) * height + .006))
    for i in range(len(sections) - 1):
        faces.append((i * 2, i * 2 + 1, i * 2 + 3, i * 2 + 2))
    mesh = bpy.data.meshes.new('Flush racing stripe')
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new('Flush racing stripe', mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj, 'Flush racing stripe', stripe, parent)


def cockpit(parent, leather, metal, paint):
    sphere('Leather seat shell', (0, -.59, 1.01), (.39, .16, .48), leather, parent)
    for side in (-1, 1):
        tube('Cockpit piping', [(side * .3, -.76, 1.27), (side * .48, -.42, .88), (side * .45, .13, .82), (side * .32, .39, .92)], .029, metal, parent)
        sphere('Sculpted side pod', (side * .55, -.16, .58), (.25, .66, .28), paint, parent)
    for x in (-.2, 0, .2):
        tube('Seat stitched seam', [(x, -.431, .83), (x, -.438, 1.1), (x, -.51, 1.35)], .007, metal, parent)


def grille(parent, accent, dark, alloy):
    sphere('Recessed oval grille', (0, 1.461, .47), (.255, .038, .155), dark, parent)
    rim = torus('Grille surround', (0, 1.486, .47), .2, .027, accent, parent, (math.pi / 2, 0, 0))
    rim.scale = (1.22, 1, .75)
    for x in (-.15, -.075, 0, .075, .15):
        tube('Grille bar', [(x, 1.503, .365), (x, 1.51, .57)], .012, alloy, parent)
