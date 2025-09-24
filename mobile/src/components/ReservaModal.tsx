import React, { useEffect, useState } from "react";
import { View, Text, Modal, TextInput, Button } from "react-native";

type ReservaData = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  canchaId?: string | number;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ReservaData) => void;
  cancha?: any; // puedes tiparlo mejor según tu API (por ejemplo: { id_cancha: number; nombre: string; })
}

const ReservaModal: React.FC<Props> = ({ visible, onClose, onSubmit, cancha }) => {
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [canchaId, setCanchaId] = useState<string | number>("");

  // cuando se abre el modal, pre-llenamos canchaId si viene la cancha seleccionada
  useEffect(() => {
    if (visible) {
      setFecha("");
      setHoraInicio("");
      setHoraFin("");
      setCanchaId(cancha?.id_cancha ?? cancha?.id ?? "");
    }
  }, [visible, cancha]);

  const handlePressReservar = () => {
    // Validaciones básicas antes de enviar
    if (!fecha || !horaInicio || !horaFin || !canchaId) {
      // aquí podrías mostrar un Alert o mensaje de error
      console.warn("Completa fecha, hora inicio, hora fin e id cancha");
      return;
    }

    onSubmit({ fecha, horaInicio, horaFin, canchaId });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.5)" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 10, padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            Nueva Reserva {cancha ? ` - ${cancha.nombre ?? ""}` : ""}
          </Text>

          <TextInput
            placeholder="Fecha (YYYY-MM-DD)"
            value={fecha}
            onChangeText={setFecha}
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />
          <TextInput
            placeholder="Hora inicio (HH:MM)"
            value={horaInicio}
            onChangeText={setHoraInicio}
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />
          <TextInput
            placeholder="Hora fin (HH:MM)"
            value={horaFin}
            onChangeText={setHoraFin}
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />
          <TextInput
            placeholder="ID Cancha"
            value={String(canchaId)}
            onChangeText={(v) => setCanchaId(v)}
            style={{ borderBottomWidth: 1, marginBottom: 20 }}
          />

          <Button title="Reservar" onPress={handlePressReservar} />
          <View style={{ marginTop: 10 }}>
            <Button title="Cancelar" color="red" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ReservaModal;