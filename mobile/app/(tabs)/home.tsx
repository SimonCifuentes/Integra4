import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, ListRenderItem, Pressable, TextInput, View, useWindowDimensions } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

import HeroCarousel from '@/components/HeroCarousel';
import { grid, homeStyles as styles } from '@/styles/style';

/** ---- Datos mock ---- */
const featuredPitches = [
  { id: 'c1', name: 'Complejo Amanecer', sport: 'Fútbol 7', rating: 4.7, price: 12000, img: require('@/assets/images/logo_principal.png') },
  { id: 'c2', name: 'Estadio Ñielol', sport: 'Fútbol 11', rating: 4.5, price: 18000, img: require('@/assets/images/partial-react-logo.png') },
  { id: 'c3', name: 'Polideportivo Labranza', sport: 'Básquetbol', rating: 4.6, price: 9000, img: require('@/assets/images/partial-react-logo.png') },
  { id: 'c4', name: 'Cancha Pichi Cautín', sport: 'Tenis', rating: 4.3, price: 7000, img: require('@/assets/images/partial-react-logo.png') },
];

/** ---- Slides del carrusel ---- */
const heroSlides = [
  {
    id: 's1',
    image: require('@/assets/images/logo_principal.png'), // <- tu imagen generada
    title: 'Encuentra tu cancha',
    subtitle: 'Temuco · Mapas, reservas y eventos',
  },
  // puedes agregar más slides aquí si quieres
];

/** ---- Pantalla principal ---- */
export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  
  const headerHeight = Math.round((width || 360) * 9 / 16);

  const renderPitch: ListRenderItem<(typeof featuredPitches)[number]> = ({ item }) => (
    <View style={grid.col2Item}>
      <PitchCard
        name={item.name}
        sport={item.sport}
        rating={item.rating}
        price={item.price}
        img={item.img}
        onPress={() => router.push(`/recinto/${item.id}`)}
      />
    </View>
  );

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
                     
      headerImage={<HeroCarousel slides={heroSlides} height={headerHeight} />}
    >
      {/* Título + subtítulo */}
      <ThemedView style={styles.headerTextBlock}>
        <ThemedText type="title">SportHub Temuco</ThemedText>
        <ThemedText>
          Reserva canchas, únete a eventos y descubre recintos cerca de ti.
        </ThemedText>
      </ThemedView>

      {/* Buscador */}
      <ThemedView style={styles.searchCard}>
        <Ionicons name="search" size={20} style={styles.searchIcon} />
        <TextInput
          placeholder="Buscar por recinto, deporte o sector…"
          placeholderTextColor="#999"
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={({ nativeEvent }) => {
            const q = nativeEvent.text?.trim();
            if (q?.length) router.push({ pathname: '/explorar', params: { q } });
          }}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/explorar')}
          style={({ pressed }) => [styles.filterBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="options-outline" size={18} />
        </Pressable>
      </ThemedView>

      {/* Accesos rápidos */}
      <ThemedView style={styles.quickGrid}>
        <QuickAction label="Reservar" icon="calendar-outline" onPress={() => router.push('/reservas/nueva')} />
        <QuickAction label="Mapa" icon="map-outline" onPress={() => router.push('/mapa')} />
        <QuickAction label="Eventos" icon="trophy-outline" onPress={() => router.push('/eventos')} />
        <QuickAction label="Mis reservas" icon="ticket-outline" onPress={() => router.push('/mis-reservas')} />
      </ThemedView>

      {/* Canchas destacadas (grid) */}
      <SectionHeader title="Canchas destacadas" onSeeAll={() => router.push('/explorar')} />
      <FlatList
        data={featuredPitches}
        keyExtractor={(it) => it.id}
        renderItem={renderPitch}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        ItemSeparatorComponent={() => <View style={grid.separator} />}
        contentContainerStyle={{ paddingBottom: 16 }}
        scrollEnabled={false} // porque está dentro de ParallaxScrollView
      />
    </ParallaxScrollView>
  );
}

/** ---- Subcomponentes ---- */

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <ThemedView style={styles.sectionHeader}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll} accessibilityRole="button">
          <ThemedText type="link">Ver todo</ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.quickItem, pressed && { transform: [{ scale: 0.98 }] }]}>
      <ThemedView style={styles.quickIconWrap}>
        <Ionicons name={icon} size={22} />
      </ThemedView>
      <ThemedText type="defaultSemiBold" style={styles.quickLabel}>{label}</ThemedText>
    </Pressable>
  );
}

function PitchCard({ name, sport, rating, price, img, onPress }: { name: string; sport: string; rating: number; price: number; img: any; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pitchCard, pressed && { opacity: 0.8 }]}>
      <Image source={img} style={styles.pitchImg} contentFit="cover" />
      <View style={{ padding: 10, gap: 4 }}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>{name}</ThemedText>
        <ThemedText style={{ opacity: 0.8 }}>{sport}</ThemedText>
        <View style={styles.pitchMetaRow}>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} />
            <ThemedText> {rating.toFixed(1)}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold">${price.toLocaleString('es-CL')}</ThemedText>
        </View>
      </View>
    </Pressable>
  );
}
