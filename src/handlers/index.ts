// Экспорт всех обработчиков
import userHandlers from './user-handlers';
import adminHandlers from './admin-handlers';

export default {
  ...userHandlers,
  ...adminHandlers
};