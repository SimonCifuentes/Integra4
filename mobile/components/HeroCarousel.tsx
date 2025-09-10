// mobile/components/HeroCarousel.tsx
import React from "react";
import { View, FlatList, Image, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

type Slide = { uri: string; id?: string };
const defaultSlides: Slide[] = [
  { uri: "https://picsum.photos/seed/1/1200/600", id: "1" },
  { uri: "https://picsum.photos/seed/2/1200/600", id: "2" },
  { uri: "https://picsum.photos/seed/3/1200/600", id: "3" },
];

export default function HeroCarousel({ slides = defaultSlides }: { slides?: Slide[] }) {
  const height = Math.round(width * 0.5);
  return (
    <View style={{ width, height }}>
      <FlatList
        data={slides}
        horizontal
        pagingEnabled
        keyExtractor={(_, i) => String(i)}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Image source={{ uri: item.uri }} style={{ width, height }} resizeMode="cover" />
        )}
      />
    </View>
  );
}
