//Bloque 1:
const connection = require("./database/connection");
const express = require("express");
const cors = require("cors");

//Bloque 2:
// Espera a que la conexión se complete antes de continuar
connection().then(() => {
    console.log("✅ Base de datos lista");
    
    // El resto de tu código...
    const app = express();
    // ...
}).catch(err => {
    console.error("❌ Error fatal:", err);
    process.exit(1);
});

//Bloque 3:
const app = express();
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



//Bloque 7:
app.listen(port, ()=>{
    console.log("Servidor esta corriendo correctamente en el puerto: "+port);
})