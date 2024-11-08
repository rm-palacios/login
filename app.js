// 1. Invocar express
const express = require('express');
const app = express();

// 2. Para capturar los datos del formulario
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 3. Invocar dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env' });

// 4. El directorio public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

// 5. Motor de plantillas
app.set('view engine', 'ejs');

// 6. Invocar el módulo para hacer el hashing de password
const bcryptjs = require('bcryptjs');

// 7. Variables de sesión
const session = require('express-session');
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// 8. Módulo de conexión de la base de datos
const connection = require('./database/db');

// 9. Invocar nodemailer para enviar códigos de verificación
const nodemailer = require('nodemailer');

// Configuración de nodemailer para enviar correos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Función para generar un código de verificación de 6 dígitos
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 10. Rutas
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

// 11. Método para la REGISTRACIÓN
app.post('/register', async (req, res) => {
    const user = req.body.user;
    const name = req.body.name;
    const rol = req.body.rol;
    const pass = req.body.pass;
    const email = req.body.email;
    let passwordHash = await bcryptjs.hash(pass, 8);
    connection.query('INSERT INTO Usuarios SET ?', { user: user, name: name, rol: rol, pass: passwordHash, email: email }, (error, results) => {
        if (error) {
            console.log(error);
        } else {
            res.render('register', {
                alert: true,
                alertTitle: "Registro",
                alertMessage: "Registro Exitoso!",
                alertIcon: 'success',
                showConfirmButton: false,
                timer: 1500,
                ruta: ''
            });
        }
    });
});

// 12. Método para la autenticación inicial
app.post('/auth', async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;

    if (user && pass) {
        connection.query('SELECT * FROM Usuarios WHERE user = ?', [user], async (error, results) => {
            if (results.length == 0 || !(await bcryptjs.compare(pass, results[0].pass))) {
                res.render('login', {
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "USUARIO y/o PASSWORD incorrectas",
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta: 'login'
                });
            } else {
                // Generar el código de verificación
                const verificationCode = generateVerificationCode();
                req.session.verificationCode = verificationCode;
                req.session.user = user;

                // Enviar el código por correo electrónico
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: results[0].email, // Asegúrate de tener el correo del usuario en la base de datos
                    subject: 'Código de verificación',
                    text: `Tu código de verificación es: ${verificationCode}`
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        res.render('login', {
                            alert: true,
                            alertTitle: "Error",
                            alertMessage: "Error al enviar el código de verificación",
                            alertIcon: 'error',
                            showConfirmButton: true,
                            timer: false,
                            ruta: 'login'
                        });
                    } else {
                        res.render('verify-code'); // Renderiza la vista de verificación
                    }
                });
            }
        });
    } else {
        res.render('login', {
            alert: true,
            alertTitle: "Advertencia",
            alertMessage: "Por favor ingrese el usuario y contraseña",
            alertIcon: 'warning',
            showConfirmButton: true,
            timer: false,
            ruta: 'login'
        });
    }
});

// 13. Ruta para verificar el código de verificación
app.post('/verify-code', (req, res) => {
    const code = req.body.code;

    if (req.session.verificationCode && code === req.session.verificationCode) {
        req.session.loggedin = true;
        req.session.verificationCode = null;
        res.render('login', {
            alert: true,
            alertTitle: "Conexión exitosa",
            alertMessage: "¡LOGIN CORRECTO!",
            alertIcon: 'success',
            showConfirmButton: false,
            timer: 1500,
            ruta: ''
        });
    } else {
        res.render('verify-code', {
            alert: true,
            alertTitle: "Error",
            alertMessage: "Código de verificación incorrecto",
            alertIcon: 'error',
            showConfirmButton: true,
            timer: false,
            ruta: 'verify-code'
        });
    }
});

// 14. Autenticación para las páginas
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            login: true,
            name: req.session.user
        });
    } else {
        res.render('index', {
            login: false,
            name: 'Debe iniciar sesión',
        });
    }
});

// 15. Logout - Destruye la sesión
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/') // Se ejecutará después de que se destruya la sesión
    })
});

app.listen(3000, () => {
    console.log(`Servidor corriendo en http://localhost:3000`);
});