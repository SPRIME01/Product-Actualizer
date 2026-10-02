---
name: product-visualization
description: Produce renders, 3D scenes, and turntables that depict the real product faithfully from real geometry, materials, and states. Use when a deliverable shows the physical or 3D form of the product.
reads: [form, constraints, capabilities, claims, unknowns, decisions]
needs: [recon-physical, direction]
executes_with: [img2three, threejs-skills, blender]
---
# Product visualization

## Reads from the model
`form` (geometry source, dimensions, materials, finishes, states), `constraints` (physical), `claims` for anything a render implies, `unknowns` (hidden sides, finish), `decisions` (art direction constraints that apply).

## Distinctions
- **Ownership.** Owns faithfulness of the depiction to the real object. Direction owns mood, background, and light style; illustration owns non-literal visuals; fidelity-qa independently re-measures the result.
- **Faithful vs. flattering.** A render is a claim about the product. Smoothed fillets, hidden seams, perfect finish, and added or removed features each assert something. Any idealization is listed, approved in the decision log, and disclosed in context where it matters.
- **Geometry provenance tiers:** CAD (exact, tessellated to a stated deviation) > scan mesh (as-built, noisy) > photo reconstruction or sketch (approximate). Dimensions from the lower tiers are `INFERRED`, and hidden sides are `UNKNOWN`, not generated.
- **Admit the reference before rebuilding from it.** A photo is classified pass, conditional (named gaps), or reject as a reconstruction source: unobstructed subject, known lens and viewpoint, no heavy retouch or perspective crop. Depth estimated from one image is relative, never metric.
- **De-light before reusing photo color.** Photographed color carries baked light and shadow; reuse it as albedo only after removing lighting. Flat paint is a solid albedo; patterned finishes use a real reference crop, checked to be the part you think it is. Anything built from a canon table instead of this unit is labeled canon, not measured.
- **Reconstruction starts from a detail inventory** whose size scales with complexity; each detail maps to a feature or material entry, so nothing is "close enough" by omission.
- **Units, axis, origin, pivots** are fixed on import and recorded: glTF is meters and +Y up; CAD is usually millimeters and +Z up.
- **Metal is lit by its environment, not by its color.** A conductor takes its tint from F0 and reads as metal only against a dark scene with a few bright, hard-edged sources to reflect, with roughness varying across the surface. The studio set (softboxes, gradients) is the shape cue for any reflective surface; design it rather than reusing an HDRI by default. Constants, finish values, and lighting rules for metals and dielectrics are in `references/material-constants.md`; load it when assigning materials.
- **Materials are physical parameters.** Base color in sRGB; roughness, metalness, normal, and occlusion are linear data. Dielectrics reflect ~4%; LEDs are emissive; glass is transmission with thickness; finishes (bead-blast, anodize, molded texture with draft, matte vs. glossy) are chosen from the real sample, not the category.
- **Material fidelity needs a reference of the same item.** Generative or procedural material enhancement fails first on fine textures (knit, grain, brushed lay); it is anchored with a high-resolution photo of the actual material, and a reference from a different item silently swaps one material for another.
- **Tone mapping changes color.** Product color needs a neutral mapping (Khronos PBR Neutral, or a disabled view transform with checked exposure); filmic curves shift hue and saturation.
- **Gamut and working space are part of color truth.** Saturated product colors can lie outside sRGB; "perceptual" conversion into a matrix profile is really relative colorimetric and clips. Render and grade in linear float, check which colors clip before conversion, and store 8-bit only in an encoded space; applying corrections in the wrong working space shifts unrelated hues (greens turn cyan).
- **Camera is a measurement choice:** 70-135 mm equivalent keeps proportions honest; wide angle exaggerates near features; orthographic is for dimensioned views. A hand or coin gives scale.
- **States are part of the product:** off, on with LEDs, display content, open/closed, accessories. Display content is real UI from the product, not placeholder.
- **Edges carry real radii.** Mathematically sharp edges catch no highlight and read as cheap CG; but the radius applied is the one in CAD or measured on the unit, never a generic bevel.
- **Process dictates appearance:** injection-molded parts have draft, uniform wall, parting lines, and gate marks; sheet metal has constant thickness and bend radii; cast and machined parts differ again. Mixed or impossible process cues make a viewer distrust the whole image even if they cannot say why.
- **Reconstructed geometry must declare its joins.** Where parts are rebuilt rather than imported, every contact is flush, a stated clearance, or a named intentional overlap; unnamed protrusions of 0-1 mm past a neighbor are defects.
- **Variants are not scaled copies.** A larger or smaller model keeps real section sizes and pitch; uniform scaling yields toy proportions.
- **Real-time vs. offline** have different budgets: web GLB wants compressed textures, bounded triangles, and compressed geometry; offline path tracing wants clean topology and correct IOR.

## Failure modes
- **Better than real** — render looks more refined than the unit. *Recognize:* edges and fillets smoother than CAD; seams, screws, parting lines, or draft missing.
- **Perspective lie** — proportions distorted by a short lens. *Recognize:* near features oversized versus an orthographic view of the same part.
- **Wrong material class** — plastic reads as chrome or the reverse. *Recognize:* metalness set by guess; compare with a photo of the real finish under similar light.
- **Hue shift** — brand color off after tone mapping. *Recognize:* sampled patch differs from the swatch.
- **Invented back side** — hidden geometry hallucinated. *Recognize:* a view shows an area no source covers.
- **Phantom feature** — ports, buttons, or labels that the real unit lacks or lacks in that place.
- **Fake screen** — lorem UI or a mockup on the display.
- **Aliased texture** — fine relief or bands shimmer to noise at output size. *Recognize:* detail periods under ~12 px; sparkle at grazing angles.
- **Shading artifacts** — flipped normals, non-manifold edges, double faces.
- **Burrs and z-fighting** — slivers poking through mates, coplanar faces never merged. *Recognize:* flicker or edge specks at joints in a close-up; a burr census of unnamed geometry near neighbors' surfaces is non-zero.
- **Missing parts the reference clearly has** — only visible parts modeled. *Recognize:* part count lower than the BOM or photos show.
- **Gate passes by construction** — a check that only looks from one side cannot see the hole through the back. *Recognize:* the verdict lists no views at all, or fewer than four azimuths; every gate must name what it did not look at. A model approved from the front render alone is the same defect: floating parts or wrong depth show only in side or top.
- **Scale drift** — object imported at wrong unit but "looks fine" in a framed shot. *Recognize:* bounding box disagrees with the stated size.

## Check
1. Dimension: render an orthographic view with known pixel-per-mm; the measured bounding box of the product's silhouette matches CAD or the measured dimension within 1%.
2. Silhouette overlap: where a real orthographic or near-orthographic photo exists, intersection-over-union of the silhouettes is ≥ 0.95 after aligning; otherwise the render is labeled illustrative.
3. Feature census: every visible feature in the render maps to a CAD feature or photo; every user-facing feature of the real unit appears in at least one view. List both directions.
4. Color: both images read in the same working space from their embedded or declared profiles (never assumed sRGB), and under neutral light, the render's sampled patch for each declared finish is within ΔE00 ≤ 3 of the swatch or calibrated photo.
5. Required view set: front, side, and top orthographic, a close-up of each distinct joint class, and one perspective shot beside a known-size reference (hand, coin, ruler). All are stored with the deliverable; none is judged by numeric checks alone.
6. Deterministic checks (dimension, census, interference) run before any visual judgment, and no script scores how good a render looks; that judgment is a human or model reading against the reference sheet.
7. Independence: the measurement and census checks run from a separate script that reopens the exported file, not from the build that produced it.
8. Idealization register: every deliberate deviation from source is listed with its decision id; an empty register with a visible deviation fails.

## Writes to proposals
- `form`: geometry facts (verified dimensions, tolerances, part list), with the render-vs-CAD measurement as source.
- `constraints` (physical): clearances, finishes, tolerances learned.
- `unknowns`: hidden geometry, unmeasured finishes, state behaviors, missing CAD revision.
- `claims`: dimensions and appearance statements now measurable, graded `VERIFIED` when the check passed.
- Requests to recon-physical for the specific photos or measurements missing.
