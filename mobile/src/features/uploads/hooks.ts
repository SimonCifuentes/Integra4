/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ListMediaParams, UploadMediaDTO, ReplaceMediaDTO, ReorderMediaDTO } from "./api";

const mediaKey = (params: ListMediaParams) => ["media", params.target, params.target_id];

export const hooks = {
  /**
   * Lista imágenes de un recurso (perfil / cancha / complejo)
   */
  useMediaByTarget: (params: ListMediaParams) =>
    useQuery({
      queryKey: mediaKey(params),
      queryFn: () => api.listMediaByTarget(params),
    }),

  /**
   * Sube una nueva imagen.
   * Ej: foto de perfil, foto principal de cancha, etc.
   */
  useUploadMedia: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (dto: UploadMediaDTO) => api.uploadMedia(dto),
      onSuccess: (_data, variables) => {
        // invalidar la lista del mismo recurso (target + target_id)
        queryClient.invalidateQueries({
          queryKey: mediaKey({
            target: variables.target,
            target_id: variables.target_id,
          }),
        });
      },
    });
  },

  /**
   * Reemplaza archivo de una imagen existente.
   */
  useReplaceMedia: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (dto: ReplaceMediaDTO) => api.replaceMedia(dto),
      onSuccess: (data) => {
        // invalidar la lista del recurso al que pertenece la imagen
        queryClient.invalidateQueries({
          queryKey: mediaKey({
            target: data.target,
            target_id: data.target_id,
          }),
        });
      },
    });
  },

  /**
   * Elimina una imagen.
   */
  useDeleteMedia: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id_media: number) => api.deleteMedia(id_media),
      onSuccess: (_data, id_media, context: any) => {
        // si en el contexto pasas { target, target_id } puedes invalidar aquí
        if (context?.target && context?.target_id) {
          queryClient.invalidateQueries({
            queryKey: mediaKey({
              target: context.target,
              target_id: context.target_id,
            }),
          });
        } else {
          queryClient.invalidateQueries({ queryKey: ["media"] });
        }
      },
    });
  },

  /**
   * Marca una imagen como principal.
   */
  useSetMediaAsPrincipal: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id_media: number) => api.setMediaAsPrincipal(id_media),
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: mediaKey({
            target: data.target,
            target_id: data.target_id,
          }),
        });
      },
    });
  },

  /**
   * Reordena imágenes de un recurso.
   */
  useReorderMedia: () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (dto: ReorderMediaDTO) => api.reorderMedia(dto),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({
          queryKey: mediaKey({
            target: variables.target,
            target_id: variables.target_id,
          }),
        });
      },
    });
  },
};
