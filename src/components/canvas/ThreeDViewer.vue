<template>
  <div ref="container" class="three-d-viewer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { usePlanogramStore } from '../../composables/usePlanogramStore'
import type { Shelf, Product, Section } from '../../types'

const container = ref<HTMLDivElement | null>(null)
const planogramStore = usePlanogramStore()

// Three.js variables
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls

// Initialize Three.js scene
const initThreeJs = () => {
  if (!container.value) return

  // Create scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // Create camera
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 2000)
  camera.position.set(400, 300, 600)
  camera.lookAt(150, 150, 0)

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)

  // Add lights
  const ambientLight = new THREE.AmbientLight(0x808080)
  scene.add(ambientLight)

  // Main light from front-right
  const mainLight = new THREE.DirectionalLight(0xffffff, 0.7)
  mainLight.position.set(300, 400, 300)
  mainLight.castShadow = true
  mainLight.shadow.camera.near = 100
  mainLight.shadow.camera.far = 2000
  mainLight.shadow.camera.left = -500
  mainLight.shadow.camera.right = 500
  mainLight.shadow.camera.top = 500
  mainLight.shadow.camera.bottom = -500
  mainLight.shadow.mapSize.width = 2048
  mainLight.shadow.mapSize.height = 2048
  mainLight.shadow.bias = -0.001
  scene.add(mainLight)

  // Fill light from front-left
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
  fillLight.position.set(-200, 300, 200)
  fillLight.castShadow = true
  fillLight.shadow.mapSize.width = 1024
  fillLight.shadow.mapSize.height = 1024
  scene.add(fillLight)

  // Rim light from back
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.2)
  rimLight.position.set(0, 200, -200)
  rimLight.castShadow = true
  scene.add(rimLight)

  // Add controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(150, 150, 0)
  controls.minDistance = 300
  controls.maxDistance = 1200
  controls.maxPolarAngle = Math.PI / 2

  // Add ground plane
  const groundGeometry = new THREE.PlaneGeometry(1000, 1000)
  const groundMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xb0b0b0,
    side: THREE.DoubleSide,
    shininess: 0
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1
  ground.receiveShadow = true
  ground.name = 'ground'
  scene.add(ground)

  // Add back wall
  const wallGeometry = new THREE.PlaneGeometry(1000, 500)
  const wallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00FF00,
    side: THREE.DoubleSide,
    shininess: 0
  })
  const wall = new THREE.Mesh(wallGeometry, wallMaterial)
  wall.position.set(0, 250, Z_OFFSET.WALL)
  wall.receiveShadow = true
  wall.name = 'wall'
  scene.add(wall)

  // Add grid helper
  const gridHelper = new THREE.GridHelper(1000, 20, 0x888888, 0x888888)
  gridHelper.position.y = 0
  gridHelper.name = 'gridHelper'
  scene.add(gridHelper)
  
  const axesHelper = new THREE.AxesHelper(500)
  axesHelper.position.set(-500, 0, -500)
  axesHelper.name = 'axesHelper'
  scene.add(axesHelper)

  // Start animation loop
  animate()
}

// Animation loop
const animate = () => {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// Constants for z-index layering
const Z_OFFSET = {
  WALL: -450,
  SECTION: -405,     // Sections at the back
  SHELF: -320,       // Shelves in front of sections
  PRODUCT: -320      // Products in front of shelves
}

// Create section mesh
const createSection = (section: Section) => {
  const { x, y, width, height } = section
  const depth = 80 // Standard depth for sections
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x303030,
    transparent: true,
    opacity: 0.85,
    shininess: 20
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // Center objects around origin
  //mesh.position.set(x - 100 + width/2, y + height/2, Z_OFFSET.SECTION)
  mesh.position.set(0, 250, Z_OFFSET.SECTION)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Create shelf mesh
const createShelf = (shelf: Shelf) => {
  const { relativeX, relativeY, width, height, depth = 30 } = shelf
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0xff7b7b,
    transparent: true,
    opacity: 0.9,
    shininess: 40
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // Center objects around origin
  mesh.position.set(relativeX? - 200 + width/2 : 0, relativeY? + height/2:0, Z_OFFSET.SHELF)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Create product mesh
const createProduct = (product: Product) => {
  const { x, y, width, height, depth = 25 } = product
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: product.color || '#2255ff',
    transparent: true,
    opacity: 1,
    shininess: 60
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // Center objects around origin
  mesh.position.set(x - 100 + width/2, y + height/2, Z_OFFSET.PRODUCT)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Update scene with current planogram data
const updateScene = () => {
  if (!scene) return

  // Clear existing meshes except helpers, ground and wall
  scene.children = scene.children.filter(child => 
    child.name === 'gridHelper' || 
    child.name === 'axesHelper' ||
    child.name === 'ground' ||
    child.name === 'wall' ||
    child instanceof THREE.Light
  )

  // First add all sections (back layer)
  planogramStore.sections.forEach(section => {
    console.log({section})
    scene.add(createSection(section))
  })

  // Then add all shelves (middle layer)
  planogramStore.shelves.forEach(shelf => {
    console.log({shelf})
    scene.add(createShelf(shelf))
  })

  // Finally add all products (front layer)
  planogramStore.products.forEach(product => {
      console.log({product})
    scene.add(createProduct(product))
  })
}

// Watch for changes in planogram data
watch(() => planogramStore.shelves, updateScene, { deep: true })
watch(() => planogramStore.products, updateScene, { deep: true })

// Handle window resize
const handleResize = () => {
  if (!container.value || !camera || !renderer) return
  
  const width = container.value.clientWidth
  const height = container.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// Lifecycle hooks
onMounted(() => {
  initThreeJs()
  updateScene()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (renderer) {
    renderer.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.three-d-viewer {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
