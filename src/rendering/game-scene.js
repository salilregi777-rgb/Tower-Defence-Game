import { TOWER_TYPES, ENEMY_TYPES } from '../game/config.js';

/** A second clearing inside the authored Sylva scene. The renderer, animation
 * clock, moss shaders, tone mapping and camera all stay alive across the journey. */
export function createGameScene(world, engine, callbacks = {}) {
  const { THREE, scene, camera, renderer } = world;
  const group = new THREE.Group();
  group.name = 'The living grove'; group.scale.setScalar(65); group.position.set(0, -150, -900); group.visible = false; scene.add(group);
  const cameraPosition = new THREE.Vector3(600, 1100, 650), cameraTarget = new THREE.Vector3(0, -120, -900);
  const homePosition = cameraPosition.clone(), homeTarget = cameraTarget.clone();
  const towerMeshes = new Map(), enemyMeshes = new Map(), projectileMeshes = new Map(), effects = [], swaying = [];
  const ownedMaterials = new Set(), ownedGeometries = new Set(), ownedTextures = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = false, buildType = null, hover = null, elapsed = 0, drag = null, dragDistance = 0;
  let randomSeed = 742191;
  const rand = (a = 0, b = 1) => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return a + randomSeed / 4294967296 * (b - a); };
  const noise = (x, z) => Math.sin(x * .79 + Math.cos(z * .61) * 1.8) * .45 + Math.sin(z * 1.51 + x * .24) * .24 + Math.cos(x * 2.37 - z * .67) * .16;
  // The authored renderer uses legacy r149 colour management. Convert authored
  // sRGB swatches explicitly so its ACES exposure does not bleach the clearing.
  const mat = (color, options = {}) => { const m = new THREE.MeshStandardMaterial({ color, roughness: .9, metalness: 0, ...options }); m.color.convertSRGBToLinear(); m.emissive.convertSRGBToLinear(); ownedMaterials.add(m); return m; };
  const basic = (color, options = {}) => { const m = new THREE.MeshBasicMaterial({ color, ...options }); m.color.convertSRGBToLinear(); ownedMaterials.add(m); return m; };
  const geom = g => { ownedGeometries.add(g); return g; };
  const sphere = geom(new THREE.SphereGeometry(1, 14, 10)), ico = geom(new THREE.IcosahedronGeometry(1, 1));
  const softTexture = world.radialTexture(128, [[0, 'rgba(255,255,255,1)'], [.22, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]); ownedTextures.add(softTexture);
  const shadowTexture = world.radialTexture(128, [[0, 'rgba(0,0,0,.8)'], [.38, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]); ownedTextures.add(shadowTexture);
  const wood = mat('#494b2d'), darkWood = mat('#353b25'), moss = mat('#596b32'), rock = mat('#797d65'), leaf = mat('#879956', { side: THREE.DoubleSide }), paleLeaf = mat('#b9c78b', { side: THREE.DoubleSide });
  const cutStone = mat('#777b65'), iron = mat('#505348', {metalness:.4,roughness:.65});
  const gold = mat('#dab784', { emissive: '#795d22', emissiveIntensity: .22 }), frost = mat('#b0dbe0', { emissive: '#65a8b8', emissiveIntensity: .32, roughness: .34 }), violet = mat('#d6c6e3', { emissive: '#8872b1', emissiveIntensity: .4, roughness: .45 });

  // Fine bark ridges and mineral grain are shaded at world scale, never painted
  // onto a sprite; moving through the clearing keeps the same physical surface.
  function grainMaterial(material, amount, scale, bark = false) {
    material.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSylvaPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSylvaPos = position;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vSylvaPos;\nfloat sylvaHash(vec3 p) { return fract(sin(dot(p,vec3(12.9898,78.233,45.164))) * 43758.5453); }').replace('#include <color_fragment>', `#include <color_fragment>\nfloat sylvaGrain = sylvaHash(floor(vSylvaPos * ${scale.toFixed(1)}));\nfloat sylvaRidge = ${bark ? 'sin(vSylvaPos.y * 2.0 + sin(vSylvaPos.x * 31.0) * 1.9 + vSylvaPos.z * 37.0)' : 'sin(vSylvaPos.x * 5.0 + sin(vSylvaPos.z * 9.0) * 2.0)'};\ndiffuseColor.rgb *= 1.0 + (sylvaGrain - .5) * ${amount.toFixed(2)} + sylvaRidge * .075;`);
    };
  }
  grainMaterial(cutStone,.32,65); grainMaterial(wood, .26, 110, true); grainMaterial(darkWood, .25, 100, true); grainMaterial(rock, .24, 35); grainMaterial(moss, .15, 80);
  const light = new THREE.HemisphereLight(0xd7dec5, 0x414c31, .4); group.add(light);
  const key = new THREE.DirectionalLight(0xffedc7, .85); key.position.set(-7, 18, 10); key.target.position.set(0, 0, 0); group.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xabc8b8, .2); fill.position.set(9, 6, -10); group.add(fill);

  function mesh(geometry, material, parent = group, position, scale) {
    const object = new THREE.Mesh(geometry, material); if (position) object.position.set(...position); if (scale) object.scale.set(...scale); parent.add(object); return object;
  }
  function orb(parent, position, scale, material) { return mesh(sphere, material, parent, position, Array.isArray(scale) ? scale : [scale, scale, scale]); }
  function branch(parent, points, radius, material = wood, tubular = 12, radial = 7) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return mesh(geom(new THREE.TubeGeometry(curve, tubular, radius, radial, false)), material, parent);
  }
  function taperedBranch(parent, a, b, bottom, top, material = wood) {
    const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const object = mesh(geom(new THREE.CylinderGeometry(top, bottom, direction.length(), 9, 3)), material, parent);
    object.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5)); object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return object;
  }
  function glow(parent, color, size, position = [0, 0, 0], opacity = .35) {
    const material = new THREE.SpriteMaterial({ color, map: softTexture, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }); ownedMaterials.add(material);
    const sprite = new THREE.Sprite(material); sprite.scale.set(size, size, 1); sprite.position.set(...position); parent.add(sprite); return sprite;
  }
  function contact(parent, size = 1, opacity = .45) {
    const material = basic('#0c160c', { map: shadowTexture, transparent: true, opacity, depthWrite: false });
    const shadow = mesh(geom(new THREE.PlaneGeometry(size, size)), material, parent, [0, .024, 0]); shadow.rotation.x = -Math.PI / 2; return shadow;
  }
  function ring(parent, radius, color, opacity = .3, width = .016) {
    const object = mesh(geom(new THREE.RingGeometry(radius - width, radius + width, 96)), basic(color, { transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false }), parent);
    object.rotation.x = -Math.PI / 2; object.position.y = .065; return object;
  }

  // Bake static sculptures by material. Geometry retains normals and grain,
  // while hundreds of branches and stones submit just a few draw calls.
  function batchOpaque(root, excluded = new Set()) {
    root.updateMatrixWorld(true); const inverse = root.matrixWorld.clone().invert(), batches = new Map();
    root.traverse(object => {
      if (!object.isMesh || object.isInstancedMesh || !object.material?.isMeshStandardMaterial || object.material.transparent) return;
      for (let parent = object; parent && parent !== root; parent = parent.parent) if (excluded.has(parent)) return;
      if (!batches.has(object.material)) batches.set(object.material, []); batches.get(object.material).push(object);
    });
    for (const [material, objects] of batches) {
      if (objects.length < 2) continue; const positions = [], normals = [];
      for (const object of objects) {
        const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
        const p = geometry.attributes.position, n = geometry.attributes.normal;
        for (let i = 0; i < p.count; i++) { positions.push(p.getX(i), p.getY(i), p.getZ(i)); normals.push(n.getX(i), n.getY(i), n.getZ(i)); }
        geometry.dispose(); object.parent.remove(object);
      }
      const geometry = geom(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); mesh(geometry, material, root);
    }
  }

  // Rounded, irregular forest floor, surrounded by the exact authored moss.
  const outline = new THREE.Shape();
  outline.moveTo(-8.3, -7.2); outline.lineTo(8.3, -7.2); outline.quadraticCurveTo(9.7, -7.2, 9.7, -5.8); outline.lineTo(9.7, 5.8); outline.quadraticCurveTo(9.7, 7.2, 8.3, 7.2); outline.lineTo(-8.3, 7.2); outline.quadraticCurveTo(-9.7, 7.2, -9.7, 5.8); outline.lineTo(-9.7, -5.8); outline.quadraticCurveTo(-9.7, -7.2, -8.3, -7.2);
  const earth = mesh(geom(new THREE.ExtrudeGeometry(outline, { depth: .8, bevelEnabled: true, bevelThickness: .35, bevelSize: .32, bevelSegments: 3, steps: 1 })), darkWood);
  earth.rotation.x = -Math.PI / 2; earth.position.y = -1.39;
  const groundMaterial = mat('#ffffff', { vertexColors: true }); grainMaterial(groundMaterial, .25, 130);
  const groundGeo = geom(new THREE.PlaneGeometry(19.35, 14.35, 100, 76)); groundGeo.rotateX(-Math.PI / 2);
  const groundPositions = groundGeo.attributes.position, groundColors = [], c = new THREE.Color();
  for (let i = 0; i < groundPositions.count; i++) {
    const x = groundPositions.getX(i), z = groundPositions.getZ(i), n = noise(x, z);
    groundPositions.setY(i, -.11 + n * .07); c.set('#697346').lerp(new THREE.Color('#344531'), Math.min(1, Math.max(0, .38 + n * .32))).convertSRGBToLinear();
    groundColors.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3)); groundGeo.computeVertexNormals(); mesh(groundGeo, groundMaterial);
  const floorShadow = contact(group, 30, .45); floorShadow.position.y = -1.48; floorShadow.scale.z = .8;

  const pathPoints = engine.path.map(p => new THREE.Vector3(p.x, .015, p.z));
  const pathCurve = new THREE.CatmullRomCurve3(pathPoints, false, 'centripetal', .2);
  function pathRibbon(width, color, y) {
    const positions = [], colors = [], indices = [], count = 380;
    for (let i = 0; i <= count; i++) {
      const p = pathCurve.getPoint(i / count), tangent = pathCurve.getTangent(i / count), side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const rough = 1 + .045 * Math.sin(i * 2.3) + .05 * Math.sin(i * .51);
      for (const s of [-1, 1]) { const q = p.clone().addScaledVector(side, width * s * rough); positions.push(q.x, y, q.z); c.set(color).convertSRGBToLinear().multiplyScalar(.88 + rand() * .2); colors.push(c.r, c.g, c.b); }
      if (i < count) { const a = i * 2; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const geometry = geom(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const material = mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide }); grainMaterial(material, .21, 100); return mesh(geometry, material);
  }
  pathRibbon(.58, '#62694b', -.035); pathRibbon(.455, '#b3ac88', .008);
  function pathDistance(x, z) { let result = 999; for (let i = 1; i < engine.path.length; i++) { const a = engine.path[i - 1], b = engine.path[i], dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))); result = Math.min(result, Math.hypot(x - a.x - t * dx, z - a.z - t * dz)); } return result; }
  const pebbleMesh = new THREE.InstancedMesh(ico, rock, 440), matrix = new THREE.Object3D();
  for (let i = 0; i < 440; i++) { const t = i / 440, p = pathCurve.getPoint(t), d = pathCurve.getTangent(t), side = i % 2 ? 1 : -1; matrix.position.set(p.x - d.z * side * rand(.47, .64), -.005, p.z + d.x * side * rand(.47, .64)); matrix.scale.set(rand(.035, .12), rand(.028, .07), rand(.04, .1)); matrix.rotation.set(rand(), rand(0, 6.28), rand()); matrix.updateMatrix(); pebbleMesh.setMatrixAt(i, matrix.matrix); }
  group.add(pebbleMesh);

  // The terrain uses the authored root builder, complete with fur, fern and
  // blossom instancing. Sharing this material system is the continuity anchor.
  if (world.assembleRoot && world.buildFarRoot) {
    const ridge = world.assembleRoot(world.buildFarRoot(), { aspect: 2.05, haze: .11, fog: .02, alpha: 1, order: 0, blades: 26000, ferns: 22, flowers: 120, fernSize: [.19, .4], flowerSize: [.04, .09], mouse: { value: new THREE.Vector3(9999, 9999, 9999) }, mouseR: 1.1 });
    const placements = [[0, -.15, -6.8, 0, 1.8, .8], [-1.2, .08, 7.35, Math.PI, 1.9, 1.05], [-9.15, -.55, 0, Math.PI / 2, 1.45, .85], [9.45, -.6, -.3, -Math.PI / 2, 1.4, .65]];
    for (const [x, y, z, rotation, sx, sy] of placements) { const root = ridge.clone(); root.position.set(x, y, z); root.rotation.y = rotation; root.scale.set(sx, sy, .7); group.add(root); }
    ridge.traverse(object => { if (object.geometry) ownedGeometries.add(object.geometry); if (object.material) ownedMaterials.add(object.material); });
  }

  // Instanced blades use the same warm greens, tip translucency and wind cadence
  // as the landing moss. The playable cells remain subtly visible through it.
  const grassBase = geom(new THREE.InstancedBufferGeometry());
  grassBase.setAttribute('position', new THREE.Float32BufferAttribute([-.045, 0, 0, .045, 0, 0, -.035, .45, .012, .035, .45, .012, 0, 1, .11], 3)); grassBase.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  const grassOffsets = [], grassData = [];
  for (let i = 0; i < 29000; i++) { const x = rand(-9.35, 9.35), z = rand(-6.9, 6.9), distance = pathDistance(x, z); if (distance < .58 || Math.hypot(x - 8, z) < 1) continue; grassOffsets.push(x, -.09 + noise(x, z) * .065, z); grassData.push(rand(.09, .26) * (distance > .9 ? 1 : .6), rand(0, 6.28), rand(), rand()); }
  grassBase.setAttribute('offset', new THREE.InstancedBufferAttribute(new Float32Array(grassOffsets), 3)); grassBase.setAttribute('blade', new THREE.InstancedBufferAttribute(new Float32Array(grassData), 4)); grassBase.instanceCount = grassOffsets.length / 3;
  const windUniform = { value: 0 };
  const grassMaterial = new THREE.ShaderMaterial({ side: THREE.DoubleSide, uniforms: { uTime: windUniform }, vertexShader: `attribute vec3 offset; attribute vec4 blade; uniform float uTime; varying float vTip; varying float vTone; void main(){ vec3 p = position; p.y *= blade.x; float a=blade.y; p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz; float bend=position.y*position.y; p.x += bend*(sin(uTime*1.1+offset.x*.62+offset.z*.43)*.07+sin(uTime*1.8+blade.z*6.28)*.024); p.z += bend*sin(uTime*.75+offset.z)*.035; vTip=position.y; vTone=blade.z; gl_Position=projectionMatrix*modelViewMatrix*vec4(p+offset,1.0); }`, fragmentShader: `varying float vTip; varying float vTone; void main(){vec3 root=vec3(.058,.084,.025);vec3 tip=mix(vec3(.20,.27,.067),vec3(.35,.39,.14),vTone);vec3 col=mix(root,tip,pow(vTip,.65));gl_FragColor=vec4(col,1.);#include <tonemapping_fragment>\n#include <encodings_fragment>\n}`.replace(';#include', ';\n#include') }); ownedMaterials.add(grassMaterial); mesh(grassBase, grassMaterial).frustumCulled = false;

  // A few soft soil seams suggest planting plots only when choosing a guardian.
  const plots = new THREE.Group(); group.add(plots); plots.visible = false;
  const plotMaterial = basic('#d8ddbe', { transparent: true, opacity: .11, depthWrite: false });
  const plotGeo = geom(new THREE.RingGeometry(.39, .395, 32));
  for (let row = 0; row < 13; row++) for (let col = 0; col < 17; col++) if (engine.grid[row][col] === 'build') { const plot = mesh(plotGeo, plotMaterial, plots, [col - 8, .025, row - 6]); plot.rotation.x = -Math.PI / 2; }

  const leafGeo = geom(new THREE.SphereGeometry(1, 7, 4));
  function foliage(parent, center, radius, count, material = leaf) {
    const leaves = new THREE.InstancedMesh(leafGeo, material, count);
    for (let i = 0; i < count; i++) { const a = rand(0, Math.PI * 2), r = Math.sqrt(rand()) * radius, y = rand(-radius * .27, radius * .48); matrix.position.set(center[0] + Math.cos(a) * r, center[1] + y, center[2] + Math.sin(a) * r); matrix.scale.set(rand(.12, .25), rand(.025, .055), rand(.09, .17)); matrix.rotation.set(rand(-.5, .5), rand(0, 6.28), rand(-.4, .4)); matrix.updateMatrix(); leaves.setMatrixAt(i, matrix.matrix); }
    parent.add(leaves); return leaves;
  }
  function fern(parent, x, z, size = .6) {
    const cluster = new THREE.Group(); cluster.position.set(x, -.03, z); parent.add(cluster);
    const count = 8, fronds = new THREE.InstancedMesh(leafGeo, leaf, count * 14), rotation = new THREE.Matrix4(); let index = 0;
    for (let j = 0; j < count; j++) { const a = j / count * Math.PI * 2; rotation.makeRotationY(a); for (let k = 0; k < 7; k++) { const t = k / 7, w = (1 - t) * .13 * size; for (const sign of [-1, 1]) { matrix.position.set(sign * w * .68, Math.sin(t * 1.8) * .55 * size, t * .7 * size); matrix.scale.set(w, .014 * size, .065 * size); matrix.rotation.set(-.25, sign * -.5, 0); matrix.updateMatrix(); fronds.setMatrixAt(index++, matrix.matrix.clone().premultiply(rotation)); } } }
    cluster.add(fronds);
    swaying.push({ object: cluster, strength: .02, phase: rand(0, 6) }); return cluster;
  }
  // Sculpted stones, ferns and cream-coloured wildflowers, never uniform trees.
  const flowerMaterial = mat('#e6e6c8', { roughness: 1 }), stemMaterial = mat('#748557');
  let obstacleIndex = 0;
  for (let row = 0; row < 13; row++) for (let col = 0; col < 17; col++) if (engine.grid[row][col] === 'obstacle') {
    const x = col - 8, z = row - 6, pile = new THREE.Group(); pile.position.set(x, 0, z); group.add(pile); contact(pile, 1.6, .5);
    for (let k = 0; k < 3; k++) { const boulder = mesh(ico, rock, pile, [rand(-.25, .25), rand(.12, .2), rand(-.3, .3)], [rand(.22, .48), rand(.25, .48), rand(.22, .4)]); boulder.rotation.set(rand(), rand(0, 6), rand()); const cushion = mesh(sphere, moss, pile, [boulder.position.x, boulder.position.y + boulder.scale.y * .67, boulder.position.z], [boulder.scale.x * .9, .1, boulder.scale.z * .85]); }
    if (obstacleIndex++ % 2 === 0) fern(pile, .32, .3, .7);
  }
  for (let i = 0; i < 23; i++) { const x = rand(-9, 9), z = rand(-6.7, 6.7); if (pathDistance(x, z) < .95) continue; fern(group, x, z, rand(.35, .62)); }
  const blooms = new THREE.InstancedMesh(sphere, flowerMaterial, 450); let flowerCount = 0;
  for (let patch = 0; patch < 30; patch++) { const x = rand(-9, 9), z = rand(-6.8, 6.8); if (pathDistance(x, z) < .75) continue; for (let j = 0; j < 15; j++) { matrix.position.set(x + rand(-.26, .26), rand(.07, .22), z + rand(-.25, .25)); matrix.scale.set(.032, .027, .032); matrix.updateMatrix(); blooms.setMatrixAt(flowerCount++, matrix.matrix); } } blooms.count = flowerCount; group.add(blooms);

  // The ancient heart is a branched living sculpture whose crown breathes.
  const heart = new THREE.Group(); heart.position.set(8.35, 0, -.12); group.add(heart); contact(heart, 4.6, .65);
  const heartTrunk = new THREE.Group(); heart.add(heartTrunk);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; branch(heartTrunk, [[Math.cos(a) * 1.35, -.01, Math.sin(a) * 1.25], [Math.cos(a) * .5, .22, Math.sin(a) * .5], [Math.cos(a + .5) * .28, 1.35, Math.sin(a + .5) * .27], [.08, 2.6, 0]], .12 + (i % 2) * .035, wood, 22); }
  branch(heartTrunk, [[0, .05, 0], [-.2, 1.1, .08], [.05, 2, 0], [-.16, 3.15, .05]], .31, wood, 25, 12);
  const crowns = [[-1.12, 2.45, .23], [.96, 2.7, .02], [-.1, 3.36, -.28], [.05, 2.55, -1]];
  crowns.forEach((p, i) => { branch(heartTrunk, [[0, 1.4, 0], [p[0] * .45, p[1] * .78, p[2] * .5], p], .12, wood, 15); foliage(heartTrunk, p, i === 2 ? .85 : .9, 160, i % 2 ? leaf : paleLeaf); });
  const heartCore = orb(heartTrunk, [0, 1.25, .28], [.12, .29, .12], mat('#e1edb1', { emissive: '#c1dc83', emissiveIntensity: 1.1 }));
  const heartGlow = glow(heartTrunk, '#d6e8a9', 2, [0, 1.3, .25], .22);
  ring(heart, .87, '#d9dfad', .24, .018); ring(heart, 1.07, '#d9dfad', .12, .009);
  fern(heart, -.8, .3, .8); fern(heart, .65, .5, .65);

  // Tall sentinel trunks and fern banks surround the clearing, with gaps at
  // entrance and heart so the entire route stays legible.
  for (let i = 0; i < 8; i++) {
    const x = -9.7 + i * 2.7 + rand(-.4,.4), z = -7.8 - rand(0, .6), height = rand(3.2, 5.2), sentinel = new THREE.Group(); sentinel.position.set(x, -.4, z); group.add(sentinel);
    branch(sentinel, [[0, -.6, 0], [.16, height * .34, .05], [-.1, height * .76, 0], [.04, height, .08]], rand(.12, .22), darkWood, 18);
    for (let j = 0; j < 3; j++) { const direction = j % 2 ? -1 : 1, y = height * (.46 + j * .13); branch(sentinel, [[0, y, 0], [direction * .55, y + .34, .1], [direction * .93, y + .61, .15]], .045, wood, 10, 5); foliage(sentinel, [direction * .65, y + .6, .13], .64, 55, leaf); }
    foliage(sentinel,[.04,height-.08,.08],.83,95,i%2?leaf:paleLeaf);
    contact(sentinel, 2.2, .4); swaying.push({ object: sentinel, strength: .007, phase: i });
  }

  const pollenCount = 380, pollenPositions = new Float32Array(pollenCount * 3), pollenOrigins = [];
  for (let i = 0; i < pollenCount; i++) { pollenOrigins.push([rand(-11, 11), rand(.15, 5), rand(-9, 8), rand(0, 6.28), rand(.02, .07)]); pollenPositions.set(pollenOrigins[i].slice(0, 3), i * 3); }
  const pollenGeometry = geom(new THREE.BufferGeometry()); pollenGeometry.setAttribute('position', new THREE.BufferAttribute(pollenPositions, 3));
  const pollenMaterial = new THREE.PointsMaterial({ color: '#e0e7b9', size: .045, map: softTexture, transparent: true, opacity: .65, depthWrite: false, blending: THREE.AdditiveBlending }); ownedMaterials.add(pollenMaterial); group.add(new THREE.Points(pollenGeometry, pollenMaterial));
  const groundMist = [];
  for (let i = 0; i < 6; i++) { const sprite = glow(group, '#c0c8a1', rand(5, 8), [rand(-9, 9), -.38, rand(-6, 6)], .045); sprite.material.blending = THREE.NormalBlending; groundMist.push(sprite); }
  const entrance = new THREE.Group(); entrance.position.set(-8.6, .06, -1); group.add(entrance); const entranceRing = ring(entrance, .52, '#d4d9ad', .35, .015); glow(entrance, '#c9d19e', 1.6, [0, .3, 0], .13);
  // Moss has reclaimed a small medieval gate at the trail's threshold.
  const gate = new THREE.Group(); gate.position.set(-8.55,0,-1); group.add(gate);
  const blockGeometry=geom(new THREE.BoxGeometry(.38,.27,.43));
  for(const sign of [-1,1]){
    for(let level=0;level<5;level++){const block=mesh(blockGeometry,cutStone,gate,[0,.14+level*.265,sign*.72],[1+(level%2)*.08,1,1]);block.rotation.y=(level%2)*.05;}
    orb(gate,[0,1.42,sign*.72],[.29,.1,.29],moss);
    taperedBranch(gate,[.24,.35,sign*.72],[.24,.9,sign*.72],.025,.022,iron);
    glow(gate,'#ebc98a',.5,[.24,.97,sign*.72],.2);orb(gate,[.24,.97,sign*.72],[.046,.09,.046],gold);
  }
  for(let k=0;k<9;k++){const a=k/8*Math.PI,stone=mesh(blockGeometry,cutStone,gate,[0,1.33+Math.sin(a)*.6,Math.cos(a)*.7],[1,.98,.9]);stone.rotation.x=a-Math.PI/2;}
  orb(gate,[0,1.96,0],[.22,.09,.28],moss);
  for(let k=0;k<6;k++){const a=k*6.28/6; if(Math.cos(a)<-.3)continue;const stone=mesh(blockGeometry,cutStone,heart,[Math.cos(a)*1.18,.2,Math.sin(a)*1.12],[.7,1.6,.7]);stone.rotation.y=-a;}
  batchOpaque(group, new Set([heart])); batchOpaque(heartTrunk);

  const sharedGeometries = new Set(ownedGeometries), sharedMaterials = new Set(ownedMaterials);
  function releaseObject(object) {
    if (!object) return;
    if (object.userData.trail) releaseObject(object.userData.trail);
    object.parent?.remove(object); const geometries = new Set(), materials = new Set();
    object.traverse(child => { if (child.geometry && !sharedGeometries.has(child.geometry)) geometries.add(child.geometry); if (child.material && !sharedMaterials.has(child.material)) materials.add(child.material); });
    for (const geometry of geometries) { geometry.dispose(); ownedGeometries.delete(geometry); }
    for (const material of materials) { material.dispose(); ownedMaterials.delete(material); }
  }

  function makeTower(type, preview = false) {
    const object = new THREE.Group(), body = new THREE.Group(); object.add(body); object.userData.body = body; contact(object, 1.65, .65);
    // Weathered stone plinths ground the living guardians in the old grove.
    mesh(geom(new THREE.CylinderGeometry(.39,.48,.22,8)),cutStone,body,[0,.10,0]);
    mesh(geom(new THREE.CylinderGeometry(.35,.38,.16,8)),cutStone,body,[0,.285,0]);
    for(let k=0;k<4;k++){const a=k*Math.PI/2;const stone=mesh(geom(new THREE.BoxGeometry(.13,.16,.16)),cutStone,body,[Math.cos(a)*.30,.39,Math.sin(a)*.30]);stone.rotation.y=-a;}
    const tint = type === 'cannon' ? gold : type === 'frost' ? frost : type === 'lightning' ? violet : paleLeaf;
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; branch(body, [[Math.cos(a) * .52, .01, Math.sin(a) * .5], [Math.cos(a) * .25, .12, Math.sin(a) * .25], [0, .52, 0]], .046, wood, 8, 5); }
    const crown = new THREE.Group(); body.add(crown); object.userData.crown = crown;
    if (type === 'archer') {
      branch(body, [[0, .02, 0], [-.05, .52, .04], [0, 1.04, 0], [.05, 1.47, 0]], .105, wood, 15);
      for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28; const p = [Math.cos(a) * .29, .9, Math.sin(a) * .29]; branch(body, [[0, .5, 0], p, [p[0] * .5, 1.25, p[2] * .5]], .052, moss, 12); const blade = orb(body, p, [.11, .34, .12], paleLeaf); blade.rotation.z = Math.sin(a) * .55; blade.rotation.x = Math.cos(a) * .55; }
      crown.position.y = 1.22; const bow = branch(crown, [[-.43, .15, .02], [-.27, -.15, 0], [0, -.22, 0], [.27, -.15, 0], [.43, .15, .02]], .035, paleLeaf, 20, 6);
      const string = new THREE.Line(geom(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.43, .15, .02), new THREE.Vector3(0, .02, -.08), new THREE.Vector3(.43, .15, .02)])), new THREE.LineBasicMaterial({ color: '#d9dab4', transparent: true, opacity: .7 })); ownedMaterials.add(string.material); crown.add(string); taperedBranch(crown, [0, 0, -.25], [0, 0, .42], .025, .005, gold);
    } else if (type === 'cannon') {
      orb(body, [0, .44, 0], [.34, .45, .33], wood); foliage(body, [0, .38, 0], .34, 30, leaf); crown.position.y = .58;
      const barrel = mesh(geom(new THREE.CylinderGeometry(.23, .29, .68, 12, 4, true)), wood, crown, [0, .21, .12]); barrel.rotation.x = .78;
      const lip = mesh(geom(new THREE.TorusGeometry(.235, .047, 7, 24)), gold, crown, [0, .45, .36]); lip.rotation.x = -.78;
      const hollow = mesh(geom(new THREE.CircleGeometry(.19, 20)), basic('#192519'), crown, [0, .444, .352]); hollow.rotation.x = -.78;
      for (let i = 0; i < 5; i++) { const a = i * 6.28 / 5; orb(body, [Math.cos(a) * .34, .26, Math.sin(a) * .32], [.14, .18, .1], moss); }
    } else if (type === 'frost') {
      branch(body, [[0, 0, 0], [.08, .55, 0], [0, 1.08, 0]], .095, moss, 14);
      crown.position.y = .93;
      for (let i = 0; i < 7; i++) { const a = i * 6.28 / 7, crystal = mesh(geom(new THREE.OctahedronGeometry(.25, 0)), frost, crown, [Math.cos(a) * .22, .14, Math.sin(a) * .22], [.43, 1.6, .63]); crystal.rotation.z = Math.sin(a) * -.65; crystal.rotation.x = Math.cos(a) * .65; }
      orb(crown, [0, .17, 0], .14, frost); glow(crown, '#beeaff', 1.1, [0, .23, 0], .23);
      for (let i = 0; i < 3; i++) { const a = i * 2.1; const bud = orb(body, [Math.cos(a) * .21, .42, Math.sin(a) * .21], [.12, .23, .055], paleLeaf); bud.rotation.z = .6; }
    } else {
      for (const sign of [-1, 1]) branch(body, [[sign * .2, 0, 0], [sign * .09, .45, .05], [sign * .22, .86, -.03], [sign * .15, 1.4, 0]], .085, wood, 20);
      crown.position.y = 1.1;
      const crystal = mesh(geom(new THREE.OctahedronGeometry(.19)), violet, crown, [0, .28, 0], [.7, 1.45, .7]); object.userData.crystal = crystal;
      for (let i = 0; i < 5; i++) { const a = i * 6.28 / 5; branch(body, [[0, .66, 0], [Math.cos(a) * .38, 1.15, Math.sin(a) * .38], [Math.cos(a) * .47, 1.52, Math.sin(a) * .47]], .032, paleLeaf, 12, 5); }
      const orbit = mesh(geom(new THREE.TorusGeometry(.33, .009, 4, 48)), violet, crown, [0, .25, 0]); orbit.rotation.x = Math.PI / 2; object.userData.orbit = orbit; glow(crown, '#dcc3ff', 1.35, [0, .27, 0], .2);
    }
    batchOpaque(body, new Set([crown])); batchOpaque(crown, new Set([object.userData.crystal, object.userData.orbit].filter(Boolean)));
    if (preview) object.traverse(child => { if (child.isMesh && child.material) { const m = child.material.clone(); m.transparent = true; m.opacity = .45; m.depthWrite = false; ownedMaterials.add(m); child.material = m; } });
    return object;
  }

  function makeEnemy(enemy) {
    const object = new THREE.Group(), body = new THREE.Group(); object.add(body); object.userData.body = body; object.userData.type = enemy.type; object.userData.renderPosition = new THREE.Vector2(enemy.x, enemy.z); object.userData.slowVisual = null;
    const definition = ENEMY_TYPES[enemy.type], size = definition.size, armor = mat(definition.color, { roughness: .77 }), shellMaterial = mat(enemy.type === 'resistant' ? '#73777d' : enemy.type === 'boss' ? '#514737' : '#687052', { roughness: .88 }); grainMaterial(shellMaterial, .22, 50);
    const legs = [], n = enemy.type === 'runner' ? 4 : 3;
    for (let i = 0; i < n; i++) for (const sign of [-1, 1]) { const leg = new THREE.Group(); leg.position.set(sign * size * .45, .12, (i - (n - 1) / 2) * size * .7); body.add(leg); branch(leg, [[0, size * .2, 0], [sign * size * .8, size * .42, .08], [sign * size * 1.05, -.09, .12]], size * .09, darkWood, 5, 4); legs.push({ object: leg, phase: i * 1.8 + (sign < 0 ? 2 : 0), base: leg.rotation.z }); }
    orb(body, [0, size * .7, -.05], [size, size * .7, size * 1.25], shellMaterial); orb(body, [0, size * .72, size * .9], [size * .67, size * .6, size * .65], armor);
    for (const sign of [-1, 1]) orb(body, [sign * size * .29, size * .98, size * 1.38], size * .1, mat(enemy.type === 'resistant' ? '#d6c8e7' : '#d8b788', { emissive: '#bc7e47', emissiveIntensity: .8 }));
    const plates = enemy.type === 'tank' ? 4 : enemy.type === 'boss' ? 7 : 2;
    for (let i = 0; i < plates; i++) { const a = (i / plates - .5) * 2.4; const plate = mesh(ico, armor, body, [Math.sin(a) * size * .77, size * (1.15 + .25 * Math.cos(a)), (i % 2 - .5) * size], [size * .33, size * .34, size * .52]); plate.rotation.z = -a; }
    if (enemy.type === 'resistant') { const shield = mesh(geom(new THREE.SphereGeometry(size * 1.65, 16, 12)), basic('#b2a2d0', { transparent: true, opacity: .13, wireframe: true }), body, [0, size * .6, 0]); object.userData.shield = shield; }
    if (enemy.type === 'boss') for (const sign of [-1, 1]) branch(body, [[sign * size * .5, size, size * .4], [sign * size * .8, size * 1.7, size * .2], [sign * size * 1.3, size * 1.95, size * .6]], .075, darkWood, 10, 5);
    contact(object, size * 3.8, .57);
    const health = new THREE.Group(); health.position.y = size * 2.3 + .28; object.add(health);
    const healthWidth = size * 2.3, barBackground = mesh(geom(new THREE.PlaneGeometry(healthWidth, .045)), basic('#17271d', { transparent: true, opacity: .8, depthTest: false }), health);
    const bar = mesh(geom(new THREE.PlaneGeometry(healthWidth, .036)), basic('#cdd8a1', { transparent: true, opacity: .95, depthTest: false }), health, [0, 0, .003]); bar.renderOrder = 15; barBackground.renderOrder = 14;
    object.userData.legs = legs; object.userData.health = health; object.userData.bar = bar; object.userData.healthWidth = healthWidth; object.userData.material = armor; object.userData.size = size;
    return object;
  }

  let preview = null;
  const rangeGroup = new THREE.Group(); group.add(rangeGroup); rangeGroup.visible = false;
  const rangeFill = mesh(geom(new THREE.CircleGeometry(1, 96)), basic('#d7e5b0', { transparent: true, opacity: .038, side: THREE.DoubleSide, depthWrite: false }), rangeGroup, [0, .035, 0]); rangeFill.rotation.x = -Math.PI / 2;
  const rangeRing = ring(rangeGroup, 1, '#dbe8bd', .44, .007);
  const hoverRing = ring(group, .44, '#e3edbb', .78, .026); hoverRing.visible = false;
  const selectionRing = ring(group, .54, '#e4eac9', .65, .017); selectionRing.visible = false;
  function setBuildType(type) {
    if (buildType === type) return; buildType = type && TOWER_TYPES[type] ? type : null;
    if (preview) { releaseObject(preview); preview = null; }
    if (buildType) { preview = makeTower(buildType, true); group.add(preview); preview.visible = false; }
    plots.visible = active && !!buildType; if (!buildType) hoverRing.visible = false;
  }
  function syncBuildPreview() {
    if (preview) preview.visible = !!hover && active;
    if (hover && preview) { preview.position.set(hover.col - 8, .03, hover.row - 6); const valid = engine.canPlace(buildType, hover.col, hover.row); hoverRing.position.set(hover.col - 8, .055, hover.row - 6); hoverRing.material.color.set(valid ? '#e3edbb' : '#bd8173'); hoverRing.visible = true; rangeGroup.position.set(hover.col - 8, 0, hover.row - 6); rangeGroup.scale.setScalar(TOWER_TYPES[buildType].range); rangeRing.material.color.set(valid ? '#dbe8bd' : '#bd8173'); rangeGroup.visible = true; }
    else { hoverRing.visible = false; const selected = engine.getTower(); if (selected) { rangeGroup.position.set(selected.x, 0, selected.z); rangeGroup.scale.setScalar(selected.stats.range); rangeRing.material.color.set(TOWER_TYPES[selected.type].color); rangeGroup.visible = true; } else rangeGroup.visible = false; }
    const selected = engine.getTower(); selectionRing.visible = !!selected; if (selected) selectionRing.position.set(selected.x, .065, selected.z);
  }

  function spawnBurst(x, y, z, color, count = 15, speed = 1.2, lifetime = .7) {
    const geometry = geom(new THREE.BufferGeometry()), positions = new Float32Array(count * 3), velocities = [];
    for (let i = 0; i < count; i++) { positions.set([x, y, z], i * 3); const a = rand(0, 6.28); velocities.push([Math.cos(a) * rand(.2, speed), rand(.5, speed * 1.8), Math.sin(a) * rand(.2, speed)]); }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); const material = new THREE.PointsMaterial({ color, size: .08, map: softTexture, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }); ownedMaterials.add(material);
    const particles = new THREE.Points(geometry, material); group.add(particles); effects.push({ kind: 'burst', object: particles, velocities, age: 0, lifetime });
  }
  function pulse(x, z, color, radius, lifetime = .65) { const object = ring(group, 1, color, .6, .027); object.position.set(x, .08, z); effects.push({ kind: 'pulse', object, age: 0, lifetime, radius }); }
  function lightning(points) {
    const vertices = [];
    for (let i = 1; i < points.length; i++) { const a = new THREE.Vector3(points[i - 1].x, points[i - 1].y, points[i - 1].z), b = new THREE.Vector3(points[i].x, points[i].y, points[i].z); for (let j = 0; j <= 9; j++) { const p = a.clone().lerp(b, j / 9); if (j > 0 && j < 9) p.add(new THREE.Vector3(rand(-.12, .12), rand(-.2, .2), rand(-.12, .12))); vertices.push(p); } }
    const material = new THREE.LineBasicMaterial({ color: '#e8d8ff', transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending }); ownedMaterials.add(material);
    const object = new THREE.Line(geom(new THREE.BufferGeometry().setFromPoints(vertices)), material); group.add(object); effects.push({ kind: 'lightning', object, age: 0, lifetime: .23 });
  }
  function consumeEffects() {
    for (const event of engine.drainEffects()) {
      callbacks.effect?.(event);
      if (event.type === 'placement' || event.type === 'upgrade') { spawnBurst(event.x, .2, event.z, TOWER_TYPES[event.entityType || event.towerType]?.color || '#cfdbad', 28, 1.2, .95); pulse(event.x, event.z, '#dce6b8', 1.15, .85); }
      if (event.type === 'impact') { const color = TOWER_TYPES[event.projectileType]?.color || '#dde5bb'; spawnBurst(event.x, .35, event.z, color, event.projectileType === 'cannon' ? 35 : 9, event.projectileType === 'cannon' ? 2.4 : .7, .55); if (event.projectileType !== 'archer') pulse(event.x, event.z, color, event.radius); }
      if (event.type === 'lightning') lightning(event.points);
      if (event.type === 'death') { spawnBurst(event.x, .25, event.z, '#d1c395', 15, 1, .85); }
      if (event.type === 'leak') { pulse(8.35, 0, '#dda48b', 1.8); spawnBurst(8.35, 1, 0, '#ddbd92', 20, 1.2); }
      if (event.type === 'sell') pulse(event.x, event.z, '#d9c69b', .9);
    }
  }

  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 150), intersection = new THREE.Vector3();
  function ignorePointer(event) { return event.target?.closest?.('.game-ui, button, a, input, select, [role="dialog"]'); }
  function locate(event) {
    const rect = renderer.domElement.getBoundingClientRect(); mouse.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1); raycaster.setFromCamera(mouse, camera);
    if (!raycaster.ray.intersectPlane(plane, intersection)) return null;
    const local = group.worldToLocal(intersection.clone()), col = Math.round(local.x + 8), row = Math.round(local.z + 6); if (col < 0 || col > 16 || row < 0 || row > 12) return null; return { col, row, x: local.x, z: local.z };
  }
  function pointerMove(event) {
    if (!active) return;
    if (drag) { const dx = event.clientX - drag.x, dy = event.clientY - drag.y; dragDistance += Math.abs(dx) + Math.abs(dy); if (!buildType && dragDistance > 7) drag.pan = true; if (drag.pan) { const forward = cameraTarget.clone().sub(cameraPosition); forward.y = 0; forward.normalize(); const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)); const shift = right.multiplyScalar(-dx * 1.5).addScaledVector(forward, dy * 1.5); cameraPosition.add(shift); cameraTarget.add(shift); } drag.x = event.clientX; drag.y = event.clientY; }
    hover = ignorePointer(event) ? null : locate(event); syncBuildPreview(); callbacks.onHoverCell?.(hover);
  }
  function pointerDown(event) { if (!active || ignorePointer(event)) return; drag = { x: event.clientX, y: event.clientY, pan: event.button === 1 || event.button === 2 || event.shiftKey }; dragDistance = 0; }
  function pointerUp(event) {
    if (!active || !drag) return; const wasPan = drag.pan; drag = null; if (wasPan || dragDistance > 7 || ignorePointer(event)) return;
    const cell = locate(event); if (!cell) return; const tower = engine.towers.find(t => t.col === cell.col && t.row === cell.row);
    if (tower) callbacks.onSelectTower?.(tower.id); else callbacks.onCell?.(cell.col, cell.row);
  }
  function wheel(event) { if (!active || ignorePointer(event)) return; event.preventDefault(); zoom(event.deltaY); }
  function zoom(delta) { const offset = cameraPosition.clone().sub(cameraTarget), next = Math.max(1200, Math.min(window.innerWidth < 760 ? 6500 : 3100, offset.length() * Math.exp(delta * .00075))); cameraPosition.copy(cameraTarget).add(offset.setLength(next)); }
  function contextMenu(event) { if (active && !ignorePointer(event)) event.preventDefault(); }
  window.addEventListener('pointermove', pointerMove); window.addEventListener('pointerdown', pointerDown); window.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('wheel', wheel, { passive: false }); renderer.domElement.addEventListener('contextmenu', contextMenu);

  function update(dt, time) {
    if (!active && !group.visible) return;
    elapsed = typeof time === 'number' ? time : elapsed + dt; windUniform.value = reducedMotion ? 0 : elapsed;
    consumeEffects();
    const towerIds = new Set(engine.towers.map(t => t.id));
    for (const [id, object] of towerMeshes) if (!towerIds.has(id)) { releaseObject(object); towerMeshes.delete(id); }
    for (const tower of engine.towers) {
      let object = towerMeshes.get(tower.id); if (!object || object.userData.type !== tower.type) { if (object) releaseObject(object); object = makeTower(tower.type); object.userData.type = tower.type; object.userData.growth = .01; object.userData.growthVelocity = 0; towerMeshes.set(tower.id, object); group.add(object); }
      object.position.set(tower.x, .01, tower.z);
      const springDt = Math.min(dt, .035), spring = object.userData;
      spring.growthVelocity += ((1 - spring.growth) * 100 - spring.growthVelocity * 13) * springDt; spring.growth += spring.growthVelocity * springDt;
      const levelSize = 1 + (tower.level - 1) * .1, growth = object.userData.growth, shotAge = engine.time - (tower.firedAt ?? -10);
      object.scale.setScalar(levelSize * growth); object.userData.body.scale.y = 1 - Math.exp(-Math.max(0, shotAge) * 15) * .12;
      const target = engine.enemies.find(e => e.id === tower.targetId); if (target && tower.type !== 'frost') { const targetAngle = Math.atan2(target.x - tower.x, target.z - tower.z); let difference = targetAngle - object.userData.crown.rotation.y; difference = Math.atan2(Math.sin(difference), Math.cos(difference)); object.userData.crown.rotation.y += difference * (1 - Math.exp(-dt * 12)); }
      if (object.userData.crystal) { object.userData.crystal.rotation.y = elapsed * .65; object.userData.crystal.position.y = .28 + Math.sin(elapsed * 1.6) * .035; }
      if (object.userData.orbit) object.userData.orbit.rotation.z = Math.sin(elapsed) * .22;
    }
    const enemyIds = new Set(engine.enemies.map(e => e.id));
    for (const [id, object] of enemyMeshes) if (!enemyIds.has(id)) { releaseObject(object); enemyMeshes.delete(id); }
    for (const enemy of engine.enemies) {
      let object = enemyMeshes.get(enemy.id); if (!object || object.userData.type !== enemy.type) { if (object) releaseObject(object); object = makeEnemy(enemy); enemyMeshes.set(enemy.id, object); group.add(object); }
      const visual = object.userData.renderPosition, follow = 1 - Math.exp(-dt * 28); visual.x += (enemy.x - visual.x) * follow; visual.y += (enemy.z - visual.y) * follow;
      object.position.set(visual.x, .04, visual.y); let angle = enemy.angle - object.userData.body.rotation.y; angle = Math.atan2(Math.sin(angle), Math.cos(angle)); object.userData.body.rotation.y += angle * (1 - Math.exp(-dt * 13));
      const walking = engine.time * enemy.speed * 11 + enemy.seed * 7; object.userData.body.position.y = Math.sin(walking * 2) * .018; object.userData.body.rotation.z = Math.sin(walking) * .035;
      object.userData.legs.forEach(leg => { leg.object.rotation.y = Math.sin(walking + leg.phase) * .34; leg.object.rotation.z = Math.cos(walking + leg.phase) * .15; });
      const slowed = enemy.slowUntil > engine.time; if (object.userData.slowVisual !== slowed) { object.userData.material.emissive.set(slowed ? '#426c7d' : '#8b5030'); object.userData.slowVisual = slowed; } object.userData.material.emissiveIntensity = slowed ? .25 : Math.max(0, 1 - (engine.time - enemy.hitAt) * 7) * .6;
      object.userData.health.quaternion.copy(camera.quaternion); const hp = Math.max(0, enemy.hp / enemy.maxHp); object.userData.bar.scale.x = hp; object.userData.bar.position.x = -(1 - hp) * object.userData.healthWidth / 2; object.userData.bar.material.color.set(hp > .35 ? '#cdd8a1' : '#d8a084'); object.userData.health.visible = hp < .99 || enemy.type === 'boss';
      if (object.userData.shield) object.userData.shield.rotation.y = elapsed * .3;
    }
    const projectiles = engine.projectiles.toArray(), projectileIds = new Set(projectiles.map(p => p.id));
    for (const [id, object] of projectileMeshes) if (!projectileIds.has(id)) { releaseObject(object); projectileMeshes.delete(id); }
    for (const projectile of projectiles) {
      let object = projectileMeshes.get(projectile.id); if (!object) { object = new THREE.Group(); const color = TOWER_TYPES[projectile.type].color; if (projectile.type === 'archer') { const thorn = mesh(geom(new THREE.ConeGeometry(.04, .38, 5)), paleLeaf, object); thorn.rotation.x = Math.PI / 2; } else { orb(object, [0, 0, 0], projectile.type === 'cannon' ? .15 : .085, projectile.type === 'cannon' ? gold : frost); glow(object, color, projectile.type === 'cannon' ? .48 : .58, [0, 0, 0], .35); } const trailPositions = new Float32Array(21), trailGeo = geom(new THREE.BufferGeometry()); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3)); const trailMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .42 }); ownedMaterials.add(trailMat); const trail = new THREE.Line(trailGeo, trailMat); group.add(trail); object.userData.trail = trail; object.userData.history = []; projectileMeshes.set(projectile.id, object); group.add(object); }
      object.position.set(projectile.x, projectile.y, projectile.z); if (Math.hypot(projectile.vx, projectile.vy, projectile.vz) > .01) object.lookAt(projectile.x + projectile.vx, projectile.y + projectile.vy, projectile.z + projectile.vz);
      const history = object.userData.history; history.unshift(object.position.clone()); if (history.length > 7) history.pop(); const positions = object.userData.trail.geometry.attributes.position; for (let i = 0; i < 7; i++) { const p = history[Math.min(i, history.length - 1)]; positions.setXYZ(i, p.x, p.y, p.z); } positions.needsUpdate = true;
    }
    // Removed projectiles carry their trail outside their group.
    for (let i = group.children.length - 1; i >= 0; i--) { const child = group.children[i]; if (child.isLine && child.userData.projectileTrail && !projectileIds.has(child.userData.projectileTrail)) group.remove(child); }
    for (const [id, object] of projectileMeshes) object.userData.trail.userData.projectileTrail = id;
    for (let i = effects.length - 1; i >= 0; i--) {
      const effect = effects[i]; effect.age += dt; const t = effect.age / effect.lifetime; if (t >= 1) { releaseObject(effect.object); effects.splice(i, 1); continue; }
      effect.object.material.opacity = (1 - t) * (effect.kind === 'pulse' ? .6 : 1);
      if (effect.kind === 'pulse') effect.object.scale.setScalar(Math.max(.01, effect.radius * (1 - Math.pow(1 - t, 3))));
      if (effect.kind === 'burst') { const positions = effect.object.geometry.attributes.position; for (let k = 0; k < positions.count; k++) { const velocity = effect.velocities[k]; velocity[1] -= dt * 2.8; positions.setXYZ(k, positions.getX(k) + velocity[0] * dt, positions.getY(k) + velocity[1] * dt, positions.getZ(k) + velocity[2] * dt); } positions.needsUpdate = true; }
    }
    if (!reducedMotion) {
      for (const item of swaying) item.object.rotation.z = Math.sin(elapsed * .65 + item.phase) * item.strength;
      heartTrunk.rotation.z = Math.sin(elapsed * .48) * .009; heartGlow.material.opacity = .18 + Math.sin(elapsed * 1.4) * .035; heartCore.material.emissiveIntensity = .9 + Math.sin(elapsed * 1.4) * .2;
      for (let i = 0; i < pollenCount; i++) { const p = pollenOrigins[i]; pollenPositions[i * 3] = p[0] + Math.sin(elapsed * .14 + p[3]) * .45; pollenPositions[i * 3 + 1] = p[1] + Math.sin(elapsed * .24 + p[3]) * .23; pollenPositions[i * 3 + 2] = p[2] + Math.cos(elapsed * .15 + p[3]) * .37; } pollenGeometry.attributes.position.needsUpdate = true;
      groundMist.forEach((mist, i) => { mist.position.x += Math.sin(elapsed * .07 + i) * dt * .035; }); entranceRing.material.opacity = .2 + Math.sin(elapsed * 1.5) * .1;
    }
    if (preview) { preview.rotation.y = Math.sin(elapsed * .4) * .035; preview.scale.y = 1 + Math.sin(elapsed * 2) * .025; }
    syncBuildPreview();
  }
  function setActive(value) { active = value; group.visible = value; plots.visible = value && !!buildType; if (!value) { hover = null; drag = null; } }
  function resetCamera() { cameraPosition.copy(homePosition); cameraTarget.copy(homeTarget); }
  function resize() {
    const narrow = window.innerWidth < 760;
    homeTarget.set(0, narrow ? -350 : -120, -900);
    if (narrow) {
      const distance = Math.max(2850, 1450 / (2 * Math.tan(Math.PI / 9) * (window.innerWidth / window.innerHeight)));
      homePosition.copy(homeTarget).add(new THREE.Vector3(100, 2350, 2900).setLength(distance));
    } else homePosition.set(600, 1100, 650);
    if (!drag) resetCamera();
  }
  function dispose() { window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerdown', pointerDown); window.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('wheel', wheel); renderer.domElement.removeEventListener('contextmenu', contextMenu); scene.remove(group); ownedGeometries.forEach(g => g.dispose()); ownedMaterials.forEach(m => m.dispose()); ownedTextures.forEach(t => t.dispose()); }
  return { group, cameraPosition, cameraTarget, update, setActive, zoom, resetCamera, resize, dispose, setBuildType };
}
