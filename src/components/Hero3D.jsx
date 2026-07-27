import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

// Interactive 3D "sponsor network" for the hero section.
//
// This replaces the earlier version (a single-colour point cloud with straight
// grey lines). What's different, and why:
//
// - COLOUR MEANS SOMETHING. Each node is tinted by UK visa route - Skilled
//   Worker (blue), Health & Care (green), Shortage Occupation (orange), New
//   Entrant (violet). It isn't decoration: the colour spread is a visual
//   restatement of "we cover every route", which is the actual product claim.
// - HOVER TO INSPECT. Raycasting picks individual nodes; the hovered node
//   swells and a label appears showing the route and a real UK city. We
//   deliberately do NOT invent company names here - this is a verification
//   product, and fabricated "sponsor" names in the marketing graphic would
//   undercut the exact thing the site is selling.
// - DATA IN MOTION. Curved arcs replace straight lines, and light pulses
//   travel along them, so the network reads as live rather than static.
// - DEPTH. A fresnel atmosphere shell, an inner core, a drifting starfield
//   and two orbital rings give real parallax instead of one flat sphere.
//
// Perf / accessibility (all carried over and extended from the old version):
// - prefers-reduced-motion renders a single static frame, no RAF loop, no
//   pulses. The scene is still visible, just still.
// - Pauses entirely when the tab is hidden.
// - Every geometry/material/texture is disposed on unmount.
// - Node/arc/star counts scale down on narrow viewports so mobile doesn't
//   pay desktop's geometry cost.
// - The canvas sits at z-index 0 beneath the hero copy (z-index 1), so
//   hovering the 3D never intercepts clicks on the CTA buttons.

const ROUTES = [
  { name: "Skilled Worker", color: 0x0057ff, weight: 0.5 },
  { name: "Health & Care", color: 0x00b86b, weight: 0.24 },
  { name: "Shortage Occupation", color: 0xff6b35, weight: 0.16 },
  { name: "New Entrant", color: 0x7c5cff, weight: 0.1 },
]

const CITIES = [
  "London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh",
  "Bristol", "Liverpool", "Sheffield", "Newcastle", "Cardiff", "Nottingham",
  "Southampton", "Belfast", "Leicester", "Coventry", "Reading", "Oxford",
  "Cambridge", "Brighton", "Aberdeen", "Norwich", "Plymouth", "Derby",
]

function pickRoute(i) {
  // Deterministic but scattered. Using a plain i/total ramp here banded the
  // globe into solid stripes (all blue at the top, all violet at the bottom)
  // because the fibonacci distribution walks pole-to-pole in index order -
  // which read as decoration rather than a mixed network. This LCG-style
  // hash keeps the same route *proportions* while scattering them evenly
  // over the sphere, and stays stable across re-renders.
  const t = ((i * 9301 + 49297) % 233280) / 233280
  let acc = 0
  for (const r of ROUTES) {
    acc += r.weight
    if (t < acc) return r
  }
  return ROUTES[ROUTES.length - 1]
}

export default function Hero3D({ nodeCount = 110 }) {
  const mountRef = useRef(null)
  const [hover, setHover] = useState(null) // { x, y, city, route, color }

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const w = mount.clientWidth
    const h = mount.clientHeight
    if (!w || !h) return

    const isNarrow = w < 700
    const N = isNarrow ? Math.round(nodeCount * 0.5) : nodeCount

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
    camera.position.z = 7.5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(w, h)
    renderer.domElement.style.display = "block"
    mount.appendChild(renderer.domElement)

    const root = new THREE.Group()
    scene.add(root)

    // Lighting - the nodes use a lit material so they read as spheres with
    // volume, not flat dots.
    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 1.1)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x88aaff, 0.7)
    rim.position.set(-4, -2, -3)
    scene.add(rim)

    // ---------------------------------------------------------------
    // Nodes: one InstancedMesh for all sponsors (one draw call, not N)
    // ---------------------------------------------------------------
    const RADIUS = 2.55
    const nodeGeo = new THREE.SphereGeometry(1, 10, 8)
    const nodeMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15 })
    const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, N)
    nodes.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const basePos = []
    const baseScale = []
    const meta = []
    const dummy = new THREE.Object3D()
    const golden = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = golden * i
      const p = new THREE.Vector3(Math.cos(theta) * r * RADIUS, y * RADIUS, Math.sin(theta) * r * RADIUS)
      basePos.push(p)

      const route = pickRoute(i)
      const s = 0.058 + (i % 5) * 0.009
      baseScale.push(s)
      meta.push({ route: route.name, color: route.color, city: CITIES[i % CITIES.length] })

      dummy.position.copy(p)
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      nodes.setMatrixAt(i, dummy.matrix)
      nodes.setColorAt(i, new THREE.Color(route.color))
    }
    nodes.instanceMatrix.needsUpdate = true
    if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true
    root.add(nodes)

    // ---------------------------------------------------------------
    // Arcs: curved connections between nearby nodes, coloured by route
    // ---------------------------------------------------------------
    const arcPositions = []
    const arcColors = []
    const travelCurves = []
    const MAX_D = isNarrow ? 1.25 : 1.18
    const MAX_ARCS = isNarrow ? 90 : 260
    let arcCount = 0

    outer:
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (arcCount >= MAX_ARCS) break outer
        const a = basePos[i], b = basePos[j]
        if (a.distanceTo(b) > MAX_D) continue

        // Bow the connection outward from the sphere surface so it arcs over
        // the globe instead of cutting through it.
        const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(RADIUS * 1.16)
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
        const pts = curve.getPoints(14)

        const ca = new THREE.Color(meta[i].color)
        const cb = new THREE.Color(meta[j].color)
        for (let k = 0; k < pts.length - 1; k++) {
          arcPositions.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z)
          const t0 = k / (pts.length - 1)
          const t1 = (k + 1) / (pts.length - 1)
          const c0 = ca.clone().lerp(cb, t0)
          const c1 = ca.clone().lerp(cb, t1)
          arcColors.push(c0.r, c0.g, c0.b, c1.r, c1.g, c1.b)
        }
        if (travelCurves.length < (isNarrow ? 10 : 26)) travelCurves.push(curve)
        arcCount++
      }
    }

    const arcGeo = new THREE.BufferGeometry()
    arcGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arcPositions), 3))
    arcGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(arcColors), 3))
    const arcMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
    const arcs = new THREE.LineSegments(arcGeo, arcMat)
    root.add(arcs)

    // ---------------------------------------------------------------
    // Travelling pulses - "verification checks flowing across the network"
    // ---------------------------------------------------------------
    const PULSES = travelCurves.length
    const pulseGeo = new THREE.BufferGeometry()
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(PULSES * 3), 3))
    const pulseColArr = new Float32Array(PULSES * 3)
    for (let i = 0; i < PULSES; i++) {
      const c = new THREE.Color(0xffffff)
      pulseColArr[i * 3] = c.r; pulseColArr[i * 3 + 1] = c.g; pulseColArr[i * 3 + 2] = c.b
    }
    pulseGeo.setAttribute("color", new THREE.BufferAttribute(pulseColArr, 3))
    const pulseMat = new THREE.PointsMaterial({ size: 0.11, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    const pulses = new THREE.Points(pulseGeo, pulseMat)
    root.add(pulses)
    const pulseOffsets = new Array(PULSES).fill(0).map(() => Math.random())
    const pulseSpeeds = new Array(PULSES).fill(0).map(() => 0.12 + Math.random() * 0.22)

    // ---------------------------------------------------------------
    // Atmosphere: fresnel shell so the globe has a lit rim / halo
    // ---------------------------------------------------------------
    const atmoGeo = new THREE.SphereGeometry(RADIUS * 1.22, 40, 28)
    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
          // subtle blue -> cyan shift so the halo breathes
          vec3 col = mix(vec3(0.0, 0.34, 1.0), vec3(0.16, 0.72, 0.92), 0.5 + 0.5 * sin(uTime * 0.5));
          gl_FragColor = vec4(col, f * 0.42);
        }`,
    })
    root.add(new THREE.Mesh(atmoGeo, atmoMat))

    // Inner core - gives the sphere a sense of solidity behind the nodes
    const coreGeo = new THREE.SphereGeometry(RADIUS * 0.93, 32, 24)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x0a1c4a, transparent: true, opacity: 0.07 })
    root.add(new THREE.Mesh(coreGeo, coreMat))

    // Wireframe reference shell
    const wireGeo = new THREE.SphereGeometry(RADIUS * 1.005, 26, 18)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0057ff, wireframe: true, transparent: true, opacity: 0.055 })
    root.add(new THREE.Mesh(wireGeo, wireMat))

    // ---------------------------------------------------------------
    // Orbital rings - tilted, counter-rotating, for depth cues
    // ---------------------------------------------------------------
    const rings = []
    const ringSpecs = [
      { r: RADIUS * 1.45, tilt: 0.42, color: 0x0057ff, op: 0.20 },
      { r: RADIUS * 1.72, tilt: -0.62, color: 0x00b86b, op: 0.14 },
    ]
    for (const spec of ringSpecs) {
      const g = new THREE.TorusGeometry(spec.r, 0.006, 8, 128)
      const m = new THREE.MeshBasicMaterial({ color: spec.color, transparent: true, opacity: spec.op })
      const mesh = new THREE.Mesh(g, m)
      mesh.rotation.x = Math.PI / 2 + spec.tilt
      root.add(mesh)
      rings.push({ mesh, geo: g, mat: m })
    }

    // ---------------------------------------------------------------
    // Starfield - slow drifting particles behind everything
    // ---------------------------------------------------------------
    const STARS = isNarrow ? 130 : 320
    const starPos = new Float32Array(STARS * 3)
    for (let i = 0; i < STARS; i++) {
      const rr = 7 + Math.random() * 9
      const th = Math.random() * Math.PI * 2
      const ph = Math.acos(2 * Math.random() - 1)
      starPos[i * 3] = rr * Math.sin(ph) * Math.cos(th)
      starPos[i * 3 + 1] = rr * Math.sin(ph) * Math.sin(th)
      starPos[i * 3 + 2] = rr * Math.cos(ph)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3))
    const starMat = new THREE.PointsMaterial({ color: 0x7aa2ff, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    // ---------------------------------------------------------------
    // Interaction
    // ---------------------------------------------------------------
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(-10, -10)
    let mouseX = 0, mouseY = 0
    let hoveredId = -1
    let insideRect = false

    const onMove = (e) => {
      const rect = mount.getBoundingClientRect()
      const rx = (e.clientX - rect.left) / rect.width
      const ry = (e.clientY - rect.top) / rect.height
      mouseX = (rx - 0.5) * 2
      mouseY = (ry - 0.5) * 2
      insideRect = rx >= 0 && rx <= 1 && ry >= 0 && ry <= 1
      ndc.x = mouseX
      ndc.y = -mouseY
    }
    window.addEventListener("mousemove", onMove, { passive: true })

    // Scroll parallax - the globe eases back and tilts as the hero leaves view
    let scrollN = 0
    const onScroll = () => {
      scrollN = Math.min(1, window.scrollY / Math.max(1, window.innerHeight))
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    const clock = new THREE.Clock()
    let raf = null
    let paused = document.hidden
    const tmpColor = new THREE.Color()
    const tmpObj = new THREE.Object3D()

    function updateHoverPick() {
      if (isNarrow || !insideRect) {
        if (hoveredId !== -1) { resetHover(); setHover(null) }
        return
      }
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(nodes)
      const id = hits.length ? hits[0].instanceId : -1
      if (id === hoveredId) return

      resetHover()
      hoveredId = id

      if (id !== -1 && id < meta.length) {
        const m = meta[id]
        // Project the node's world position to screen space for the label
        const wp = basePos[id].clone().applyMatrix4(root.matrixWorld).project(camera)
        const rect = mount.getBoundingClientRect()
        setHover({
          x: (wp.x * 0.5 + 0.5) * rect.width,
          y: (-wp.y * 0.5 + 0.5) * rect.height,
          city: m.city,
          route: m.route,
          color: "#" + m.color.toString(16).padStart(6, "0"),
        })
        // swell + brighten the hovered node
        tmpObj.position.copy(basePos[id])
        tmpObj.scale.setScalar(baseScale[id] * 2.5)
        tmpObj.updateMatrix()
        nodes.setMatrixAt(id, tmpObj.matrix)
        nodes.setColorAt(id, tmpColor.set(0xffffff))
        nodes.instanceMatrix.needsUpdate = true
        if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true
      } else {
        setHover(null)
      }
    }

    function resetHover() {
      if (hoveredId === -1) return
      tmpObj.position.copy(basePos[hoveredId])
      tmpObj.scale.setScalar(baseScale[hoveredId])
      tmpObj.updateMatrix()
      nodes.setMatrixAt(hoveredId, tmpObj.matrix)
      nodes.setColorAt(hoveredId, tmpColor.set(meta[hoveredId].color))
      nodes.instanceMatrix.needsUpdate = true
      if (nodes.instanceColor) nodes.instanceColor.needsUpdate = true
      hoveredId = -1
    }

    const pulsePos = pulseGeo.attributes.position.array
    const pulseCol = pulseGeo.attributes.color.array
    const tmpV = new THREE.Vector3()

    function render(animate) {
      const t = clock.getElapsedTime()

      if (animate) {
        root.rotation.y = t * 0.11 + mouseX * 0.35
        root.rotation.x = mouseY * 0.18 + scrollN * 0.4
        stars.rotation.y = -t * 0.015
        atmoMat.uniforms.uTime.value = t
        rings[0].mesh.rotation.z = t * 0.16
        rings[1].mesh.rotation.z = -t * 0.11
        camera.position.z = 7.5 + scrollN * 1.8

        // advance pulses along their curves
        for (let i = 0; i < PULSES; i++) {
          const u = (pulseOffsets[i] + t * pulseSpeeds[i]) % 1
          travelCurves[i].getPoint(u, tmpV)
          pulsePos[i * 3] = tmpV.x
          pulsePos[i * 3 + 1] = tmpV.y
          pulsePos[i * 3 + 2] = tmpV.z
          // fade in/out at the ends so pulses don't pop
          const fade = Math.sin(u * Math.PI)
          pulseCol[i * 3] = fade
          pulseCol[i * 3 + 1] = fade
          pulseCol[i * 3 + 2] = fade
        }
        pulseGeo.attributes.position.needsUpdate = true
        pulseGeo.attributes.color.needsUpdate = true

        updateHoverPick()
      } else {
        root.rotation.y = 0.4
        root.rotation.x = 0.1
      }

      renderer.render(scene, camera)
    }

    function loop() {
      if (paused) return
      render(true)
      raf = requestAnimationFrame(loop)
    }

    if (reduceMotion) render(false)
    else loop()

    const onVisibility = () => {
      paused = document.hidden
      if (!paused && !reduceMotion) { clock.getDelta(); loop() }
    }
    document.addEventListener("visibilitychange", onVisibility)

    const onResize = () => {
      const nw = mount.clientWidth, nh = mount.clientHeight
      if (!nw || !nh) return
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
      renderer.setSize(nw, nh)
      if (reduceMotion) render(false)
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("scroll", onScroll)
      document.removeEventListener("visibilitychange", onVisibility)
      nodeGeo.dispose(); nodeMat.dispose(); nodes.dispose()
      arcGeo.dispose(); arcMat.dispose()
      pulseGeo.dispose(); pulseMat.dispose()
      atmoGeo.dispose(); atmoMat.dispose()
      coreGeo.dispose(); coreMat.dispose()
      wireGeo.dispose(); wireMat.dispose()
      starGeo.dispose(); starMat.dispose()
      rings.forEach(r => { r.geo.dispose(); r.mat.dispose() })
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [nodeCount])

  return (
    <div ref={mountRef} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.95 }}>
      {hover && (
        <div
          style={{
            position: "absolute",
            left: hover.x,
            top: hover.y,
            transform: "translate(-50%, calc(-100% - 14px))",
            background: "rgba(10,15,30,0.94)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 10,
            padding: "8px 12px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 12px 32px rgba(0,0,0,0.28)",
            zIndex: 3,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: hover.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff", letterSpacing: -0.2 }}>{hover.route}</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.62)", marginTop: 2, paddingLeft: 14 }}>
            Licensed sponsors in {hover.city}
          </div>
        </div>
      )}
    </div>
  )
}
