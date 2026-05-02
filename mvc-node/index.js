//Bloque 1:
const connection = require("./database/connection");
const express = require("express");
const cors = require("cors");
 

//Bloque 2:
// Espera a que la conexión se complete antes de continuar
connection().then(() => {
    console.log("✅ Base de datos lista");
    
    
    app.listen(port, ()=>{
        console.log("Servidor esta corriendo correctamente en el puerto: "+port);
    })
    
}).catch(err => {
    console.error("❌ Error fatal:", err);
    process.exit(1);
});

//Bloque 3:
const app = express();  // ✅ ÚNICA declaración de app (nivel global del módulo)
const port = 3977;

//Bloque 4:
app.use(cors());

//Bloque 5:
app.use(express.json());
app.use(express.urlencoded({extended:true}));

//Bloque 6:
const projectRoutes = require("./routes/project");  
app.use('/api/project', projectRoutes);

// Bloque de usuarios
const userRoutes = require("./routes/user");
app.use('/api/users', userRoutes);

// Bloque de Bancos
const bancoRoutes = require("./routes/banco");
app.use('/api/bancos', bancoRoutes);

// Bloque de transaccional
const transaccionalRoutes = require("./routes/transaccional");
app.use('/api/transaccional', transaccionalRoutes);

 
// Bloque de formulas
const formulasRoutes = require("./routes/formula");
app.use('/api/formulas', formulasRoutes);

// bloque analisis
const analisisRoutes = require('./routes/analisis');
app.use('/api/analisis', analisisRoutes);

const path = require('path');

// Ruta para servir el HTML
app.get('/analisis.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'analisis.html'));
});
