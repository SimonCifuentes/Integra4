// app/(tabs)/grupos.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const TEAL = "#0d9488";

type Group = {
  id: string;
  name: string;
  sport: "futbol" | "padel" | "tenis";
  level: "Principiante" | "Intermedio" | "Avanzado" | "Mixto";
  members: number;
  maxMembers: number;
  city: string;
  complex: string;
  nextMatchDate: string;
  nextMatchTime: string;
  courtType: string;
  isAdmin: boolean;
  isFavorite?: boolean;
  hasInvitation?: boolean;
};

const MOCK_GROUPS: Group[] = [
  {
    id: "1",
    name: "Los Domingueros FC",
    sport: "futbol",
    level: "Intermedio",
    members: 8,
    maxMembers: 12,
    city: "Temuco",
    complex: "Complejo Arenales",
    nextMatchDate: "Dom 20 Oct",
    nextMatchTime: "20:00 – 21:00",
    courtType: "Fútbol 7, pasto sintético",
    isAdmin: true,
    isFavorite: true,
  },
  {
    id: "2",
    name: "Padeleros After Office",
    sport: "padel",
    level: "Avanzado",
    members: 4,
    maxMembers: 6,
    city: "Padre Las Casas",
    complex: "Padel Pro Sur",
    nextMatchDate: "Lun 21 Oct",
    nextMatchTime: "19:00 – 20:30",
    courtType: "Pádel indoor",
    isAdmin: false,
    hasInvitation: true,
  },
  {
    id: "3",
    name: "Tenis Mixto Nocturno",
    sport: "tenis",
    level: "Mixto",
    members: 6,
    maxMembers: 8,
    city: "Temuco",
    complex: "Club Tenis Alemán",
    nextMatchDate: "Jue 24 Oct",
    nextMatchTime: "21:00 – 22:30",
    courtType: "Tenis arcilla",
    isAdmin: false,
  },
];

type FilterId = "todos" | "mis" | "invitaciones" | "favoritos";

export default function GruposScreen() {
  const [activeFilter, setActiveFilter] = React.useState<FilterId>("todos");

  const groups = React.useMemo(() => {
    switch (activeFilter) {
      case "mis":
        return MOCK_GROUPS.filter((g) => g.isAdmin || !g.hasInvitation);
      case "invitaciones":
        return MOCK_GROUPS.filter((g) => g.hasInvitation);
      case "favoritos":
        return MOCK_GROUPS.filter((g) => g.isFavorite);
      default:
        return MOCK_GROUPS;
    }
  }, [activeFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Grupos</Text>

        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.createButtonText}>Crear grupo</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        <FilterChip
          label="Todos"
          active={activeFilter === "todos"}
          onPress={() => setActiveFilter("todos")}
        />
        <FilterChip
          label="Mis grupos"
          active={activeFilter === "mis"}
          onPress={() => setActiveFilter("mis")}
          icon="person-circle-outline"
        />
        <FilterChip
          label="Invitaciones"
          active={activeFilter === "invitaciones"}
          onPress={() => setActiveFilter("invitaciones")}
          icon="mail-unread-outline"
        />
        <FilterChip
          label="Favoritos"
          active={activeFilter === "favoritos"}
          onPress={() => setActiveFilter("favoritos")}
          icon="star-outline"
        />
      </ScrollView>

      {/* Lista de grupos */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
      >
        {groups.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons
              name="people-outline"
              size={40}
              color="#9ca3af"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>Aún no tienes grupos</Text>
            <Text style={styles.emptyText}>
              Crea un grupo con tus amigos o acepta una invitación para empezar
              a organizar partidos.
            </Text>
            <TouchableOpacity style={[styles.createButton, { marginTop: 12 }]}>
              <Ionicons name="add-circle-outline" size={18} color="#fff" />
              <Text style={styles.createButtonText}>Crear mi primer grupo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((group) => <GroupCard key={group.id} group={group} />)
        )}
      </ScrollView>
    </View>
  );
}

/* Card de grupo */

function GroupCard({ group }: { group: Group }) {
  const sportIcon =
    group.sport === "futbol"
      ? "football-outline"
      : group.sport === "padel"
      ? "tennisball-outline"
      : "ellipse-outline";

  return (
    <View style={styles.card}>
      {/* Título + badges */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name={sportIcon as any} size={18} color={TEAL} />
            <Text style={styles.cardTitle}>{group.name}</Text>
          </View>
          <View style={styles.tagsRow}>
            <Tag icon="speedometer-outline" text={group.level} />
            <Tag
              icon="people-outline"
              text={`${group.members}/${group.maxMembers} jugadores`}
            />
          </View>
        </View>

        {group.isFavorite && (
          <Ionicons name="star" size={20} color="#f59e0b" />
        )}
      </View>

      {/* Info principal */}
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          {group.complex} · {group.city}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          Próximo partido: {group.nextMatchDate} · {group.nextMatchTime}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="map-outline" size={16} color="#6b7280" />
        <Text style={styles.infoText}>{group.courtType}</Text>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.primaryButton}>
          <Ionicons name="eye-outline" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Ver detalle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={TEAL} />
          <Text style={styles.secondaryButtonText}>Chat</Text>
        </TouchableOpacity>

        {group.hasInvitation ? (
          <TouchableOpacity style={styles.inviteButton}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
            <Text style={styles.inviteButtonText}>Aceptar</Text>
          </TouchableOpacity>
        ) : group.isAdmin ? (
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="create-outline" size={16} color={TEAL} />
            <Text style={styles.secondaryButtonText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.secondaryButton}>
            <Ionicons name="exit-outline" size={16} color={TEAL} />
            <Text style={styles.secondaryButtonText}>Salir</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* Componentes pequeños */

function FilterChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? "#fff" : "#4b5563"}
          style={{ marginRight: 4 }}
        />
      )}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Tag({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={12} color="#6b7280" />
      <Text style={styles.tagText}>{text}</Text>
    </View>
  );
}

/* Estilos */

const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: TEAL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4b5563",
  },
  chipTextActive: {
    color: "#fff",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginLeft: 6,
    color: "#0f172a",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tagText: {
    fontSize: 10,
    color: "#4b5563",
    fontWeight: "600",
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  infoText: {
    marginLeft: 4,
    color: "#4b5563",
    fontSize: 12,
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: TEAL,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: TEAL,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  secondaryButtonText: {
    color: TEAL,
    fontWeight: "700",
    fontSize: 12,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16a34a",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 4,
  },
  inviteButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
  },

  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    marginTop: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
  },
});
