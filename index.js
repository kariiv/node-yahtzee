const express = require('express')
const app = express();
const server = require('http').createServer(app);

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const io = require('socket.io')(server, { cors: {origin: "*"}} );
const shortid = require("shortid")

const ioIndex = io.of("/index");
const ioLobby = io.of("/lobby");
const ioPlay = io.of("/play");

const games = require('./app/games');
const Player = require("./app/object/player");
const Game = require("./app/object/game");

function getCookie(cname, cookie) {
    const name = cname + "=";
    const decodedCookie = decodeURIComponent(cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function generatePin() {
    while (true) {
        var seq = (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
        console.log(seq);
        for (const game of Object.values(games)) {
            if (!game.isPublic())
                if (game.getPin() === seq)
                    continue
        }
        return seq.toString();
    }
}


ioIndex.on('connection', socket => {
    console.log("Connected To Index")

    socket.on("new", data => {
        const { turns, gameName, rolls, nickname, max, public:pub } = data
        if (!turns || !gameName || !rolls || !nickname || !max) return false
        const newGame = new Game(gameName, parseInt(turns) || 3, parseInt(rolls), max, pub);
        if (!newGame.isPublic()) newGame.setPin(generatePin())
        newGame.setIoIndex(ioIndex)
        newGame.setIoPlay(ioPlay)

        const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
        newGame.addWhitelist(new Player(playerUuid, nickname))

        const { uuid, name, turnsCount, rollsCount, maxPlayers } = newGame;
        games[newGame.getUUID()] = newGame;

        if (newGame.isPublic()) ioIndex.emit("new", { uuid, name, players: 0, max: maxPlayers, turns: turnsCount, rolls: rollsCount})
        socket.emit("join", uuid)
    })

    socket.on("pin", data => { // { pin:"dasd a", nickname: "Kalas" }
        const { pin, nickname } = data
        let game = Object.values(games).filter(g => !g.isPublic() && g.getPin() === pin)
        if (game.length === 1) {
            game = game[0]
            const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
            if (!(nickname || playerUuid) || !game.canJoin()) return
            game.addWhitelist(new Player(playerUuid, nickname))
            socket.emit("join", game.getUUID())
        }
    })

    socket.on("join", data => { // { gameUuid:"dasd a", nickname: "Kalas" }
        const { gameUuid, nickname } = data
        if (gameUuid in games) {
            const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
            console.log(playerUuid)
            if (!(nickname || playerUuid) || !games[gameUuid].canJoin()) return
            games[gameUuid].addWhitelist(new Player(playerUuid, nickname))
            socket.emit("join", gameUuid)
        }
    })

    socket.emit("init", Object.values(games).filter(game => game.getStatus() === Game.status.WAITING && game.isPublic()).map(g=> g.getValue()) )

    // ioIndex.emit("del")
    // ioIndex.emit("re")

    socket.on('disconnect', () => {
        console.log("Disconnected from lobby")
    });
});




ioLobby.on('connection', socket => {
    const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
    const gameUuid = socket.handshake.query.uuid
    const room = "lobby_" + gameUuid

    console.log("Connected To Lobby", room)

    if (!(gameUuid in games)) {
        socket.emit('reason', 0);
        socket.disconnect();
        return
    }
    const game = games[gameUuid]
    if (game.isPlayer(playerUuid)) {
        socket.emit('reason', 1);
        socket.disconnect();
        return
    } else if (!game.canJoin()) {
        socket.emit('reason', 2);
        socket.disconnect();
        return
    } else if (game.isWhitelisted(playerUuid)) {
        const player = games[gameUuid].whitelistedToPlayerList(playerUuid)
        ioLobby.to(room).emit("join", player.getValue())
        socket.join(room)
        const game = games[gameUuid].getValue()
        game.players = games[gameUuid].players.map(p => p.getValue())
        socket.emit("init", game)
    } else {
        socket.emit('reason', 3);
        socket.disconnect();
        return
    }

    socket.on("start", () => {
        if (game.canStart()) {
            game.startGame()
            ioLobby.to(room).emit("start", '')
        }
    })
    socket.on('disconnect', () => {
        game.playerLeftGame(playerUuid)
        ioLobby.to(room).emit("leave", playerUuid)
        console.log("Disconnected from lobby")
    });
});


ioPlay.on('connection', socket => {
    const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
    const gameUuid = socket.handshake.query.uuid
    const room = "play_" + gameUuid

    console.log("Connected To play", room)

    if (!(gameUuid in games)) {
        socket.emit('reason', 0);
        socket.disconnect();
        return
    }
    const game = games[gameUuid]
    if (!game.isPlayer(playerUuid)) {
        socket.emit('reason', 0);
        socket.disconnect();
        return
    }
    const player = game.getPlayer(playerUuid)
    player.setStatus(Player.status.PLAYING)
    socket.join(room)
    ioPlay.to(room).emit("join", playerUuid)

    socket.on("select", (rule) => game.selectRule(player, rule))
    socket.on("roll", () => {game.roll(player)})
    socket.on("dice", (dice) => {game.selectDice(player, dice)})

    socket.on('disconnect', () => {
        ioPlay.to(room).emit("leave", playerUuid)
        console.log("Disconnected from play")
    });
    const {chosen, table} = game.currentPlayer.currentTable
    const players = game.players.map(p => {
        return { uuid: p.getId(), name: p.getName(), status:p.getStatus(), score: p.getScoresAsObj() }
    })

    socket.emit('init', { chosen, table, rolls: game.currentPlayer.currentTable.getRollsLeft(), currentPlayer: game.currentPlayer.getId(), players })
});

app.use((req,res, next)=> {
    // read cookies
    let uuid = req.cookies.uuid
    if (uuid === undefined) {
        let options = {
            maxAge: 1000 * 60 * 60, // would expire after 60 minutes
            httpOnly: false, // The cookie only accessible by the web server
            signed: false // Indicates if the cookie should be signed
        }
        // Set cookie
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
const HOST = "127.0.0.1"
const PORT = 80

server.listen(PORT, HOST, (a,b) => {
	console.log(`Listening on ${HOST}:${PORT}...`)
});