import { logger } from 'app/logging/logger';
import type { AppStartListening } from 'app/store/middleware/listenerMiddleware';
import { canvasMaskSavedToGallery } from 'features/canvas/store/actions';
import { getCanvasData } from 'features/canvas/util/getCanvasData';
import { toast } from 'features/toast/toast';
import { t } from 'i18next';
import { imagesApi } from 'services/api/endpoints/images';

export const addCanvasMaskSavedToGalleryListener = (startAppListening: AppStartListening) => {
  startAppListening({
    actionCreator: canvasMaskSavedToGallery,
    effect: async (action, { dispatch, getState }) => {
      const log = logger('canvas');
      const state = getState();

      const canvasBlobsAndImageData = await getCanvasData(
        state.canvas.layerState,
        state.canvas.boundingBoxCoordinates,
        state.canvas.boundingBoxDimensions,
        state.canvas.isMaskEnabled,
        state.canvas.shouldPreserveMaskedArea
      );

      if (!canvasBlobsAndImageData) {
        return;
      }

      const { maskBlob } = canvasBlobsAndImageData;

      if (!maskBlob) {
        log.error('Problem getting mask layer blob');
        toast({
          id: 'PROBLEM_SAVING_MASK',
          title: t('toast.problemSavingMask'),
          description: t('toast.problemSavingMaskDesc'),
          status: 'error',
        });
        return;
      }

      const { autoAddBoardId } = state.gallery;

      dispatch(
        imagesApi.endpoints.uploadImage.initiate({
          file: new File([maskBlob], 'canvasMaskImage.png', {
            type: 'image/png',
          }),
          image_category: 'mask',
          is_intermediate: false,
          board_id: autoAddBoardId === 'none' ? undefined : autoAddBoardId,
          crop_visible: true,
          postUploadAction: {
            type: 'TOAST',
            title: t('toast.maskSavedAssets'),
          },
        })
      );
    },
  });
};
