const mongoose = require("mongoose");

const connection = async() => {
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/bd-portafolio");
        console.log("Se ha conectado a la bdd bd-portafolio");
    }catch(error){
        console.log(error);
        throw new Error("No se ha podido establecer la conexion a la bdd");
    }
}

module.exports = connection;