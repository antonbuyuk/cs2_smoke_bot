require('dotenv').config();
const { initDatabase, addSmoke } = require('./database');

const seedData = async () => {
  try {
    await initDatabase();

    // Тестовые гранаты для Dust 2
    const dust2Smokes = [];

    // Тестовые гранаты для Ancient
    const ancientSmokes = [a];

    // Добавляем гранаты для Dust 2
    for (const smoke of dust2Smokes) {
      await addSmoke('de_dust2', smoke);
      console.log(`Добавлена граната: ${smoke.name} для Dust 2`);
    }

    // Добавляем гранаты для Mirage
    for (const smoke of mirageSmokes) {
      await addSmoke('mirage', smoke);
      console.log(`Добавлена граната: ${smoke.name} для Mirage`);
    }

    // Добавляем гранаты для Ancient
    for (const smoke of ancientSmokes) {
      await addSmoke('ancient', smoke);
      console.log(`Добавлена граната: ${smoke.name} для Ancient`);
    }

    console.log('✅ Тестовые данные успешно добавлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при добавлении данных:', error);
    process.exit(1);
  }
};

seedData();