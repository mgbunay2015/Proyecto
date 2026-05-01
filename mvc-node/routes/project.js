const express = require("express");
const router = express.Router();

//Bloque 1:
const ProjectController = require("../controllers/project");

//Bloque 2:
router.post("/save",ProjectController.save);

//Bloque 3:
module.exports = router;