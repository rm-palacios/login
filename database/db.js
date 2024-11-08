const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: process.env.DB_HOST,              // Host                    
    user: process.env.DB_USER,              // Usuario de MySQL
    password: process.env.DB_PASSWORD,      // Contraseña de MySQL
    database: process.env.DB_DATABASE       // Nombre de la base de datos
});

connection.connect((error) => {
    if (error) {
        console.log('Error al conectar a la base de datos:' + error);
        return;
    }
    console.log('¡Conectado a la base de datos!');
});

module.exports = connection;