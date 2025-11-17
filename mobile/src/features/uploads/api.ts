/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";

// Tipos básicos que expone la API de /media
export type MediaTarget = "perfil" | "cancha" | "complejo";

export interface Media {
  id_media: number;
  target: MediaTarget;
  target_id: number;
  bucket: string;
  object_key: string;
  url_publica: string;
  es_principal: boolean;
  orden: number;
  metadata?: Record<string, any> | null;
}

export interface UploadMediaDTO {
  target: MediaTarget;
  target_id: number;
  es_principal?: boolean;
  orden?: number;
  /**
   * Archivo a subir.
   * En web suele ser un File, en RN un objeto { uri, type, name }.
   */
  file: any;
}

export interface ReplaceMediaDTO {
  id_media: number;
  file: any;
}

export interface ListMediaParams {
  target: MediaTarget;
  target_id: number;
}

export interface ReorderMediaDTO {
  target: MediaTarget;
  target_id: number;
  // arreglo de ids en el orden deseado
  orden: number[];
}

export const api = {
  /**
   * POST /media
   * Sube una nueva imagen (perfil, cancha o complejo).
   */
  uploadMedia: async (data: UploadMediaDTO) => {
    const formData = new FormData();
    formData.append("target", data.target);
    formData.append("target_id", String(data.target_id));
    formData.append(
      "es_principal",
      String(data.es_principal ?? true)
    );
    formData.append("orden", String(data.orden ?? 0));
    formData.append("file", data.file);

    const res = await http.post<Media>("/media", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  },

  /**
   * PUT /media/{id_media}
   * Reemplaza el archivo de una imagen existente.
   */
  replaceMedia: async ({ id_media, file }: ReplaceMediaDTO) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await http.put<Media>(`/media/${id_media}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data;
  },

  /**
   * GET /media
   * Lista imágenes por target y recurso (perfil/cancha/complejo).
   */
  listMediaByTarget: async (params: ListMediaParams) => {
    const res = await http.get<Media[]>("/media", { params });
    return res.data;
  },

  /**
   * DELETE /media/{id_media}
   * Elimina una imagen (R2 + BD).
   */
  deleteMedia: async (id_media: number) => {
    const res = await http.delete<void>(`/media/${id_media}`);
    return res.data;
  },

  /**
   * POST /media/{id_media}/principal
   * Marca una imagen como principal.
   */
  setMediaAsPrincipal: async (id_media: number) => {
    const res = await http.post<Media>(`/media/${id_media}/principal`);
    return res.data;
  },

  /**
   * POST /media/reorder
   * Reordena imágenes de un recurso.
   */
  reorderMedia: async (data: ReorderMediaDTO) => {
    const res = await http.post<void>("/media/reorder", data);
    return res.data;
  },
};
