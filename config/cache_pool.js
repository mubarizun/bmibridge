const mariadb = require('mariadb')
const pool = mariadb.createPool({
    host: '45.77.251.187', 
    user:'bmiadmin', 
    database:'myCache', 
    password: process.env.MPWD,
    connectionLimit: 5
})

module.exports = pool