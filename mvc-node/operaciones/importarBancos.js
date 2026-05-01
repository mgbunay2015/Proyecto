const mongoose = require("mongoose");
const fs = require("fs");

async function importarBancos() {
  try {
    // 1. Conectar a MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/bd-portafolio");
    console.log("✅ Conectado a MongoDB");
    
    // 2. Limpiar la base de datos (IMPORTANTE)
    const db = mongoose.connection.db;
    const collection = db.collection("banco"); // Asegúrate que sea 'banco' (singular)
    
    const resultDelete = await collection.deleteMany({});
    console.log(`🗑️ ${resultDelete.deletedCount} registros eliminados de la tabla 'banco'.`);
    
    // 3. Leer el archivo JSON
    const datos = JSON.parse(fs.readFileSync("bancos_unicos.json", "utf8"));
    console.log(`📄 Leyendo ${datos.length} registros para importar...`);
    
    // 4. Transformar los datos
    // RUC -> id | RAZON_SOCIAL -> name_banco | Direccion -> direction_banco
    const bancosTransformados = datos.map(banco => ({
      id: banco.RUC.toString().trim(), 
      name_banco: banco.RAZON_SOCIAL.trim(),
      direction_banco: "direccion banco", // Valor fijo
      createdAt: new Date() // Fecha actual
    }));
    
    // 5. Insertar en la base de datos
    // insertMany inserta todo en una sola operación rápida
    const resultadoInsert = await collection.insertMany(bancosTransformados);
    console.log(`✅ ${resultadoInsert.insertedCount} bancos insertados exitosamente`);
    
    // 6. Cerrar conexión
    await mongoose.connection.close();
    console.log("🔌 Conexión cerrada");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar
importarBancos();