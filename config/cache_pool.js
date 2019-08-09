const mariadb = require('mariadb')
const pool = mariadb.createPool({
    host: process.env.cacheHost, 
    user:'bmiadmin', 
    database: process.env.cacheDB, 
    password: process.env.MPWD,
    connectionLimit: 5
})

module.exports = pool