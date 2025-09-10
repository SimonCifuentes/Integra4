import { Platform, StyleSheet } from 'react-native';

/** ---------- Design Tokens (reutilizables en toda la app) ---------- */
export const colors = {
  // usa estos tokens dentro de ThemedView/Text o estilos puntuales
  primary: '#1D3D47',
  secondary: '#A1CEDC',
  text: '#111',
  textMuted: '#666',
  border: '#e6e6e6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

export const radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
  '2xl': 16,
};

export const typography = {
  body: 16,
  small: 12,
  title: 22,
  subtitle: 18,
};

export const shadow = {
  // sombras suaves multiplataforma
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    android: { elevation: 2 },
    default: {},
  }),
};

/** ---------- Helpers de layout ---------- */
export const layout = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

/**
 * Si más adelante quieres estilos dependientes del tema (light/dark), crea
 * una factory: makeStyles(theme) y devuelve StyleSheet.create({...}).
 * Por ahora usamos estilos neutrales y dejamos el color al ThemedView/Text.
 */

/** ---------- Estilos de la pantalla Home ---------- */
export const homeStyles = StyleSheet.create({
  reactLogo: {
    height: 200,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },

  headerTextBlock: {
    gap: 6,
    marginBottom: spacing.md,
  },

  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  searchIcon: { opacity: 0.6 },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    fontSize: typography.body,
  },
  filterBtn: {
    padding: spacing.sm,
    borderRadius: radius.md,
  },

  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    ...shadow.card,
  },
  quickIconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: typography.small, textAlign: 'center' },

  sectionHeader: {
    marginTop: 2,
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardsRow: {
    paddingRight: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pitchCard: {
    width: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  pitchImg: {
    width: '100%',
    height: 120,
  },
  pitchMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.card,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    ...shadow.card,
  },
  tipBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.md },

  devHelper: {
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});

export const heroStyles = StyleSheet.create({
  container: {
    width: '100%',
    // el contenedor no impone altura; cada slide define el alto por aspectRatio
  },
  slide: {
    width: '100%',
    // borderRadius opcional: si tu header tiene bordes redondeados, agrega overflow
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9, // ✅ responsive: se adapta a ancho de pantalla
  },
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 4,
    // fondo suave para legibilidad
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  title: { color: '#fff' },
  subtitle: { color: '#fff', opacity: 0.9 },

  dotsRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    opacity: 0.6,
    backgroundColor: '#fff',
  },
  dotActive: {
    width: 14,
    height: 6,
    borderRadius: 999,
    opacity: 1,
    backgroundColor: '#fff',
  },
});

/** ---------- Grid reutilizable (2 columnas por defecto) ---------- */
export const grid = StyleSheet.create({
  list: {
    // paddingHorizontal si quieres margen lateral
  },
  col2Item: {
    flex: 1,
    // gap se maneja con ItemSeparatorComponent
  },
  separator: { height: 12 },
  separatorH: { width: 12 },
});
