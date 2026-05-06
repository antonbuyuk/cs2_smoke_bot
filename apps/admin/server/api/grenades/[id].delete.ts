import { deleteSmoke } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteSmoke,
    entityName: 'Grenade',
    entityNameRu: 'гранату',
  })
);
