// Экспорт функций базы данных
import { initDatabase, getMaps, getSmokesByMap, addSmoke, saveSmokeImage, getSmokeMedia, deleteSmoke, getSmokeById, clearAllSmokes, getAllSmokes, addSuggestedSmoke, saveSuggestedSmokeImage, getAllSuggestedSmokes, getSuggestedSmokeById, getSuggestedSmokeMedia, approveSuggestedSmoke, rejectSuggestedSmoke } from './database';

export {
  initDatabase,
  getMaps,
  getSmokesByMap,
  addSmoke,
  saveSmokeImage,
  getSmokeMedia,
  deleteSmoke,
  getSmokeById,
  clearAllSmokes,
  getAllSmokes,
  addSuggestedSmoke,
  saveSuggestedSmokeImage,
  getAllSuggestedSmokes,
  getSuggestedSmokeById,
  getSuggestedSmokeMedia,
  approveSuggestedSmoke,
  rejectSuggestedSmoke
};