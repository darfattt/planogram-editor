export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
  depth: number
}

export interface DraggedItem {
  type: 'segment' | 'shelf' | 'product'
  properties: Size
  position?: Position
  code?: string
}

export interface Segment {
  id: string
  x: number
  y: number
  width: number
  height: number
  name?: string
  category: string
  subCategory: string
  // Add other segment properties as needed
}

export interface Shelf {
  id: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  segmentId?: string | null
  relativeX?: number | 0
  relativeY?: number | 0
  category: string
  subCategory: string
  strictPlacement?: boolean
  // Add other shelf properties as needed
}

export interface Product {
  id: string
  code: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  segmentId?: string | null
  shelfId?: string | null
  fixtureId?: string | null
  relativeX?: number
  relativeY?: number
  type?: string
  color?: string
  category?: string
  image?: string
  groupId?: string

  // Enhanced product properties
  name?: string
  description?: string
  brand?: string
  manufacturer?: string
  sku?: string
  barcode?: string

  // Retail properties
  pricing?: {
    cost?: number
    retail?: number
    margin?: number
    currency?: string
  }

  // Inventory
  inventory?: {
    stock?: number
    minStock?: number
    maxStock?: number
    reorderPoint?: number
  }

  // Physical properties (enhanced)
  physical?: {
    weight?: number
    dimensions?: {
      width: number
      height: number
      depth: number
    }
    packaging?: {
      type: string
      material?: string
      recyclable?: boolean
    }
  }

  // Visual properties
  visual?: {
    primaryColor?: string
    secondaryColor?: string
    texture?: string
    opacity?: number
    borderRadius?: number
  }

  // Metadata
  metadata?: {
    createdAt?: Date
    updatedAt?: Date
    tags?: string[]
    notes?: string
  }
}

export interface ProductIdentification {
  manufacturer: string;
  brand: string;
  category: string;
  subcategory: string;
  segment: string;
  subsegment: string;
  size: number;
  uom: string; // Unit of Measure
  packageType: string;
  colour: string;
  fillPattern: string;
  shapeID: string;
  key: string;
  locationID: string;
  preferredFixture: string;
  rank: number;
}

// Enhanced product categories
export interface ProductCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  color?: string
  icon?: string
  properties?: Record<string, any>
}

// Product template for creating new products
export interface ProductTemplate {
  id: string
  name: string
  category: string
  defaultProperties: Partial<Product>
  thumbnail?: string
  description?: string
}

// Component definition for UI elements
export interface ComponentDefinition {
  id: string
  type: 'product' | 'fixture' | 'segment' | 'custom'
  name: string
  icon?: string
  defaultProps: Record<string, any>
  constraints?: {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    snapToGrid?: boolean
    allowRotation?: boolean
  }
}

export interface ProductPhysical {
  unit: {
    dimensions: {
      height: number;
      width: number;
      depth: number;
    };
    maxCrush: {
      height: number;
      width: number;
      depth: number;
    };
    nesting: {
      type: 'Height' | 'Width' | 'Depth';
      value: number;
    };
    contain: {
      type: 'Height' | 'Width' | 'Depth';
      value: number;
    };
    isContainer: boolean;
  };
  unitOverrides: {
    basketFactor: number;
    overhang: number;
    horizGap: number;
    vertGap: number;
  };
  case: {
    dimensions: {
      height: number;
      width: number;
      depth: number;
    };
    units: {
      high: number;
      wide: number;
      deep: number;
    };
    unitsPerCase: number;
  };
  tray: {
    dimensions: {
      height: number;
      width: number;
      depth: number;
    };
    units: {
      high: number;
      wide: number;
      deep: number;
    };
    unitsPerTray: number;
  };
  display: {
    dimensions: {
      height: number;
      width: number;
      depth: number;
    };
  };
}

export interface Pegboard {
  id: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  color?: string
  segmentId?: string | null
  relativeX?: number
  relativeY?: number
  strictPlacement: boolean
  category: string
  subCategory: string
}

export type PlanogramItem = Segment | Shelf | Product
