import { getAllUsers } from '@shared/database';

export default defineEventHandler(async () => {
  const users = await getAllUsers();
  return { data: users };
});
