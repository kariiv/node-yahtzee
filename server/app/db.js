const mysql      = require('mysql');
const connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'yahtzee'
});

connection.connect();

// connection.end();

module.exports = () => {
    return connection;
}