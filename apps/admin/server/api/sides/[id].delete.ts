import { deleteSide } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteSide,
    entityName: 'Side',
    entityNameRu: 'сторону',
  })
);


