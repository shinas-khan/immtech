import { useEffect, useRef } from "react"
import * as THREE from "three"

// Animated 3D "sponsor network" globe for the hero section.
// Renders a rotating point-cloud sphere with connecting lines between
// nearby points - visually represents "125,284 verified sponsors" as a
// living network rather than a static number.
//
// Perf/accessibility notes:
// - Respects prefers-reduced-motion (renders one static frame, no RAF loop)
// - Pauses rendering when the tab is hidden (visibilitychange)
// - Disposes all GPU resources on unmount to avoid leaking WebGL contexts
// - Point count is capped and scaled down on narrow/mobile viewports
export default function Hero3D({ nodeCount = 90 }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isNarrow = mount.clientWidth < 700
    const effectiveNodes = isNarrow ? Math.round(nodeCount * 0.55) : nodeCount

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 100)
    camera.position.z = 6.4

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // --- Sponsor nodes, distributed evenly on a sphere (fibonacci sphere) ---
    const radius = 2.6
    const positions = []
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    for (let i = 0; i < effectiveNodes; i++) {
      const y = 1 - (i / (effectiveNodes - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = goldenAngle * i
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      positions.push(x * radius, y * radius, z * radius)
    }
    const posArray = new Float32Array(positions)

    const pointsGeo = new THREE.BufferGeometry()
    pointsGeo.setAttribute("position", new THREE.BufferAttribute(posArray, 3))
    const pointsMat = new THREE.PointsMaterial({
      color: 0xf5c451,
      size: 0.055,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    })
    const points = new THREE.Points(pointsGeo, pointsMat)
    group.add(points)

    // --- Connective lines between nearby nodes (the "network" feel) ---
    const lineVerts = []
    const maxDist = 1.15
    for (let i = 0; i < effectiveNodes; i++) {
      for (let j = i + 1; j < effectiveNodes; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < maxDist) {
          lineVerts.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          )
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(lineVerts), 3))
    const lineMat = new THREE.LineBasicMaterial({ color: 0x3a6df0, transparent: true, opacity: 0.18 })
    const lines = new THREE.LineSegments(lineGeo, lineMat)
    group.add(lines)

    // Thin outer wire sphere for a "globe" reference frame
    const wireGeo = new THREE.SphereGeometry(radius * 1.02, 24, 16)
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x0057ff, wireframe: true, transparent: true, opacity: 0.04 })
    group.add(new THREE.Mesh(wireGeo, wireMat))

    let raf = null
    let paused = document.hidden
    const clock = new THREE.Clock()
    let mouseX = 0, mouseY = 0
    const onMove = (e) => {
      const rect = mount.getBoundingClientRect()
      mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2
    }
    // container has pointer-events:none (it's a decorative background layer),
    // so track mouse position on window and compute relative coords ourselves
    window.addEventListener("mousemove", onMove)

    function render() {
      const t = clock.getElapsedTime()
      group.rotation.y = t * 0.12 + mouseX * 0.3
      group.rotation.x = mouseY * 0.15
      renderer.render(scene, camera)
    }

    function loop() {
      if (paused) return
      render()
      raf = requestAnimationFrame(loop)
    }

    if (reduceMotion) {
      render() // single static frame, no animation loop
    } else {
      loop()
    }

    const onVisibility = () => {
      paused = document.hidden
      if (!paused && !reduceMotion) loop()
    }
    document.addEventListener("visibilitychange", onVisibility)

    const onResize = () => {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      if (reduceMotion) render()
    }
    window.addEventListener("resize", onResize)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("mousemove", onMove)
      pointsGeo.dispose()
      pointsMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      wireGeo.dispose()
      wireMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [nodeCount])

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.85 }}
    />
  )
}
