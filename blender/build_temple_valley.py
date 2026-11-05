import bpy
from pathlib import Path
from mathutils import Vector

project = Path(__file__).resolve().parents[1]
asset_dir = project / "public" / "assets" / "pyramid-interior"
output = project / "public" / "assets" / "pyramid-interior" / "pyramid-interior-game.glb"

assets = [
    ("Layout_Floor01.glb", (-18, 0, 0)),
    ("Layout_Floor02.glb", (-9, 0, 0)),
    ("Layout_Floor03.glb", (0, 0, 0)),
    ("Layout_Floor04.glb", (9, 0, 0)),
    ("Layout_Floor05.glb", (18, 0, 0)),
    ("TempleArch01_Art.glb", (0, 0, -7)),
    ("Column_Art.glb", (-5, 0, -6)),
    ("Column_Art.glb", (5, 0, -6)),
    ("Door_Art.glb", (0, 0, -10)),
    ("Torch_Art.glb", (-4, 3, -5)),
    ("Torch_Art.glb", (4, 3, -5)),
    ("GodAnubis_Art.glb", (-7, 0, 2)),
    ("GodRa_Art.glb", (7, 0, 2)),
]
missing = [name for name, _ in assets if not (asset_dir / name).exists()]
if missing:
    raise FileNotFoundError(f"Ready CC0 assets missing: {', '.join(missing)}")

bpy.ops.wm.read_factory_settings(use_empty=True)
for name, location in assets:
    bpy.ops.import_scene.gltf(filepath=str(asset_dir / name))
    imported = list(bpy.context.selected_objects)
    for obj in imported:
        obj.location += Vector(location)

def material(name, color, metallic=0.0, roughness=0.72, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = 1.8
    return mat

stone = material("Sıcak kireç taşı", (0.30, 0.19, 0.10))
dark_stone = material("Oyma taş", (0.12, 0.09, 0.07))
gold = material("Mühür altını", (0.72, 0.42, 0.10), metallic=0.7, roughness=0.32)
lapis = material("Lacivert pigment", (0.03, 0.12, 0.20), roughness=0.42)
water = material("Nil suyu", (0.02, 0.16, 0.22), roughness=0.18, emission=(0.01, 0.08, 0.12))

def cube(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Yumuşak taş kenarı", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    return obj

def cylinder(name, location, radius, depth, mat, vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj

# A readable temple route built from simple architectural pieces around the ready-made assets.
cube("Ana keşif zemini", (0, -1.15, 0), (7.2, 0.22, 10.2), stone, 0.12)
for z in (-9.8, 9.8):
    cube("Piramidin arka duvarı", (0, 2.4, z), (7.4, 3.5, 0.28), dark_stone, 0.08)
for x in (-7.2, 7.2):
    cube("Piramidin yan duvarı", (x, 2.4, 0), (0.28, 3.5, 10.2), dark_stone, 0.08)

for z in (-7.4, -2.5, 2.5, 7.4):
    for x in (-6.2, 6.2):
        cylinder("Sütun kaidesi", (x, -0.75, z), 0.72, 0.35, gold, 16)
        cylinder("Keşif sütunu", (x, 1.4, z), 0.42, 3.9, stone, 16)
        cylinder("Sütun başlığı", (x, 3.45, z), 0.68, 0.35, gold, 16)

# Side chambers create meaningful landmarks without blocking the central route.
for z in (-5.1, 5.1):
    cube("Sol yan oda zemini", (-5.1, -0.65, z), (1.45, 0.18, 1.65), dark_stone, 0.08)
    cube("Sağ yan oda zemini", (5.1, -0.65, z), (1.45, 0.18, 1.65), dark_stone, 0.08)
    for x in (-5.1, 5.1):
        cube("Hiyeroglif pano", (x, 1.65, z), (1.05, 1.25, 0.12), lapis, 0.06)
        for row in range(3):
            for col in range(3):
                cube("Oyma sembol", (x - 0.62 + col * 0.62, 1.65 + 0.58 - row * 0.58, z - 0.14), (0.11, 0.11, 0.025), gold, 0.02)

# A shallow Nile channel gives the room a visual axis and a recognizable Egyptian motif.
cube("Nil kanalı", (0, -0.82, 0), (0.72, 0.035, 8.6), water, 0.18)
for z in (-7.8, -3.9, 0, 3.9, 7.8):
    cube("Nil köprüsü", (0, -0.65, z), (1.35, 0.18, 0.38), stone, 0.08)

for index, z in enumerate((-6.8, -2.3, 2.3, 6.8)):
    cylinder("Mühür kaidesi", (-2.5, -0.52, z), 0.58, 0.72, dark_stone, 16)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.34, minor_radius=0.09, location=(-2.5, -0.08, z))
    ring = bpy.context.object
    ring.name = f"Parlayan mühür çerçevesi {index + 1}"
    ring.data.materials.append(gold)

for x in (-6.5, 6.5):
    cube("Anubis yol işareti", (x, 0.25, 0), (0.22, 1.55, 0.22), gold, 0.05)

for index, location in enumerate(((-4, 3, -5), (4, 3, -5), (-5, 2.5, 3), (5, 2.5, 3))):
    bpy.ops.object.light_add(type="POINT", location=location)
    light = bpy.context.object
    light.name = f"Meşale ışığı {index + 1}"
    light.data.energy = 180
    light.data.color = (1.0, 0.48, 0.16)
    light.data.shadow_soft_size = 0.35
bpy.ops.object.light_add(type="AREA", location=(0, 8, 1))
light = bpy.context.object
light.name = "Piramit dolgu ışığı"
light.data.energy = 450
light.data.shape = "DISK"
light.data.size = 10
light.data.color = (0.36, 0.52, 0.68)

bpy.ops.object.camera_add(location=(0, 2, 8))
bpy.context.scene.camera = bpy.context.object

bpy.context.scene.render.engine = "BLENDER_EEVEE"
bpy.context.scene.render.resolution_x = 1600
bpy.context.scene.render.resolution_y = 900
bpy.context.scene.render.resolution_percentage = 50
bpy.ops.wm.save_as_mainfile(filepath=str(project / "blender" / "nilin-renkleri-pyramid-interior.blend"))
bpy.ops.export_scene.gltf(filepath=str(output), export_format="GLB")
