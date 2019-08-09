const mariadb = require('mariadb');
const usernamesPool = mariadb.createPool({
    host: process.env.usernamesPool, 
    user:'zikri', 
    database:process.env.cacheDB, 
    password: process.env.MPWD,
    connectionLimit: 5
});

module.exports = usernamesPool;