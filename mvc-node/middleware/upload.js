// 📄 middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

// Filtro de archivos
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.csv', '.txt', '.xlsx'];
    const extname = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(extname)) {
        cb(null, true);
    } else {
        cb(new Error(`Tipo de archivo no permitido: ${extname}`), false);
    }
};

// Crear instancia de multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1024 }, // 10MB
    fileFilter: fileFilter
});

// ✅ Exportar CORRECTAMENTE
module.exports = upload;