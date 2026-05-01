const mongoose = require("mongoose");
const fs = require("fs");

async function limpiarYImportar() {
  try {
    // 1. Conectar a MongoDB
    await mongoose.connect("mongodb://127.0.0.1:27017/bd-portafolio");
    console.log("✅ Conectado a MongoDB");
    
    // 2. Leer el archivo JSON
    const datos = JSON.parse(fs.readFileSync("bancos_unicos.json", "utf8"));
    console.log(`📄 Total de registros leídos: ${datos.length}`);
    
    // 3. ELIMINAR DUPLICADOS - Mantener el primero que aparezca
    const vistos = new Set();
    const datosUnicos = datos.filter(banco => {
      const ruc = banco.RUC.toString().trim();
      if (vistos.has(ruc)) {
        console.log(`⚠️  RUC duplicado eliminado: ${ruc} - ${banco.RAZON_SOCIAL.trim()}`);
        return false;
      }
      vistos.add(ruc);
      return true;
    });
    
    console.log(`✅ Registros únicos después de limpiar: ${datosUnicos.length}`);
    console.log(`🗑️  Duplicados eliminados: ${datos.length - datosUnicos.length}`);
    
    // 4. Guardar archivo limpio (opcional)
    fs.writeFileSync("bancos_unicos_limpios.json", JSON.stringify(datosUnicos, null, 2));
    console.log("💾 Archivo 'bancos_unicos_limpios.json' creado");
    
    // 5. Limpiar la colección
    const db = mongoose.connection.db;
    const collection = db.collection("banco");
    const resultDelete = await collection.deleteMany({});
    console.log(`🗑️  ${resultDelete.deletedCount} registros eliminados de 'banco'`);
    
    // 6. Transformar datos
    const bancosTransformados = datosUnicos.map(banco => ({
      id: banco.RUC.toString().trim(),
      name_banco: banco.RAZON_SOCIAL.trim(),
      direction_banco: "direccion banco",
      createdAt: new Date()
    }));
    
    // 7. Insertar
    const resultado = await collection.insertMany(bancosTransformados);
    console.log(`✅ ${resultado.insertedCount} bancos insertados exitosamente`);
    
    await mongoose.connection.close();
    console.log("🔌 Conexión cerrada");
    
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

limpiarYImportar();