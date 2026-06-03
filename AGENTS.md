# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is `mvc-node`, a Node.js/Express MVC financial analysis application for credit unions (Cooperativas de Ahorro y Crédito). It uses MongoDB as its database and runs on port 3977.

### Required services

| Service | How to start |
|---------|-------------|
| **MongoDB** | `mongod --dbpath /data/db --bind_ip 127.0.0.1 --port 27017 --fork --logpath /var/log/mongodb/mongod.log` (must remove stale socket first: `sudo rm -f /tmp/mongodb-27017.sock`) |
| **Node.js server** | `cd mvc-node && npx nodemon index.js` (runs on port 3977) |

### Gotchas

- The `npm start` script runs `nodemon index.js`, but `nodemon` may lack execute permissions in `node_modules/.bin/`. Use `npx nodemon index.js` as a reliable alternative.
- MongoDB socket at `/tmp/mongodb-27017.sock` can become stale. Always `sudo rm -f /tmp/mongodb-27017.sock` before starting `mongod` if it fails with a socket error.
- The MongoDB connection string is hardcoded in `mvc-node/database/connection.js` as `mongodb://127.0.0.1:27017/bd-portafolio`.
- The project has no automated test suite (`npm test` just echoes an error). Testing is done via API calls (curl) and manual browser testing on `http://localhost:3977/analisis.html`.
- The frontend (`analisis.html`) loads Chart.js and html2pdf.js from CDNs, so internet access is needed for full frontend functionality.

### Key API endpoints

All under `http://localhost:3977/api/`:
- `GET/POST /api/users` — user CRUD
- `GET/POST /api/formulas` — financial formula CRUD
- `GET/POST /api/transaccional` — transactional data
- `GET/POST /api/bancos` — bank management
- `POST /api/analisis` — generate investment analysis (body: `{cedula, nombre, monto}`)
- `GET /api/analisis/:cedula` — lookup previous analysis
- `GET /analisis.html` — frontend page
