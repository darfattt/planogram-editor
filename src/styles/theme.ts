// Excalidraw-inspired minimalist theme
export const theme = {
  // Color palette - minimal and clean
  colors: {
    // Primary colors
    primary: '#1971c2',
    primaryHover: '#1864ab',
    primaryLight: '#e7f5ff',
    
    // Neutral colors
    white: '#ffffff',
    gray50: '#f8f9fa',
    gray100: '#f1f3f4',
    gray200: '#e9ecef',
    gray300: '#dee2e6',
    gray400: '#ced4da',
    gray500: '#adb5bd',
    gray600: '#6c757d',
    gray700: '#495057',
    gray800: '#343a40',
    gray900: '#212529',
    
    // Canvas colors
    canvasBackground: '#ffffff',
    canvasGrid: '#f1f3f4',
    canvasBorder: '#e9ecef',
    
    // Element colors
    elementDefault: '#495057',
    elementSelected: '#1971c2',
    elementHover: '#6c757d',
    
    // Product colors
    productDefault: '#81c784',
    productSelected: '#4caf50',
    productHover: '#66bb6a',
    
    // Fixture colors
    fixtureDefault: '#9e9e9e',
    fixtureSelected: '#757575',
    fixtureHover: '#bdbdbd',
    
    // Status colors
    success: '#51cf66',
    warning: '#ffd43b',
    error: '#ff6b6b',
    info: '#339af0',
  },
  
  // Typography
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '18px',
      xl: '20px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  
  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  
  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    round: '50%',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  },
  
  // Z-index layers
  zIndex: {
    base: 0,
    canvas: 1,
    toolbar: 10,
    modal: 100,
    tooltip: 1000,
  },
  
  // Animation
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },
}

// Canvas specific constants
export const canvasConfig = {
  grid: {
    size: 20,
    color: theme.colors.canvasGrid,
    opacity: 0.5,
  },
  zoom: {
    min: 0.1,
    max: 5,
    step: 0.1,
    default: 1,
  },
  selection: {
    strokeColor: theme.colors.elementSelected,
    strokeWidth: 2,
    dashArray: [5, 5],
  },
}

// Component styles
export const componentStyles = {
  toolbar: {
    background: theme.colors.white,
    border: `1px solid ${theme.colors.gray200}`,
    borderRadius: theme.borderRadius.lg,
    shadow: theme.shadows.md,
    padding: theme.spacing.sm,
  },
  
  button: {
    primary: {
      background: theme.colors.primary,
      color: theme.colors.white,
      border: 'none',
      borderRadius: theme.borderRadius.sm,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    
    secondary: {
      background: theme.colors.gray100,
      color: theme.colors.gray700,
      border: `1px solid ${theme.colors.gray300}`,
      borderRadius: theme.borderRadius.sm,
      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    
    icon: {
      background: 'transparent',
      color: theme.colors.gray600,
      border: 'none',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      fontSize: theme.typography.fontSize.md,
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  panel: {
    background: theme.colors.white,
    border: `1px solid ${theme.colors.gray200}`,
    borderRadius: theme.borderRadius.md,
    shadow: theme.shadows.sm,
    padding: theme.spacing.md,
  },
}

export type Theme = typeof theme
export type CanvasConfig = typeof canvasConfig
export type ComponentStyles = typeof componentStyles
