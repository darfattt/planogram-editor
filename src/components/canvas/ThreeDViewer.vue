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
  camera.position.set(0, 300, 600) // Position camera to look at center of scene
  camera.lookAt(0, 150, 0) // Look at center of scene

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
  controls.target.set(0, 150, 0) // Set orbit target to center of scene
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
  ground.position.y = 0 // Position at y=0 to be the reference point
  ground.receiveShadow = true
  ground.name = 'ground'
  scene.add(ground)

  // Add back wall
  const wallGeometry = new THREE.PlaneGeometry(1000, 500)
  const wallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xE0E0E0, // Light gray color for the wall
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
  SHELF: -390,       // Shelves closer to sections (partially embedded)
  PRODUCT: -370      // Products in front of shelves
}

// Coordinate transformation from 2D to 3D
// In 2D, (0,0) is top-left, in 3D we want (0,0) to be center of the scene
const transformCoordinates = (x: number, y: number, width: number, height: number, zOffset: number) => {
  // Get the viewport dimensions from the stage config in EditorCanvas
  // These should match the canvas dimensions used in the 2D view
  const viewportWidth = window.innerWidth - 250; // Same as stageConfig.width in EditorCanvas
  const viewportHeight = window.innerHeight - 60; // Same as stageConfig.height in EditorCanvas
  
  // Calculate the center of the viewport
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;
  
  // Calculate object center in 2D coordinates
  const objectCenterX = x + width / 2;
  const objectCenterY = y + height / 2;
  
  // Transform to 3D coordinates (centered around origin)
  const centerX = objectCenterX - viewportCenterX;
  
  // Invert Y axis (2D Y increases downward, 3D Y increases upward)
  // Add a Y offset to ensure objects are above the floor
  const yOffset = 300; // Further increased offset to ensure all objects are above the floor
  const centerY = viewportCenterY - objectCenterY + yOffset;
  
  const centerZ = zOffset;
  
  return { x: centerX, y: centerY, z: centerZ };
}

// Create section mesh
const createSection = (section: Section) => {
  const { x, y, width, height } = section
  const depth = 2 // Standard depth for sections
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0x303030,
    transparent: true,
    opacity: 0.85,
    shininess: 20
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // Transform coordinates from 2D to 3D
  const position = transformCoordinates(x, y, width, height, Z_OFFSET.SECTION);
  mesh.position.set(position.x, position.y, position.z);
  
  // Add name for debugging
  mesh.name = `section-${section.id}`;
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Create shelf mesh
const createShelf = (shelf: Shelf) => {
  const { x, y, width, height, depth = 50, sectionId, relativeX, relativeY } = shelf
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: 0xff7b7b,
    transparent: true,
    opacity: 0.9,
    shininess: 40
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // If shelf is in a section, use its relative position
  let shelfX = x;
  let shelfY = y;
  
  if (sectionId) {
    // Find the parent section
    const parentSection = planogramStore.sections.find(s => s.id === sectionId);
    if (parentSection && relativeX !== undefined && relativeY !== undefined) {
      // Use the section's position plus the shelf's relative position
      shelfX = parentSection.x + relativeX;
      shelfY = parentSection.y + relativeY;
    }
  }
  
  // Transform coordinates from 2D to 3D
  const position = transformCoordinates(shelfX, shelfY, width, height, Z_OFFSET.SHELF);
  
  // If shelf is in a section, adjust Z position to embed it into the section
  if (sectionId) {
    // Adjust Z position to embed shelf into section by the section depth
    position.z += 10; // Move shelf into the section by section depth (10)
  }
  
  mesh.position.set(position.x, position.y, position.z);
  
  // Add name for debugging
  mesh.name = `shelf-${shelf.id}`;
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

// Create product mesh
const createProduct = (product: Product) => {
  const { x, y, width, height, depth, shelfId, sectionId, relativeX, relativeY } = product
  
  const geometry = new THREE.BoxGeometry(width, height, depth)
  const material = new THREE.MeshPhongMaterial({ 
    color: product.color || '#2255ff',
    transparent: true,
    opacity: 1,
    shininess: 60
  })
  const mesh = new THREE.Mesh(geometry, material)
  
  // Calculate the actual position based on relationships
  let productX = x;
  let productY = y;
  
  if (shelfId) {
    // Product is on a shelf
    const parentShelf = planogramStore.shelves.find(s => s.id === shelfId);
    if (parentShelf && relativeX !== undefined && relativeY !== undefined) {
      // If shelf is in a section, use section position + shelf relative + product relative
      if (parentShelf.sectionId) {
        const parentSection = planogramStore.sections.find(s => s.id === parentShelf.sectionId);
        if (parentSection && parentShelf.relativeX !== undefined && parentShelf.relativeY !== undefined) {
          productX = parentSection.x + parentShelf.relativeX + relativeX;
          productY = parentSection.y + parentShelf.relativeY + relativeY;
        }
      } else {
        // Shelf is standalone
        productX = parentShelf.x + relativeX;
        productY = parentShelf.y + relativeY;
      }
    }
  } else if (sectionId) {
    // Product is directly in a section
    const parentSection = planogramStore.sections.find(s => s.id === sectionId);
    if (parentSection && relativeX !== undefined && relativeY !== undefined) {
      productX = parentSection.x + relativeX;
      productY = parentSection.y + relativeY;
    }
  }
  
  // Transform coordinates from 2D to 3D
  const position = transformCoordinates(productX, productY, width, height, Z_OFFSET.PRODUCT);
  
  // If product is on a shelf, adjust Z position to place it slightly in front of the shelf
  if (shelfId) {
    // Adjust Z position to place product slightly in front of shelf
    position.z -= 5; // Move product slightly in front of shelf
  } else if (sectionId) {
    // If product is directly in a section, embed it by the section depth
    position.z += 10; // Move product into the section by section depth (10)
  }
  
  mesh.position.set(position.x, position.y, position.z);
  
  // Add name for debugging
  mesh.name = `product-${product.id}`;
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
    scene.add(createSection(section))
  })

  // Then add all shelves (middle layer)
  planogramStore.shelves.forEach(shelf => {
    scene.add(createShelf(shelf))
  })

  // Finally add all products (front layer)
  planogramStore.products.forEach(product => {
    scene.add(createProduct(product))
  })
  
  // Log scene structure for debugging
  console.log('3D Scene updated with:', {
    sections: planogramStore.sections.length,
    shelves: planogramStore.shelves.length,
    products: planogramStore.products.length,
    viewport: {
      width: window.innerWidth - 250,
      height: window.innerHeight - 60
    }
  })
}

// Watch for changes in planogram data
watch(() => planogramStore.sections, updateScene, { deep: true })
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
  
  // Update scene after resize to ensure coordinates are recalculated
  updateScene()
}

// Lifecycle hooks
onMounted(() => {
  initThreeJs()
  updateScene()
  window.addEventListener('resize', handleResize)
  
  // Log initial setup for debugging
  console.log('3D Viewer initialized with viewport:', {
    width: window.innerWidth - 250,
    height: window.innerHeight - 60
  })
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
