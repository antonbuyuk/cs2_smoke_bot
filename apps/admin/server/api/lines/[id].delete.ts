import { deleteLine } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteLine,
    entityName: 'Line',
    entityNameRu: 'линию',
  })
);


