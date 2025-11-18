// src/features/uploads/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";

export type MediaTarget = "perfil" | "cancha" | "complejo";

export interface UploadMediaPayload {
  target: MediaTarget;
  target_id: number;
  uri: string;          // uri local de la imagen (ImagePicker)
  es_principal?: boolean;
  orden?: number;
}

function guessMimeType(filename: string) {
  const match = /\.(\w+)$/.exec(filename.toLowerCase());
  const ext = match?.[1];

  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg"; // default
}

export async function uploadMedia(payload: UploadMediaPayload) {
  const {
    target,
    target_id,
    uri,
    es_principal = true,
    orden = 0,
  } = payload;

  const formData = new FormData();

  const filename = uri.split("/").pop() ?? "photo.jpg";
  const type = guessMimeType(filename);

  // ⚠️ NOMBRES EXACTOS SEGÚN SWAGGER
  formData.append("target", target);
  formData.append("target_id", String(target_id));
  formData.append("es_principal", String(es_principal));
  formData.append("orden", String(orden));
  formData.append("file", {
    uri,
    name: filename,
    type,
  } as any);

  const res = await http.post("/media", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
}
