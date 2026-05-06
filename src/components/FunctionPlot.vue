<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  createFunctionModel,
  sampleCurveAlongDirection,
  sampleSurface,
} from '../utils/mathModel'

const props = defineProps({
  analysis: { type: Object, required: true },
  funcExpression: { type: String, default: 'x^2 + y^2' },
  point: { type: Object, default: () => ({ x: 1, y: 1, z: 2 }) },
  vector: { type: Object, default: () => ({ x: 1, y: 0 }) },
  viewSettings: { type: Object, required: true },
  viewOptions: { type: Object, required: true },
  viewCommand: { type: Object, default: () => ({ type: 'iso', nonce: 0 }) },
  theme: { type: String, default: 'light' },
})

const canvasContainer = ref(null)
const surfaceHint = ref('')

let scene
let camera
let renderer
let controls
let animationId
let surfaceMesh
let wireframeMesh
let gridHelper
let referencePlanes = []
let axesGroup
let pointMarker
let directionArrow
let gradientArrow
let tangentCurve
let baseDirectionLine
let tangentPlane
let dynamicLabels = []

const themePalette = {
  light: {
    bg: 0xf6f9ff,
    fog: 0xf6f9ff,
    grid: 0xb6c4d8,
    gridCenter: 0x64748b,
    labelBg: 'rgba(255,255,255,0.9)',
    labelStroke: 'rgba(15,23,42,0.14)',
    labelText: '#172033',
    point: 0xf97316,
    direction: 0x00a884,
    directionLine: 0x087f71,
    gradient: 0xd946ef,
    tangent: 0xf59e0b,
    wire: 0x334155,
  },
  dark: {
    bg: 0x101623,
    fog: 0x101623,
    grid: 0x475569,
    gridCenter: 0x94a3b8,
    labelBg: 'rgba(15,23,42,0.88)',
    labelStroke: 'rgba(148,163,184,0.24)',
    labelText: '#e2e8f0',
    point: 0xfb923c,
    direction: 0x34d399,
    directionLine: 0x2dd4bf,
    gradient: 0xf0abfc,
    tangent: 0xfbbf24,
    wire: 0xcbd5e1,
  },
}

const getPalette = () => themePalette[props.theme] ?? themePalette.light
const mathToThree = ({ x, y, z = 0 }) => new THREE.Vector3(x, z, y)

const disposeObject = (object) => {
  if (!object) return

  object.traverse?.((child) => {
    child.geometry?.dispose?.()
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => {
        material.map?.dispose?.()
        material.dispose?.()
      })
    } else {
      child.material?.map?.dispose?.()
      child.material?.dispose?.()
    }
  })

  object.geometry?.dispose?.()

  if (Array.isArray(object.material)) {
    object.material.forEach((material) => {
      material.map?.dispose?.()
      material.dispose?.()
    })
  } else {
    object.material?.map?.dispose?.()
    object.material?.dispose?.()
  }
}

const removeObject = (object) => {
  if (!scene || !object) return
  scene.remove(object)
  disposeObject(object)
}

const createTextSprite = (text, color) => {
  const palette = getPalette()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const pixelRatio = window.devicePixelRatio || 1
  canvas.width = 256 * pixelRatio
  canvas.height = 96 * pixelRatio
  context.scale(pixelRatio, pixelRatio)
  context.font = '700 34px "Segoe UI", "Microsoft YaHei", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = palette.labelBg
  context.strokeStyle = palette.labelStroke
  context.lineWidth = 4
  context.beginPath()
  if (context.roundRect) context.roundRect(20, 18, 216, 58, 18)
  else context.rect(20, 18, 216, 58)
  context.fill()
  context.stroke()
  context.fillStyle = color || palette.labelText
  context.fillText(text, 128, 48)

  const texture = new THREE.CanvasTexture(canvas)
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.15, 0.43, 1)

  return sprite
}

const addSceneLabel = (text, position, color) => {
  if (!props.viewOptions.showAxisLabels && ['x', 'y', 'z'].includes(text)) return

  const label = createTextSprite(text, color)
  label.position.copy(position)
  scene.add(label)
  dynamicLabels.push(label)
}

const clearDynamicObjects = () => {
  removeObject(pointMarker)
  removeObject(directionArrow)
  removeObject(gradientArrow)
  removeObject(tangentCurve)
  removeObject(baseDirectionLine)
  removeObject(tangentPlane)
  dynamicLabels.forEach(removeObject)
  dynamicLabels = []
  pointMarker = null
  directionArrow = null
  gradientArrow = null
  tangentCurve = null
  baseDirectionLine = null
  tangentPlane = null
}

const buildAxes = () => {
  removeObject(axesGroup)
  axesGroup = new THREE.Group()
  const axisLength = 6
  const axes = [
    {
      label: 'x',
      color: 0xef4444,
      direction: new THREE.Vector3(1, 0, 0),
      position: new THREE.Vector3(axisLength + 0.35, 0, 0),
      labelColor: props.theme === 'dark' ? '#fca5a5' : '#dc2626',
    },
    {
      label: 'z',
      color: 0x3b82f6,
      direction: new THREE.Vector3(0, 1, 0),
      position: new THREE.Vector3(0, axisLength + 0.35, 0),
      labelColor: props.theme === 'dark' ? '#93c5fd' : '#2563eb',
    },
    {
      label: 'y',
      color: 0x22c55e,
      direction: new THREE.Vector3(0, 0, 1),
      position: new THREE.Vector3(0, 0, axisLength + 0.35),
      labelColor: props.theme === 'dark' ? '#86efac' : '#16a34a',
    },
  ]

  axes.forEach((axis) => {
    axesGroup.add(
      new THREE.ArrowHelper(axis.direction, new THREE.Vector3(0, 0, 0), axisLength, axis.color, 0.28, 0.13),
    )
  })

  scene.add(axesGroup)

  if (props.viewOptions.showAxisLabels) {
    axes.forEach((axis) => addSceneLabel(axis.label, axis.position, axis.labelColor))
  }
}

const updateStaticScene = () => {
  if (!scene) return
  const palette = getPalette()
  scene.background = new THREE.Color(palette.bg)
  scene.fog = new THREE.Fog(palette.fog, 15, 30)

  removeObject(gridHelper)
  if (props.viewOptions.showGrid) {
    gridHelper = new THREE.GridHelper(12, 24, palette.gridCenter, palette.grid)
    gridHelper.position.y = -0.01
    scene.add(gridHelper)
  }

  referencePlanes.forEach(removeObject)
  referencePlanes = []
  const planeConfigs = [
    { rotation: [-Math.PI / 2, 0, 0], color: 0x60a5fa, opacity: props.theme === 'dark' ? 0.035 : 0.07 },
    { rotation: [0, Math.PI / 2, 0], color: 0x34d399, opacity: props.theme === 'dark' ? 0.025 : 0.05 },
  ]
  planeConfigs.forEach((config) => {
    const geometry = new THREE.PlaneGeometry(12, 12)
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      opacity: config.opacity,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    })
    const plane = new THREE.Mesh(geometry, material)
    plane.rotation.set(...config.rotation)
    scene.add(plane)
    referencePlanes.push(plane)
  })

  buildAxes()
}

const buildSurfaceMeshes = () => {
  const model = createFunctionModel(props.funcExpression)
  const sampled = sampleSurface(model, props.viewSettings)
  const geometry = new THREE.BufferGeometry()
  const palette = getPalette()

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(sampled.vertices, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(sampled.colors, 3))
  geometry.setIndex(sampled.indices)
  geometry.computeVertexNormals()

  const surfaceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: props.theme === 'dark' ? 0.18 : 0.08,
    roughness: 0.45,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: props.theme === 'dark' ? 0.78 : 0.74,
    vertexColors: true,
  })
  const surface = new THREE.Mesh(geometry, surfaceMaterial)

  const wireGeometry = geometry.clone()
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: palette.wire,
    wireframe: true,
    transparent: true,
    opacity: props.theme === 'dark' ? 0.16 : 0.11,
  })
  const wireframe = new THREE.Mesh(wireGeometry, wireMaterial)

  surfaceHint.value = model.ok
    ? `${sampled.stats.total - sampled.stats.skipped}/${sampled.stats.total} 个采样点有效`
    : model.error

  return { surface, wireframe }
}

const updateSurface = () => {
  if (!scene) return
  removeObject(surfaceMesh)
  removeObject(wireframeMesh)
  const meshes = buildSurfaceMeshes()
  surfaceMesh = meshes.surface
  wireframeMesh = meshes.wireframe
  scene.add(surfaceMesh)
  if (props.viewOptions.showWireframe) scene.add(wireframeMesh)
}

const createPointMarker = (position) => {
  const palette = getPalette()
  const group = new THREE.Group()
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 32, 32),
    new THREE.MeshStandardMaterial({
      color: palette.point,
      emissive: palette.point,
      emissiveIntensity: 0.25,
      roughness: 0.22,
    }),
  )
  sphere.position.copy(position)
  group.add(sphere)

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.017, 8, 56),
    new THREE.MeshBasicMaterial({ color: palette.point, transparent: true, opacity: 0.9 }),
  )
  ring.position.copy(position)
  ring.rotation.x = Math.PI / 2
  group.add(ring)

  return group
}

const createLine = (points, color) => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.96,
  })
  return new THREE.Line(geometry, material)
}

const createTangentPlane = (point, gradient) => {
  if (!props.viewOptions.showTangentPlane) return null
  if (!Number.isFinite(gradient.x) || !Number.isFinite(gradient.y)) return null

  const palette = getPalette()
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 2.1, 1, 1),
    new THREE.MeshBasicMaterial({
      color: palette.tangent,
      opacity: props.theme === 'dark' ? 0.22 : 0.18,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  )
  const normal = new THREE.Vector3(-gradient.x, 1, -gradient.y).normalize()
  mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal))
  mesh.position.copy(mathToThree(point))

  return mesh
}

const updateMarkers = () => {
  if (!scene) return

  clearDynamicObjects()
  buildAxes()

  const palette = getPalette()
  const { point, vector, gradient, model, ok } = props.analysis
  const graphPoint = mathToThree(point)

  if (Number.isFinite(point?.z)) {
    pointMarker = createPointMarker(graphPoint)
    scene.add(pointMarker)
    addSceneLabel('P₀', graphPoint.clone().add(new THREE.Vector3(0.32, 0.34, 0.18)), props.theme === 'dark' ? '#fed7aa' : '#c2410c')
  }

  if (!model?.ok || !Number.isFinite(point?.z)) return

  tangentPlane = createTangentPlane(point, gradient ?? { x: NaN, y: NaN })
  if (tangentPlane) scene.add(tangentPlane)

  if (vector?.valid) {
    const direction3 = new THREE.Vector3(
      vector.unit.x,
      gradient?.x * vector.unit.x + gradient?.y * vector.unit.y,
      vector.unit.y,
    ).normalize()

    directionArrow = new THREE.ArrowHelper(direction3, graphPoint, 1.7, palette.direction, 0.28, 0.13)
    scene.add(directionArrow)

    const basePoints = [
      mathToThree({ x: point.x - vector.unit.x * 2.2, y: point.y - vector.unit.y * 2.2, z: 0.02 }),
      mathToThree({ x: point.x + vector.unit.x * 2.2, y: point.y + vector.unit.y * 2.2, z: 0.02 }),
    ]
    baseDirectionLine = createLine(basePoints, palette.direction)
    scene.add(baseDirectionLine)

    if (props.viewOptions.showDirectionCurve) {
      const curvePoints = sampleCurveAlongDirection(model, point, vector.unit).map(mathToThree)
      if (curvePoints.length > 1) {
        tangentCurve = createLine(curvePoints, palette.directionLine)
        scene.add(tangentCurve)
      }
    }

    addSceneLabel('u', graphPoint.clone().add(direction3.clone().multiplyScalar(1.95)), props.theme === 'dark' ? '#a7f3d0' : '#047857')
  }

  const gradientLength = Math.hypot(gradient?.x ?? 0, gradient?.y ?? 0)
  if (props.viewOptions.showGradient && ok && gradientLength > 1e-8) {
    const gradient2 = { x: gradient.x / gradientLength, y: gradient.y / gradientLength }
    const gradient3 = new THREE.Vector3(
      gradient2.x,
      gradient.x * gradient2.x + gradient.y * gradient2.y,
      gradient2.y,
    ).normalize()

    gradientArrow = new THREE.ArrowHelper(gradient3, graphPoint, 1.45, palette.gradient, 0.25, 0.12)
    scene.add(gradientArrow)
    addSceneLabel('∇f', graphPoint.clone().add(gradient3.clone().multiplyScalar(1.7)), props.theme === 'dark' ? '#f5d0fe' : '#be185d')
  }
}

const applyViewCommand = (type = 'iso') => {
  if (!camera || !controls) return

  const distance = 12
  const views = {
    iso: new THREE.Vector3(8.2, 6.2, 9.2),
    top: new THREE.Vector3(0.01, distance, 0.01),
    front: new THREE.Vector3(0, 3.2, distance),
    side: new THREE.Vector3(distance, 3.2, 0),
  }
  const nextPosition = views[type] ?? views.iso
  camera.position.copy(nextPosition)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}

const initScene = () => {
  const container = canvasContainer.value
  if (!container) return

  const palette = getPalette()
  scene = new THREE.Scene()
  scene.background = new THREE.Color(palette.bg)
  scene.fog = new THREE.Fog(palette.fog, 15, 30)

  const width = container.clientWidth || 800
  const height = container.clientHeight || 600

  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 120)
  camera.position.set(8.2, 6.2, 9.2)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.maxDistance = 28
  controls.minDistance = 4

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa2c2, props.theme === 'dark' ? 1.4 : 2.2))

  const keyLight = new THREE.DirectionalLight(0xffffff, props.theme === 'dark' ? 1.7 : 2.2)
  keyLight.position.set(5, 10, 7)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0x8ec5ff, props.theme === 'dark' ? 0.55 : 0.9)
  fillLight.position.set(-5, 4, -4)
  scene.add(fillLight)

  updateStaticScene()
  updateSurface()
  updateMarkers()
  animate()
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
}

const onResize = () => {
  if (!canvasContainer.value || !renderer || !camera) return

  const width = canvasContainer.value.clientWidth || 800
  const height = canvasContainer.value.clientHeight || 600
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

watch(
  () => [props.funcExpression, props.viewSettings.range, props.viewSettings.segments, props.viewSettings.zLimit, props.theme],
  () => {
    updateStaticScene()
    updateSurface()
    updateMarkers()
  },
)

watch(
  () => props.viewOptions,
  () => {
    updateStaticScene()
    updateSurface()
    updateMarkers()
  },
  { deep: true },
)

watch(() => props.analysis, updateMarkers, { deep: true })
watch(() => props.viewCommand?.nonce, () => applyViewCommand(props.viewCommand?.type))

onMounted(() => {
  initScene()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (animationId) cancelAnimationFrame(animationId)

  removeObject(surfaceMesh)
  removeObject(wireframeMesh)
  removeObject(gridHelper)
  referencePlanes.forEach(removeObject)
  removeObject(axesGroup)
  clearDynamicObjects()
  renderer?.dispose()
})
</script>

<template>
  <div class="canvas-wrap">
    <div ref="canvasContainer" class="canvas-container" />

    <div class="plot-toolbar">
      <span class="status-dot" :class="{ warn: !analysis.model?.ok }" />
      <span>{{ surfaceHint }}</span>
    </div>

    <div class="plot-legend">
      <span><i class="orange" />选定点</span>
      <span><i class="green" />单位方向 u</span>
      <span v-if="viewOptions.showGradient"><i class="pink" />梯度 ∇f</span>
      <span v-if="viewOptions.showDirectionCurve"><i class="teal" />方向截线</span>
    </div>
  </div>
</template>
