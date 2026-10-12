from pathlib import Path
import re,hashlib,json
base=Path(__file__).resolve().parent.parent
original=base/'public/landing-pages/inner-green-3d.original.html'
s=original.read_text()
for url in set(re.findall(r'https://[^\s\"\)\']+',s)):
    name='lexend-latin.woff2' if url.endswith('.woff2') else url.rsplit('/',1)[-1]
    s=s.replace(url,'inner-green-assets/'+name)
s=s.replace('<title>Sylva — Into the living world</title>','<title>SYLVA — Defend the Living World</title>')
s=s.replace('Step into</i>','Defend</i>')
s=s.replace('We restore wild places through patient design, native planting, and a deeper kind of stewardship.','A living world is under siege. Build your defenses. Protect the grove. Let nature fight back.')
s=s.replace('Explore the work','Explore the game').replace('Play the film','Play Sylva')
s=s.replace('Canopy restored</dt><dd>282 ha','Waves to survive</dt><dd>10 seasons').replace('Native species</dt><dd>43 mapped','Living defenses</dt><dd>4 guardians')
s=s.replace('Our Ethos</p>','Your purpose</p>').replace('Let the wild lead.</h2>','Let the wild fight back.</h2>')
s=s.replace('Field Note 07</p>','The living archive</p>').replace('After the Rain</h2>','Patterns of survival</h2>')
s=s.replace('    buildAmbient();\n    layout();','''    buildAmbient();
    window.sylvaWorld = { THREE: THREE, renderer: renderer, scene: scene, camera: camera,
      nearGroup: nearGroup, farGroup: farGroup, motes: motes, shadowMesh: shadowMesh, glowMesh: glowMesh,
      assembleRoot: assembleRoot, buildNearRoot: buildNearRoot, buildFarRoot: buildFarRoot,
      uTime: uTime, uWind: uWind, uScanR: uScanR, uScanO: uScanO, uScanOn: uScanOn,
      uMouseNear: uMouseNear, radialTexture: radialTexture, layout: layout,
      burstAt: burstAt, reducedMotion: REDUCED };
    window.dispatchEvent(new Event('sylva-ready'));
    layout();''')
s=s.replace('    renderer.render(scene, camera);','    if (window.sylvaFrame) window.sylvaFrame(dt, uTime.value);\n    renderer.render(scene, camera);')
s=s.replace('</head>','<link rel="stylesheet" href="/src/experience.css">\n</head>')
s=s.replace('</body>','<script type="module" src="/src/main.js"></script>\n</body>')
(base/'public/landing-pages/inner-green-3d.html').write_text(s)
manifest={'source_url':'https://threeui.com/landing-pages/inner-green-3d.html','original_sha256':hashlib.sha256(original.read_bytes()).hexdigest(),'note':'Original kept byte-for-byte. Adapted page localizes the three remote media URLs, adjusts game copy, and adds a shared renderer hook; authored shaders and geometry remain intact.'}
(base/'public/landing-pages/source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
