import { deleteMap } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteMap,
    entityName: 'Map',
    entityNameRu: 'карту',
  })
);


