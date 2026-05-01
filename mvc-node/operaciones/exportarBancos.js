const mongoose = require("mongoose");
const fs = require("fs");

async function exportarBancos() {
  try {
    // 1. Conectar y ESPERAR a que se complete
    await mongoose.connect("mongodb://127.0.0.1:27017/bd-portafolio");
    console.log("✅ Conectado a MongoDB");
    
    const db = mongoose.connection.db;
    
    // 2. Ejecutar la agregación
    const result = await db.collection("transaccional").aggregate([
      {
        $group: {
          _id: {
            RUC: "$RUC",
            RAZON_SOCIAL: "$RAZON SOCIAL"
          }
        }
      },
      {
        $project: {
          _id: 0,
          RUC: "$_id.RUC",
          RAZON_SOCIAL: "$_id.RAZON_SOCIAL"
        }
      },
      {
        $sort: { RUC: 1 }
      }
    ]).toArray();

    // 3. Guardar en archivo
    fs.writeFileSync("bancos_unicos.json", JSON.stringify(result, null, 2));
    console.log("✅ Archivo 'bancos_unicos.json' creado exitosamente");
    console.log(`📊 Total de registros exportados: ${result.length}`);

    // 4. Cerrar conexión
    await mongoose.connection.close();
    console.log("🔌 Conexión cerrada");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Ejecutar la función
exportarBancos();