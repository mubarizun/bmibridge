const mariadb = require('mariadb')
const pool = mariadb.createPool({
    host: '45.77.251.187', 
    user:'bmiadmin', 
    database:'01857ed27077f8a2', 
    password: process.env.MPWD,
    connectionLimit: 5
})
// GRANT ALL PRIVILEGES ON 3b8ff47f9956d31e.* TO 'qel'@'180.245.188.113' IDENTIFIED BY 'qel123' WITH GRANT OPTION

module.exports = pool