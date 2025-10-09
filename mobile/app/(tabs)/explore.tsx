// explore.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet, Alert, TextInput, Text } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Picker } from "@react-native-picker/picker";

export default function Explore() {
  const [location, setLocation] = useState<Region | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState("1000"); // valor inicial en metros

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Necesitas dar permiso de ubicación para usar el mapa.");
        setLoading(false);
        return;
      }

      let userLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setLoading(false);
    })();
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
           dropdownIconColor="#000" // 👈 hace que la flecha se vea clara
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
          <Marker coordinate={location} title="Tú estás aquí">
            <Text style={{ fontSize: 28 }}>📍</Text>
          </Marker>
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
    elevation: 5, // sombra en Android
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
  color: "#000", // 👈 asegura texto negro
},
pickerItem: {
  fontSize: 16,
  color: "#000", // 👈 asegura que los ítems sean legibles
},

});
