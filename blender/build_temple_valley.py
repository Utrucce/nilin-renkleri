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
