// Wellness Editorial Design System
// Extracted from HTML mockups: warm parchment canvas, charcoal ink, lavender accents

export const colors = {
  light: {
    // Canvas
    background: '#F5F2EA',       // Warm Parchment
    surface: '#FFFFFF',          // Clean white for cards
    card: '#FFFFFF',

    // Ink & Text
    text: '#3D3D3D',             // Wellness Charcoal (Keep text dark for readability)
    textSecondary: '#3D3D3D99',  // 60% opacity charcoal
    textMuted: '#3D3D3D50',      // 30% opacity charcoal

    // Accent
    primary: '#c5ebfc',          // Ultimate Light Blue (Primary)
    primaryLight: '#e0f7ff',
    accent: '#B8A1D1',           // Lavender for calendar
    secondary: '#B8A1D1',

    // Borders & Shadows
    border: 'rgba(0,0,0,0.05)',  // Ultra-subtle
    shadow: 'rgba(0, 0, 0, 0.08)',

    // Pastel Palette (for data viz & cards)
    pastelMint: '#E2F7E1',       // Green cards
    pastelYellow: '#FEF3C7',     // Energy / tips
    pastelOrange: '#FFEDD5',     // Alerts / patterns
    pastelBlue: '#EFF6FF',       // Data / insights
    pastelPurple: '#F5F3FF',     // Growth
  },
  dark: {
    background: '#0F172A',       // Slate/Navy background
    surface: '#1E293B',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    primary: '#c5ebfc',
    primaryLight: '#e0f7ff',
    accent: '#B8A1D1',
    secondary: '#B8A1D1',
    border: 'rgba(255,255,255,0.05)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    pastelMint: '#2D4A2D',
    pastelYellow: '#78350F',
    pastelOrange: '#7C2D12',
    pastelBlue: '#1E40AF',
    pastelPurple: '#4C1D95',
  },
};

// Gradients — Ultimate Light Blue
export const gradients = {
  primary: ['#c5ebfc', '#dcf4ff'],
  secondary: ['#dcf4ff', '#f0f9ff'],
  success: ['#34D399', '#10B981'],
  warm: ['#F59E0B', '#D97706'],
  cool: ['#e0f7ff', '#c5ebfc'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,   // ~2rem — the signature rounded cards
  xxxl: 40,  // ~2.5rem — extra soft pastel cards
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};
