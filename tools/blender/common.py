"""Shared Blender authoring helpers. Metres, Z up, +Y forward; glTF converts to Y up."""
import bpy
import math
from mathutils import Vector, Matrix

MATERIALS = {}


def material(name, hex_color, roughness=.5, metal=0, emission=0):
    if name in MATERIALS:
        return MATERIALS[name]
    value = hex_color.lstrip('#')
    rgb = tuple(int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    linear = tuple(c / 12.92 if c < .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb)
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*linear, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Coat Weight'].default_value = .35 if name == 'Paint' else .05
    if emission:
        shader.inputs['Emission Color'].default_value = (*linear, 1)
        shader.inputs['Emission Strength'].default_value = emission
    MATERIALS[name] = mat
    return mat


def group(name, location=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    if parent:
        obj.parent = parent
        bpy.context.view_layer.update()
        obj.matrix_world = Matrix.Translation(location)
    return obj


def finish(obj, name, mat, parent=None, smooth=True):
    obj.name = name
    obj.data.materials.append(mat)
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = True
    if parent:
        bpy.context.view_layer.update()
        world = obj.matrix_world.copy()
        obj.parent = parent
        obj.matrix_world = world
    return obj


def sphere(name, p, size, mat, parent=None, segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=p)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, parent)


def rock(name, p, size, mat, parent=None, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=p)
    obj = bpy.context.object
    for v in obj.data.vertices:
        jitter = 1 + math.sin(v.index * 13.7 + seed * 9) * .12
        v.co.x *= size[0] * jitter
        v.co.y *= size[1] * jitter
        v.co.z *= size[2] * jitter
    return finish(obj, name, mat, parent, smooth=False)


def cone(name, p, radius, depth, mat, parent=None):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=radius, radius2=0, depth=depth, location=p)
    return finish(bpy.context.object, name, mat, parent, smooth=False)


def box(name, p, size, mat, parent=None, bevel=.08):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Rounded edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
        bpy.ops.object.modifier_apply(modifier=mod.name)
        mod = obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj, name, mat, parent)


def torus(name, p, radius, tube, mat, parent=None, rotation=(0, 0, 0), segments=24):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=tube,
                                   major_segments=segments, minor_segments=8,
                                   location=p, rotation=rotation)
    return finish(bpy.context.object, name, mat, parent)


def tube(name, points, radius, mat, parent=None):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 8
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for node, co in zip(spline.bezier_points, points):
        node.co = co
        node.handle_left_type = node.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj = bpy.context.object
    obj.select_set(False)
    return finish(obj, name, mat, parent)


def merge_static_parts():
    """One mesh per material per animated pivot: GPU-friendly, still articulated."""
    buckets = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            continue
        key = (obj.parent, obj.data.materials[0].name)
        buckets.setdefault(key, []).append(obj)
    for (parent, mat), objects in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]
        if len(objects) > 1:
            bpy.ops.object.join()
        objects[0].name = f'{parent.name if parent else "Static"}_{mat}'
    bpy.ops.object.select_all(action='DESELECT')


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def camera_at(name, p, target):
    bpy.ops.object.camera_add(location=p)
    camera = bpy.context.object
    camera.name = name
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = camera
    return camera


def area(name, p, power, size, color=(1, 1, 1)):
    bpy.ops.object.light_add(type='AREA', location=p)
    light = bpy.context.object
    light.name = name
    light.data.energy = power
    light.data.shape = 'DISK'
    light.data.size = size
    light.data.color = color
    light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat('-Z', 'Y').to_euler()


def export_glb(path):
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB',
                              export_cameras=False, export_lights=False,
                              export_animations=False, export_yup=True)
