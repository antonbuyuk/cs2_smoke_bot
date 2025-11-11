// Экспорт всех обработчиков
import * as userHandlers from './user';
import * as adminHandlers from './admin';

export default {
  ...userHandlers,
  ...adminHandlers
};