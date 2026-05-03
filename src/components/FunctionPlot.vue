<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { evaluate } from 'mathjs'

const props = defineProps({
  funcExpression: { type: String, default: 'x^2 + y^2' },
  point: { type: Object, default: () => ({ x: 1, y: 1, z: 2 }) },
  vector: { type: Object, default: () => ({ x: 1, y: 0, z: 0 }) },
})

const canvasContainer = ref(null)

let scene, camera, renderer, controls
let surfaceMesh, pointMarker, vectorArrow, pointSphereOnSurface
let animationId

const parseFunction = (expr) => {
  return (x, y) => {
    try {
      const scope = { x, y }
      return evaluate(expr, scope)
    } catch {
      return NaN
    }
  }
}

const buildSurface = (funcExpr) => {
  const fn = parseFunction(funcExpr)
  const range = 5
  const segments = 80
  const step = (2 * range) / segments

  const vertices = []
  const indices = []
  const colors = []

  for (let i = 0; i <= segments; i++) {
    const x = -range + i * step
    for (let j = 0; j <= segments; j++) {
      const y = -range + j * step
      const z = fn(x, y)
      vertices.push(x, isNaN(z) ? 0 : z, y)
      colors.push(0.5, 0.5, 0.5)
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j
      const b = a + 1
      const c = a + (segments + 1)
      const d = c + 1
      indices.push(a, b, d)
      indices.push(a, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = new THREE.MeshPhongMaterial({
    side: THREE.DoubleSide,
    color: 0x5b9bd5,
    transparent: true,
    opacity: 0.5,
    shininess: 80,
    specular: 0x444444,
  })

  return new THREE.Mesh(geometry, material)
}

const createPointMarker = (x, y, z) => {
  const geometry = new THREE.SphereGeometry(0.15, 16, 16)
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
  return new THREE.Mesh(geometry, material)
}

const createVectorArrow = (origin, direction) => {
  const dir = new THREE.Vector3(direction.x, direction.z, direction.y).normalize()
  const length = 1.5
  const color = 0x00ff00
  return new THREE.ArrowHelper(dir, new THREE.Vector3(origin.x, origin.z, origin.y), length, color, 0.15, 0.1)
}

const initScene = () => {
  const container = canvasContainer.value
  if (!container) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)

  const width = container.clientWidth
  const height = container.clientHeight

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
  camera.position.set(8, 6, 10)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08

  // 光照
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2)
  directionalLight.position.set(5, 10, 5)
  scene.add(directionalLight)
  // 网格地面
  const gridHelper = new THREE.GridHelper(10, 20, 0xcccccc, 0xe0e0e0)
  scene.add(gridHelper)

  // xOz 平面（数学 y=0）和 yOz 平面（数学 x=0）
  const createPlane = (color, opacity) => {
    const geom = new THREE.PlaneGeometry(10, 10)
    const mat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity,
      depthWrite: false,
    })
    return new THREE.Mesh(geom, mat)
  }
  const xozPlane = createPlane(0x5b9bd5, 0.06)
  scene.add(xozPlane)

  const yozPlane = createPlane(0x52c41a, 0.06)
  yozPlane.rotation.y = Math.PI / 2
  scene.add(yozPlane)

  // 坐标轴
  createAxes()

  updateSurface()
  updatePointAndVector()

  animate()
}

const createAxes = () => {
  const axisLength = 6
  const arrowColor = 0xffffff

  const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLength, 0xff4444, 0.15, 0.08)
  const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLength, 0x44ff44, 0.15, 0.08)
  const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLength, 0x4444ff, 0.15, 0.08)

  scene.add(xAxis)
  scene.add(yAxis)
  scene.add(zAxis)
}

const updateSurface = () => {
  if (!scene) return
  if (surfaceMesh) {
    scene.remove(surfaceMesh)
    surfaceMesh.geometry.dispose()
    surfaceMesh.material.dispose()
  }
  surfaceMesh = buildSurface(props.funcExpression)
  scene.add(surfaceMesh)
}

const updatePointAndVector = () => {
  if (!scene) return

  if (pointMarker) {
    scene.remove(pointMarker)
    pointMarker.geometry.dispose()
    pointMarker.material.dispose()
  }
  if (vectorArrow) {
    scene.remove(vectorArrow)
  }
  if (pointSphereOnSurface) {
    scene.remove(pointSphereOnSurface)
    pointSphereOnSurface.geometry.dispose()
    pointSphereOnSurface.material.dispose()
  }

  const { x, y, z } = props.point
  const { x: vx, y: vy, z: vz } = props.vector
  const vLen = Math.sqrt(vx * vx + vy * vy + vz * vz)

  // 标记点（用户输入的空间点）
  pointMarker = createPointMarker(x, z, y)
  scene.add(pointMarker)

  // 向量（从点出发）
  if (vLen > 1e-8) {
    vectorArrow = createVectorArrow(
      { x, y, z },
      { x: vx / vLen, y: vy / vLen, z: vz / vLen }
    )
    scene.add(vectorArrow)
  }

  // 函数表面上的对应点
  const fn = parseFunction(props.funcExpression)
  const fz = fn(x, y)
  if (!isNaN(fz) && isFinite(fz)) {
    const geo2 = new THREE.SphereGeometry(0.12, 16, 16)
    const mat2 = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    pointSphereOnSurface = new THREE.Mesh(geo2, mat2)
    pointSphereOnSurface.position.set(x, fz, y)
    scene.add(pointSphereOnSurface)
  }
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

const onResize = () => {
  if (!canvasContainer.value || !renderer || !camera) return
  const w = canvasContainer.value.clientWidth
  const h = canvasContainer.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

watch(() => props.funcExpression, () => { updateSurface(); updatePointAndVector() })
watch(() => props.point, () => updatePointAndVector(), { deep: true })
watch(() => props.vector, () => updatePointAndVector(), { deep: true })

onMounted(() => {
  initScene()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (animationId) cancelAnimationFrame(animationId)
  if (renderer) renderer.dispose()
  if (surfaceMesh) { surfaceMesh.geometry.dispose(); surfaceMesh.material.dispose() }
  if (pointMarker) { pointMarker.geometry.dispose(); pointMarker.material.dispose() }
  if (pointSphereOnSurface) { pointSphereOnSurface.geometry.dispose(); pointSphereOnSurface.material.dispose() }
})
</script>

<template>
  <div ref="canvasContainer" class="canvas-container"></div>
</template>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>