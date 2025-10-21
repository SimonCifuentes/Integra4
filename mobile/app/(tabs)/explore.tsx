// explore.tsx
import { hooks as ComplejosHooks } from "../../src/features/features/complejos/hooks";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Alert, TextInput, Text } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { Picker } from "@react-native-picker/picker";

export default function Explore() {
  const [location, setLocation] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState("1000"); // valor inicial en metros

  // ✅ Hook que consulta complejos cercanos
  const { data, isLoading } = ComplejosHooks.useComplejosCercanos(
    location?.latitude ?? null,
    location?.longitude ?? null,
    Number(radius)
  );

  useEffect(() => {
    // 🔧 Forzamos ubicación en Temuco (para pruebas)
    const userLocation = {
      coords: {
        latitude: -38.73965,
        longitude: -72.59842,
      },
    };

    setLocation({
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });

    setLoading(false);
  }, []);

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 32 }} />;
  }

  return (
    <View style={styles.container}>
      {/* Contenedor fijo para el input + selector */}
      <View style={styles.topControls}>
        <TextInput
          style={styles.input}
          placeholder="Buscar complejo deportivo..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.pickerContainer}>
          <Text style={{ marginBottom: 4, fontWeight: "600" }}>Radio de búsqueda</Text>
          <Picker
            selectedValue={radius}
            onValueChange={(value) => setRadius(value)}
            style={styles.picker}
            dropdownIconColor="#000"
          >
            <Picker.Item label="500 m" value="500" style={styles.pickerItem} />
            <Picker.Item label="1 km" value="1000" style={styles.pickerItem} />
            <Picker.Item label="2 km" value="2000" style={styles.pickerItem} />
            <Picker.Item label="5 km" value="5000" style={styles.pickerItem} />
          </Picker>
        </View>
      </View>

      {location && (
        <MapView style={styles.map} initialRegion={location} showsUserLocation>
          {/* Marcador de ubicación actual (Temuco o real) */}
          <Marker coordinate={location} title="Tú estás aquí">
            <Text style={{ fontSize: 28 }}>📍</Text>
          </Marker>

          {/* ✅ Marcadores de complejos (usa data directamente, no data.items) */}
          {isLoading ? (
            <ActivityIndicator size="large" color="blue" />
          ) : data && Array.isArray(data) && data.length > 0 ? (
            data.map((complejo: any) => (
              <Marker
                key={complejo.id_complejo}
                coordinate={{
                  latitude: complejo.latitud,
                  longitude: complejo.longitud,
                }}
                title={complejo.nombre}
                description={complejo.descripcion}
              />
            ))
          ) : (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No se encontraron complejos</Text>
            </View>
          )}
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topControls: {
    position: "absolute",
    top: 40,
    left: 10,
    right: 10,
    zIndex: 2,
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    elevation: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 6,
    backgroundColor: "white",
  },
  picker: {
    height: 50,
    width: "100%",
    color: "#000",
  },
  pickerItem: {
    fontSize: 16,
    color: "#000",
  },
  noResultsContainer: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    padding: 10,
    borderRadius: 8,
  },
  noResultsText: {
    color: "#333",
    fontWeight: "600",
  },
});
