// config.js
module.exports = {
        user: 'manager',             // Имя пользователя, как в строке UID
        password: '22480',           // Пароль, как в строке PWD
        server: '127.0.0.1',         // Адрес сервера
        database: 'CafeManagement',  // Имя базы данных
        options: {
          encrypt: false,            // Обычно false для локальной работы
          trustServerCertificate: true // Для доверия самоподписанным сертификатам (локально)
        }
      };
      