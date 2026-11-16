/* =========================================================
   Hero 3D scene: toon-shaded (MeshToonMaterial + inverted-hull outlines)
   Loaded lazily by main.js only on capable, larger screens.
   ========================================================= */
(function () {
  'use strict';

  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

  var C = {
    deep: '#5C0A1A', maroon: '#800020', wine: '#A4243B', rose: '#F4A6B8',
    cream: '#FFF4E6', ink: '#1A0A0E', gold: '#E8B04B'
  };

  /* ---------- 2D canvas helpers for textures ---------- */
  function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    if (g.roundRect) { g.roundRect(x, y, w, h, r); return; }
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function clipRect(g, x, y, w, h, draw) {
    g.save();
    g.beginPath(); g.rect(x, y, w, h); g.clip();
    draw();
    g.restore();
  }
  function halftone(g, x, y, w, h, bg, dot, step, radius) {
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    g.fillStyle = dot;
    for (var yy = y + step / 2, row = 0; yy < y + h; yy += step, row++) {
      for (var xx = x + (row % 2 ? step : step / 2); xx < x + w; xx += step) {
        g.beginPath(); g.arc(xx, yy, radius, 0, Math.PI * 2); g.fill();
      }
    }
  }
  function speedLines(g, x, y, w, h, bg, line) {
    g.fillStyle = bg; g.fillRect(x, y, w, h);
    var cx = x + w / 2, cy = y + h / 2, R = Math.max(w, h);
    g.strokeStyle = line;
    for (var i = 0; i < 44; i++) {
      var a = (i / 44) * Math.PI * 2;
      g.lineWidth = i % 3 === 0 ? 3 : 1.5;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * R * 0.22, cy + Math.sin(a) * R * 0.22);
      g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      g.stroke();
    }
  }
  function starPath(g, cx, cy, points, outer, inner) {
    g.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = -Math.PI / 2 + (i * Math.PI) / points;
      var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }
  function drawStar(g, cx, cy, points, outer, inner, fill) {
    starPath(g, cx, cy, points, outer, inner);
    g.fillStyle = fill; g.fill();
    g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = C.ink; g.stroke();
  }

  /* ---------- Scene ---------- */
  function init(opts) {
    var canvas = opts.canvas;
    var container = opts.container;
    var reducedMotion = !!opts.reducedMotion;

    return import(THREE_URL).then(function (THREE) {
      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      } catch (err) {
        return false;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // cap at 2
      renderer.setClearColor(0x000000, 0);

      var scene = new THREE.Scene();
      var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 16);

      scene.add(new THREE.AmbientLight(0xffffff, 1.3));
      var sun = new THREE.DirectionalLight(0xffffff, 1.9);
      sun.position.set(-5, 7, 9);
      scene.add(sun);

      // 3-step toon ramp: hard cel bands instead of smooth lighting
      var ramp = new THREE.DataTexture(new Uint8Array([70, 160, 255]), 3, 1, THREE.RedFormat);
      ramp.minFilter = THREE.NearestFilter;
      ramp.magFilter = THREE.NearestFilter;
      ramp.generateMipmaps = false;
      ramp.needsUpdate = true;

      function toon(hex, extra) {
        var params = { color: new THREE.Color(hex), gradientMap: ramp };
        if (extra) for (var k in extra) params[k] = extra[k];
        return new THREE.MeshToonMaterial(params);
      }
      var inkHull = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.ink), side: THREE.BackSide });

      function canvasTex(cnv) {
        var t = new THREE.CanvasTexture(cnv);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
        return t;
      }

      // Inverted-hull outline: a slightly larger back-face-only ink copy behind the mesh
      function outlined(geometry, material, thickness) {
        thickness = thickness || 0.07;
        geometry.computeBoundingBox();
        var size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        var group = new THREE.Group();
        var hull = new THREE.Mesh(geometry, inkHull);
        hull.scale.set(
          (size.x + thickness * 2) / size.x,
          (size.y + thickness * 2) / size.y,
          (size.z + thickness * 2) / size.z
        );
        group.add(hull, new THREE.Mesh(geometry, material));
        return group;
      }

      function starShape(points, outer, inner) {
        var s = new THREE.Shape();
        for (var i = 0; i < points * 2; i++) {
          var r = i % 2 === 0 ? outer : inner;
          var a = Math.PI / 2 + (i * Math.PI) / points;
          var x = Math.cos(a) * r, y = Math.sin(a) * r;
          if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
        }
        s.closePath();
        return s;
      }

      /* ----- Geometry ----- */
      var starGeo = new THREE.ExtrudeGeometry(starShape(5, 1, 0.46), {
        depth: 0.34, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 1, curveSegments: 1
      });
      starGeo.center();
      var sparkGeo = new THREE.ExtrudeGeometry(starShape(4, 1, 0.24), {
        depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 1, curveSegments: 1
      });
      sparkGeo.center();
      var panelGeo = new THREE.BoxGeometry(2.2, 3.0, 0.1);

      /* ----- Textures ----- */
      function panelTexture(variant) {
        var cnv = makeCanvas(256, 352), g = cnv.getContext('2d');
        g.fillStyle = C.cream; g.fillRect(0, 0, 256, 352);
        var A = [18, 18, 220, 150], B = [18, 184, 104, 150], D = [134, 184, 104, 150];
        var fills = [
          [function () { speedLines(g, A[0], A[1], A[2], A[3], C.cream, C.ink); drawStar(g, 128, 93, 5, 34, 15, C.gold); },
           function () { halftone(g, B[0], B[1], B[2], B[3], C.cream, C.rose, 11, 3.2); },
           function () { g.fillStyle = C.maroon; g.fillRect(D[0], D[1], D[2], D[3]); drawStar(g, 186, 259, 4, 34, 8, C.cream); }],
          [function () { halftone(g, A[0], A[1], A[2], A[3], C.maroon, C.wine, 12, 3.6); drawStar(g, 128, 93, 4, 46, 11, C.cream); },
           function () { speedLines(g, B[0], B[1], B[2], B[3], C.cream, C.ink); },
           function () { g.fillStyle = C.rose; g.fillRect(D[0], D[1], D[2], D[3]); drawStar(g, 186, 259, 5, 30, 13, C.gold); }],
          [function () { halftone(g, A[0], A[1], A[2], A[3], C.rose, C.cream, 12, 3.4); drawStar(g, 128, 93, 5, 40, 18, C.gold); },
           function () { g.fillStyle = C.wine; g.fillRect(B[0], B[1], B[2], B[3]); drawStar(g, 70, 259, 4, 28, 7, C.rose); },
           function () { speedLines(g, D[0], D[1], D[2], D[3], C.cream, C.maroon); }]
        ][variant % 3];
        [A, B, D].forEach(function (r, i) { clipRect(g, r[0], r[1], r[2], r[3], fills[i]); });
        g.lineWidth = 7; g.strokeStyle = C.ink;
        [A, B, D].forEach(function (r) { g.strokeRect(r[0], r[1], r[2], r[3]); });
        g.lineWidth = 12; g.strokeRect(6, 6, 244, 340);
        return canvasTex(cnv);
      }

      function codeTexture() {
        var cnv = makeCanvas(512, 340), g = cnv.getContext('2d');
        g.fillStyle = C.ink; g.fillRect(0, 0, 512, 340);
        g.fillStyle = C.deep; g.fillRect(0, 0, 512, 46);
        [[28, C.rose], [56, C.gold], [84, C.cream]].forEach(function (d) {
          g.fillStyle = d[1]; g.beginPath(); g.arc(d[0], 23, 9, 0, Math.PI * 2); g.fill();
        });
        g.fillStyle = C.wine; roundRect(g, 380, 14, 110, 18, 9); g.fill();
        var lines = [
          [0, 150, C.rose], [1, 230, C.gold], [2, 170, C.cream], [2, 120, C.rose],
          [1, 80, C.gold], [0, 60, C.cream], [0, 210, C.wine], [1, 140, C.rose]
        ];
        var y = 72;
        lines.forEach(function (ln) {
          g.fillStyle = ln[2];
          roundRect(g, 34 + ln[0] * 36, y, ln[1], 16, 8); g.fill();
          if (ln[1] > 120) {
            g.fillStyle = C.cream; g.globalAlpha = 0.35;
            roundRect(g, 34 + ln[0] * 36 + ln[1] + 12, y, 46, 16, 8); g.fill();
            g.globalAlpha = 1;
          }
          y += 32;
        });
        g.fillStyle = C.gold; g.fillRect(34 + 36 + 140 + 70, y - 32, 10, 18);
        return canvasTex(cnv);
      }

      function keyboardTexture() {
        var cnv = makeCanvas(320, 210), g = cnv.getContext('2d');
        g.fillStyle = C.maroon; g.fillRect(0, 0, 320, 210);
        g.fillStyle = C.deep;
        for (var r = 0; r < 4; r++) {
          for (var k = 0; k < 11; k++) { roundRect(g, 20 + k * 26.5, 18 + r * 26, 22, 21, 4); g.fill(); }
        }
        roundRect(g, 74, 122, 172, 20, 5); g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 4;
        roundRect(g, 108, 152, 104, 48, 8); g.fillStyle = C.wine; g.fill(); g.stroke();
        return canvasTex(cnv);
      }

      /* ----- Objects ----- */
      var world = new THREE.Group();
      scene.add(world);
      var items = [];

      function addItem(obj, cfg) {
        obj.scale.setScalar(cfg.scale || 1);
        world.add(obj);
        items.push({
          obj: obj,
          nx: cfg.nx, ny: cfg.ny, z: cfg.z,
          base: new THREE.Vector3(),
          rot: new THREE.Euler(cfg.rx || 0, cfg.ry || 0, cfg.rz || 0),
          spin: cfg.spin || 0,
          sway: cfg.sway == null ? 0.25 : cfg.sway,
          amp: cfg.amp == null ? 0.25 : cfg.amp,
          speed: cfg.speed || 0.6,
          phase: Math.random() * Math.PI * 2
        });
      }

      // Stars (gold / rose / cream)
      [
        { c: C.gold, nx: -0.8, ny: 0.66, z: -2, scale: 0.75, spin: 0.35 },
        { c: C.rose, nx: 0.9, ny: 0.62, z: -4, scale: 0.6, spin: -0.3 },
        { c: C.cream, nx: 0.08, ny: -0.82, z: -3, scale: 0.45, spin: 0.4 },
        { c: C.gold, nx: -0.3, ny: 0.92, z: -7, scale: 0.55, spin: -0.25 },
        { c: C.wine, nx: 0.55, ny: -0.9, z: -6, scale: 0.6, spin: 0.3 }
      ].forEach(function (s) {
        addItem(outlined(starGeo, toon(s.c), 0.07), {
          nx: s.nx, ny: s.ny, z: s.z, scale: s.scale, spin: s.spin, rz: Math.random(), amp: 0.3
        });
      });

      // Sparkles (4-point)
      [
        { c: C.rose, nx: 0.42, ny: 0.8, z: -1, scale: 0.42 },
        { c: C.cream, nx: -0.58, ny: -0.42, z: -4, scale: 0.5 },
        { c: C.gold, nx: 0.97, ny: -0.1, z: -2, scale: 0.38 },
        { c: C.rose, nx: -0.96, ny: -0.86, z: -5, scale: 0.55 },
        { c: C.cream, nx: 0.28, ny: 0.15, z: -11, scale: 0.8 },
        { c: C.gold, nx: -0.12, ny: 0.6, z: -9, scale: 0.6 }
      ].forEach(function (s) {
        addItem(outlined(sparkGeo, toon(s.c), 0.05), {
          nx: s.nx, ny: s.ny, z: s.z, scale: s.scale, spin: 0.6, amp: 0.35, speed: 0.8
        });
      });

      // Floating manga panels
      var cream = toon(C.cream);
      [
        { nx: -0.93, ny: 0.05, z: -6, rz: 0.2, ry: 0.35, v: 0 },
        { nx: 0.8, ny: -0.5, z: -7, rz: -0.16, ry: -0.4, v: 1 },
        { nx: 0.42, ny: 0.86, z: -9, rz: 0.1, ry: -0.2, v: 2 }
      ].forEach(function (p) {
        var face = toon('#ffffff', { map: panelTexture(p.v) });
        var mats = [cream, cream, cream, cream, face, face];
        addItem(outlined(panelGeo, mats, 0.07), {
          nx: p.nx, ny: p.ny, z: p.z, rz: p.rz, ry: p.ry, sway: 0.18, amp: 0.3, speed: 0.45
        });
      });

      // Laptop with code window
      var codeTex = codeTexture();
      (function () {
        var laptop = new THREE.Group();
        var side = toon(C.maroon);
        var top = toon('#ffffff', { map: keyboardTexture() });
        var base = outlined(new THREE.BoxGeometry(3.2, 0.18, 2.1), [side, side, top, side, side, side], 0.06);
        laptop.add(base);

        var bezel = toon(C.deep);
        var screenFace = new THREE.MeshBasicMaterial({ map: codeTex });
        var screen = outlined(new THREE.BoxGeometry(3.2, 2.1, 0.12), [bezel, bezel, bezel, bezel, screenFace, bezel], 0.06);
        screen.position.set(0, 1.05, 0);
        var hinge = new THREE.Group();
        hinge.position.set(0, 0.09, -1.02);
        hinge.rotation.x = -0.28;
        hinge.add(screen);
        laptop.add(hinge);

        addItem(laptop, { nx: 0.02, ny: 0.8, z: -4.5, scale: 0.85, rx: 0.38, ry: -0.5, rz: 0.04, sway: 0.2, amp: 0.25, speed: 0.5 });
      })();

      // Separate floating code window
      (function () {
        var frame = toon(C.deep);
        var face = new THREE.MeshBasicMaterial({ map: codeTex });
        var win = outlined(new THREE.BoxGeometry(2.6, 1.72, 0.1), [frame, frame, frame, frame, face, frame], 0.06);
        addItem(win, { nx: -0.8, ny: -0.72, z: -1.5, scale: 0.7, ry: 0.4, rz: -0.06, sway: 0.15, amp: 0.3, speed: 0.55 });
      })();

      /* ----- Light particles ----- */
      var points = null;
      var pCount = 70;
      var pSpeed = new Float32Array(pCount);
      if (!reducedMotion) {
        var pGeo = new THREE.BufferGeometry();
        var pos = new Float32Array(pCount * 3);
        var col = new Float32Array(pCount * 3);
        var palette = [new THREE.Color(C.cream), new THREE.Color(C.gold), new THREE.Color(C.rose)];
        for (var i = 0; i < pCount; i++) {
          pos[i * 3] = (Math.random() - 0.5) * 28;
          pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
          pos[i * 3 + 2] = -2 - Math.random() * 9;
          var pc = palette[i % 3];
          col[i * 3] = pc.r; col[i * 3 + 1] = pc.g; col[i * 3 + 2] = pc.b;
          pSpeed[i] = 0.25 + Math.random() * 0.45;
        }
        pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        pGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        var dot = makeCanvas(64, 64), dg = dot.getContext('2d');
        dg.fillStyle = '#ffffff'; dg.beginPath(); dg.arc(32, 32, 26, 0, Math.PI * 2); dg.fill();
        var dotTex = new THREE.CanvasTexture(dot);
        points = new THREE.Points(pGeo, new THREE.PointsMaterial({
          size: 0.14, map: dotTex, vertexColors: true, transparent: true, opacity: 0.85,
          alphaTest: 0.4, depthWrite: false, sizeAttenuation: true
        }));
        world.add(points);
      }

      /* ----- Layout: place items relative to the visible frustum ----- */
      var tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      function layout() {
        items.forEach(function (it) {
          var dist = camera.position.z - it.z;
          var h = 2 * dist * tanHalf, w = h * camera.aspect;
          it.base.set(it.nx * w / 2, it.ny * h / 2, it.z);
          it.obj.position.copy(it.base);
          it.obj.rotation.copy(it.rot);
        });
      }

      function resize() {
        var w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return false;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        layout();
        return true;
      }

      /* ----- Pointer / touch parallax ----- */
      var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
      if (!reducedMotion) {
        window.addEventListener('pointermove', function (e) {
          pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
          pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });
        window.addEventListener('touchmove', function (e) {
          var t = e.touches && e.touches[0];
          if (!t) return;
          pointer.tx = (t.clientX / window.innerWidth) * 2 - 1;
          pointer.ty = (t.clientY / window.innerHeight) * 2 - 1;
        }, { passive: true });
      }

      /* ----- Animation loop ----- */
      var clock = new THREE.Clock();
      var elapsed = 0;

      function frame() {
        var dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        var t = elapsed;

        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        world.rotation.y = pointer.x * 0.2;
        world.rotation.x = pointer.y * 0.12;

        for (var n = 0; n < items.length; n++) {
          var it = items[n];
          it.obj.position.set(
            it.base.x + Math.sin(t * it.speed * 0.7 + it.phase) * it.amp * 0.5,
            it.base.y + Math.sin(t * it.speed + it.phase) * it.amp,
            it.base.z
          );
          it.obj.rotation.set(
            it.rot.x + Math.sin(t * 0.5 + it.phase) * it.sway * 0.5,
            it.rot.y + (it.spin ? t * it.spin : Math.sin(t * 0.4 + it.phase) * it.sway),
            it.rot.z + Math.sin(t * 0.35 + it.phase) * it.sway * 0.4
          );
        }

        if (points) {
          var arr = points.geometry.attributes.position.array;
          for (var p = 0; p < pCount; p++) {
            arr[p * 3 + 1] += pSpeed[p] * dt;
            if (arr[p * 3 + 1] > 7.5) arr[p * 3 + 1] = -7.5;
          }
          points.geometry.attributes.position.needsUpdate = true;
        }

        renderer.render(scene, camera);
      }

      function renderStill() { renderer.render(scene, camera); }

      var inView = true;
      function updateLoop() {
        var run = !reducedMotion && inView && !document.hidden;
        if (run) clock.getDelta(); // avoid a jump after pausing
        renderer.setAnimationLoop(run ? frame : null);
      }

      if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
          if (resize() && reducedMotion) renderStill();
        }).observe(container);
      } else {
        window.addEventListener('resize', function () { if (resize() && reducedMotion) renderStill(); });
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          inView = entries[0].isIntersecting;
          updateLoop();
        }).observe(container);
      }
      document.addEventListener('visibilitychange', updateLoop);

      canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault();
        renderer.setAnimationLoop(null);
        container.classList.remove('has-3d');
      });

      resize();
      renderStill();
      updateLoop();
      return true;
    }).catch(function (err) {
      if (window.console) console.warn('Hero 3D scene unavailable, using the static illustration.', err);
      return false;
    });
  }

  window.HeroScene = { init: init };
})();
