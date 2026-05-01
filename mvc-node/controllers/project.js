const Project = require("../models/project");

const save = (req, res) => {
    let body = req.body;
    if (!body.name || !body.description || !body.state) {
        return res.status(400).send({
            status: "error",
            message: "Faltan datos por enviar"
        });
    }
    let projectToSave = new Project(body);
    projectToSave.save().then(project => {
        if (!project) {
            return res.status(404).send({
                status: "error",
                message: "El proyecto no se ha guardado bien"
            });
        }
        return res.status(200).send({
            status: "success",
            project
        });
    }).catch(error => {
        return res.status(500).send({
            message: "Error al guardar el proyecto"
        });
    })
}

const projects =(req,res) => {
    Project.find()
            .then(projects => {
                if(!projects){
                    return res.status(404).send({
                        status: "error",
                        message: "No hay proyectos para mostrar"
                    });
                }
                return res.status(200).send({
                    status:"success",
                    projects
                });
            })
            .catch(error => {
                return res.status(500).send({
                    status:"error",
                    message:"Error al listar los proyectos",
                    error
                })
            });
}

const deleteProject= (req,res) => {
    let id = req.params.id;
    Project.findByIdAndDelete(id)
        .then(project => {
            if(!project){
                return res.status(404).send({
                    status:"error",
                    message: "No se ha borrado el proyecto"
                }) 
            }
            return res.status(200).send({
                status:"success",
                project
            })
        })
        .catch(error =>{
            return res.status(500).send({
                status: "error",
                message: "Error al eliminar un documento",
                error
            });
        });
}

const update= (req,res) => {
    let body = req.body;
    if(!body || !body.id){
        return res.status(404).send({
            status: "error",
            message: "No has enviado nada"
        });
    }
    Project.findByIdAndUpdate(body.id, body, {new: true})
        .then(projectUpdate => {
            if(!projectUpdate){
                return res.status(404).send({
                    status: "error",
                    message: "No se ha encontrado el proyecto"
                });
            }
            return res.status(200).send({
                status:"success",
                project: projectUpdate
            });
        })
        .catch(eerror => {
            return res.status(500).send({
                status: "error",
                message: "Error al actualizar un documento",
                error
            });
        });
}

module.exports = {
    save,
    projects,
    deleteProject,
    update
};