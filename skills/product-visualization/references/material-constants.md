# Material constants and finish notes

Load when assigning PBR materials. Values are physical starting points; the real sample or a calibrated
photo of it overrides them, and the override is recorded in the idealization register.

## Conductors (set metalness 1; put F0 in base color as linear values; no other color)

| metal | F0, linear RGB | aged-surface tint (linear) |
|---|---|---|
| steel | 0.56, 0.57, 0.58 | rust 0.16, 0.055, 0.02 |
| brass | 0.89, 0.72, 0.36 | tarnish 0.09, 0.055, 0.02 |
| gold | 1.00, 0.71, 0.29 | dirty wear 0.13, 0.085, 0.03 |
| copper | 0.95, 0.64, 0.54 | verdigris 0.10, 0.34, 0.27 |

Entering F0 through an sRGB round trip loses the tint. A bright base color on metal reads as white paint;
metalness below 1 lets a diffuse term leak in and the metal reads as plastic.

## Finishes (starting roughness; vary it across the surface, never a constant)

| finish | base roughness | notes |
|---|---|---|
| polished | ~0.05-0.1 | smears (fingerprints), micro-scratches at two angles, fine grain |
| brushed | ~0.25 | anisotropic along the grain; streaks follow the brushing direction |
| aged | ~0.35 | patina lowers metalness locally and raises roughness |

Dielectrics (plastic, paint, glass surfaces) reflect about 4% at normal incidence; use the dielectric
default, not a guessed specular. LEDs are emissive; glass is transmission with thickness.

## Lighting a reflective object

- Metal reads as metal only when a dark environment contains a few very bright, hard-edged shapes to
  reflect. A uniform bright sky makes it look like grey plastic; a face turned toward a dark void
  reflects nothing. Aim a bright card along the mirror direction between camera and surface.
- Rough finishes spread the same source over more surface, so lower environment intensity as roughness rises
  or the highlight clips to a flat white block.
- Grain, pores, and surface texture vanish under flat light; keep ambient low and use one raking key.
- Ground reflective objects on a dark base with contact shadows; a bright floor is reflected and kills contrast.

## Edges and detail

- Arris radius is the real one. Absent a source, 1-3 mm at product scale is typical for machined or molded
  edges; above roughly 6% of the smallest side the object reads as soft rather than precise.
- Relief or texture with a period under about 12 px at output size aliases to noise against bright
  reflections; fade fine bands with their own screen-space derivative, and resolve detail at output size.
- Smooth dark gradients band in 8-bit; add a ±0.0015 dither after the display encode.

## Pipeline order

Render in a half-float target in linear space, apply bloom there with a high threshold (a single lamp glint
should not become a halo), tone map once at the end, then encode. Tone mapping twice or after additive layers
double-compresses highlights.

## Stable scoring

Any metric taken from a render is stable only with the scene frozen (camera sway and time fixed), the same
output size and pixel ratio, and capture in the same task as the draw call. Otherwise the metric moves with the
camera, not the product.

## Output pixel ratio

State whether 2x means fixed (always two drawing-buffer pixels per CSS pixel), auto (capped at 2, may render 1x),
or relative to native; label auto as auto. Renderer and post-processing buffers each carry a ratio; set both once
and do not multiply twice. A higher ratio does not sharpen a coarse texture, mesh, shadow map, or reflection map;
check those independently.
