import { deleteGrenadeType } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteGrenadeType,
    entityName: 'Grenade type',
    entityNameRu: 'тип гранаты',
  })
);


