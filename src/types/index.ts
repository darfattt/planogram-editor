export interface Position {
  x: number;
  y: number;
}

export interface Section {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
  type?: string|'Section';
  category?: string;
  subCategory?: string;
}

export interface Shelf {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sectionId?: string;
  relativeX?: number;
  relativeY?: number;
  type?: string|'Shelf';
  category?: string;
  subCategory?: string;
}

export interface Product {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sectionId?: string;
  shelfId?: string;
  relativeX: number;
  relativeY: number;
  type?: string|'Product';
  color?: string;
  image?: string;
  category?: string;
}

export interface DraggedItem {
  type: 'section' | 'shelf' | 'product';
  properties: {
    width: number;
    height: number;
  };
  position?: {
    x: number;
    y: number;
  };
}
