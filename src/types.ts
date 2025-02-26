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
  type: 'section' | 'shelf' | 'product'
  properties: Size
}

export interface Section {
  id: string
  x: number
  y: number
  width: number
  height: number
  name?: string
  category: string
  subCategory: string
  // Add other section properties as needed
}

export interface Shelf {
  id: string
  x: number
  y: number
  width: number
  height: number
  depth: number
  sectionId?: string | null
  relativeX?: number | 0
  relativeY?: number | 0
  category: string
  subCategory: string
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
  sectionId?: string | null
  shelfId?: string | null
  relativeX?: number
  relativeY?: number
  category: string
  type: string
  color?: string
  image?: string | null
  // Add other product properties as needed
  identification?: ProductIdentification | null,
  physical?: ProductPhysical | null
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

export type PlanogramItem = Section | Shelf | Product
