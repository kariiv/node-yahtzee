const shortid = require("shortid");
const cookieParser = require('cookie-parser');
const SocketIo = require('socket.io');
const express = require('express');
const app = express();
const server = require('http').createServer(app);

const io = SocketIo(server, { cors: {origin: "*"}} );
const ioIndex = io.of("/index");
const ioLobby = io.of("/lobby");
const ioPlay = io.of("/play");

require('./app/socket/home')(ioIndex);
require('./app/socket/lobby')(ioLobby, ioIndex);
require('./app/socket/play')(ioPlay);

app.use(cookieParser());
app.use((req,res, next)=> {
    if (!req.cookies.uuid) {
        let options = {
            maxAge: 1000 * 60 * 60 * 16, // 16h
            httpOnly: false,
            signed: false
        }
        res.cookie('uuid', shortid(), options) // options is optional
    }
    next()
})

app.use(express.static('static'));
app.get('/', (req, res) =>
    res.sendFile('./static/index.html', { root: __dirname }))

app.get('/lobby', (req, res) =>
    res.sendFile('./static/lobby.html', { root: __dirname }))

app.get('/play', (req, res) =>
    res.sendFile('./static/play.html', { root: __dirname }))

app.get('/scoreboard', (req, res) =>
    res.sendFile('./static/lastPage.html', { root: __dirname }))

app.get('/sorry', (req, res) =>
    res.sendFile('./static/400.html', { root: __dirname }))

app.use("/api/scoreboard", require('./app/routes/scoreboard'))
app.use("/api/lobby", require('./app/routes/lobby'))
app.use("/api/play", require('./app/routes/play'))

//const HOST = "192.168.8.104"
const HOST = "localhost";
const PORT = 3000;

server.listen(PORT, HOST, () => console.log(`Listening on ${HOST}:${PORT}...`));