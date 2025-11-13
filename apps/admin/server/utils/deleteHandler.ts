import { createError, H3Event } from 'h3';
import { RecordInUseError } from '@shared/database';

type DeleteFunction = (id: number) => Promise<number>;

type DeleteHandlerConfig = {
  deleteFn: DeleteFunction;
  entityName: string;
  entityNameRu: string;
};

export const createDeleteHandler = (config: DeleteHandlerConfig) => {
  return async (event: H3Event) => {
    const rawId = event.context.params?.id;
    const parsedId = Number.parseInt(String(rawId), 10);

    if (Number.isNaN(parsedId)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid ${config.entityName} id`,
      });
    }

    try {
      const deletedCount = await config.deleteFn(parsedId);

      if (deletedCount === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: `${config.entityName} not found`,
        });
      }

      return {
        success: true,
        deletedCount,
      };
    } catch (error) {
      // Обработка ошибки использования записи
      if (error instanceof RecordInUseError) {
        throw createError({
          statusCode: 409,
          statusMessage: error.message,
          message: error.message,
          data: {
            recordType: error.recordType,
            recordId: error.recordId,
            usageCount: error.usageCount,
            message: error.message,
          },
        });
      }

      // Обработка других ошибок
      if (error && typeof error === 'object' && 'statusCode' in error) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw createError({
        statusCode: 500,
        statusMessage: message.includes('не найдена') ? message : `Failed to delete ${config.entityNameRu}`,
        cause: error,
      });
    }
  };
};

