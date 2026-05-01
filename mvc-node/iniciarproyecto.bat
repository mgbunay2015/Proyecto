start "" cmd.exe /k cd /d "C:\Program Files\MongoDB\Server\8.2\bin" ^&^& mongod.exe --dbpath "C:\data8\db"
start "" cmd.exe /k cd /d "C:\mvc-node" ^&^& npm start
start "" cmd.exe /k cd /d "C:\Program Files\MongoDB\mongosh\bin" ^&^& mongosh.exe