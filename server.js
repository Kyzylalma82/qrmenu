const express = require('express');
const sql = require('mssql');
const config = require('./config');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// GET маршрут для получения категорий из базы данных
app.get('/api/categories', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    // Выполняем запрос к таблице Categories
    const result = await pool.request().query('SELECT * FROM Categories');
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка запроса к базе данных (categories):', err);
    res.status(500).send('Ошибка сервера');
  } finally {
    if (pool) {
      pool.close();
    }
  }
});

// POST маршрут для добавления новой категории (при необходимости)
app.post('/api/categories', async (req, res) => {
  let pool;
  try {
    const { name } = req.body;
    pool = await sql.connect(config);
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .query('INSERT INTO Categories (Name) VALUES (@name); SELECT SCOPE_IDENTITY() AS id;');
    res.status(201).json({ id: result.recordset[0].id, name });
  } catch (err) {
    console.error('Ошибка добавления категории:', err);
    res.status(500).send('Ошибка сервера');
  } finally {
    if (pool) {
      pool.close();
    }
  }
});

// GET маршрут для получения блюд из таблицы Menu (с JOIN для получения названия категории)
app.get('/api/menu', async (req, res) => {
  let pool;
  try {
    pool = await sql.connect(config);
    // Запрос, который выбирает поля из Menu и добавляет поле categoryName из Categories
    const query = `
      SELECT
        m.id,
        m.name,
        m.description,
        m.price,
        m.category_id,
        c.Name AS categoryName,    -- название категории
        m.available,
        m.image_path,
        m.weight,
        m.quantity
      FROM Menu m
      JOIN Categories c ON m.category_id = c.id
    `;
    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Ошибка запроса к базе данных (menu):', err);
    res.status(500).send('Ошибка сервера');
  } finally {
    if (pool) {
      pool.close();
    }
  }
});

// Корневой маршрут для проверки работы сервера
app.get('/', (req, res) => {
  res.send('Сервер запущен и работает!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
