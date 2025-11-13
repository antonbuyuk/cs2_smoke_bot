import { deleteDifficulty } from '@shared/database';
import { createDeleteHandler } from '../../utils/deleteHandler';

export default defineEventHandler(
  createDeleteHandler({
    deleteFn: deleteDifficulty,
    entityName: 'Difficulty',
    entityNameRu: 'сложность',
  })
);


