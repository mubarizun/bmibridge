const mariadb = require('mariadb');
const usernamesPool = mariadb.createPool({
    host: '45.77.240.8', 
    user:'zikri', 
    database:'myCache', 
    password: process.env.MPWD,
    connectionLimit: 5
});

module.exports = usernamesPool;