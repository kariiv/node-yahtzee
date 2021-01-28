"use strict"

const table = document.getElementById("mp")
const nickname = document.getElementById("nickname")
const gameName = document.getElementById("name")
const turns = document.getElementById("turns")
const rolls = document.getElementById("rolls")
const maxPlayers = document.getElementById("players")
const pub = document.getElementById("public")
const pin = document.getElementById("pin")
const errorCreate = document.getElementById("errorCreate")
const errorJoin = document.getElementById("errorJoin")
document.getElementById("pinButton").onclick = joinPinGame
document.getElementById("newGame").onclick = createGame

if (localStorage.getItem('_n'))
    nickname.value = localStorage.getItem('_n')

let games = []  // { uuid: "31231fasdf", name: "TestGame1", players: 2, max: 4, turns: 3, rolls: 3}

const ERROR = {
    NICKNAME: 'You are missing Your Nickname!',
    GAMENAME: 'You are missing Game Name!',
    FULLGAME: 'Sry, the game is full!',
    PIN: 'You are missing Game Pin!',
}

function errorOnCreateGame(text) {
    errorCreate.hidden = false
    errorCreate.innerText = text
}
function errorOnJoinGame(text) {
    errorJoin.hidden = false
    errorJoin.innerText = text
}

function joinPinGame() {
    if (nickname.value) {
        if(pin.value) {
            ws.emit("pin", {
                pin: pin.value,
                nickname: nickname.value,
            })
        } else errorOnJoinGame(ERROR.PIN)

        localStorage.setItem('_n', nickname.value);
    } else {
        errorOnJoinGame(ERROR.NICKNAME)
    }
}
function createGame() {
    if (nickname.value ) {
        if (gameName.value) {
            if (turns.value && rolls.value && maxPlayers.value)
                ws.emit("new", {
                    turns: turns.value,
                    gameName: gameName.value,
                    rolls: rolls.value,
                    nickname: nickname.value,
                    max: maxPlayers.value,
                    public: pub.checked
                })
        }
        else
            errorOnCreateGame(ERROR.GAMENAME)
        localStorage.setItem('_n', nickname.value);
    } else
        errorOnCreateGame(ERROR.NICKNAME)
}
function joinGame(uuid) {
    if (nickname.value) {
        const filtered = games.filter(g=> g.uuid === uuid)
        if (filtered.length === 1) {
            if (filtered[0].players < filtered[0].max) {
                ws.emit("join", {gameUuid: uuid, nickname: nickname.value})
                localStorage.setItem('_n', nickname.value);
            } else
                errorOnJoinGame(ERROR.FULLGAME)
        }
    } else
        errorOnJoinGame(ERROR.NICKNAME)

}

function renderTable() {
    table.innerHTML = ''
    games.forEach( (g, i) => {
        const tr = document.createElement('tr')

        const tNr = document.createElement('th')
        tNr.innerText = (i + 1).toString();
        const tName = document.createElement('td')
        tName.innerText = g.name
        const tPlayers = document.createElement('td')
        tPlayers.innerText = g.players + "/" + g.max;
        const tTurns = document.createElement('td')
        tTurns.innerText = g.turns;
        const tRolls = document.createElement('td')
        tRolls.innerText = g.rolls
        const tJoin = document.createElement('td')

        const bJoin = document.createElement('a')
        bJoin.className = "btn btn-primary btn-sm" + (g.players >= g.max? " disabled": "")
        bJoin.textContent = "Join"
        bJoin.onclick = () => joinGame(g.uuid)
        tJoin.appendChild(bJoin);

        tr.appendChild(tNr)
        tr.appendChild(tName)
        tr.appendChild(tPlayers)
        tr.appendChild(tTurns)
        tr.appendChild(tRolls)
        tr.appendChild(tJoin)

        table.appendChild(tr)
    })

    if (games.length === 0)
        table.innerHTML = "<td colspan=\"6\">There are no games at the moment</td>"
}


let ws = io('/index');

ws.on('connect', () => {
    console.log("Socket connected");
});
ws.on('disconnect', () => {
    console.log("Socket disconnected");
});

ws.on('init', _games => { // [{name, players, max, rolls, turns}]
    games = _games
    renderTable()
});
ws.on('new', game => {
    console.log('New game', game.name)
    games.push(game)
    renderTable()
});
ws.on('del', uuid => {
    console.log('Game remove')
    games = games.filter(g => g.uuid !== uuid)
    renderTable()
});
ws.on('re', game => {
    let found = false
    for (let i = 0; i < games.length; i++) {
        if (games[i].uuid === game.uuid) {
            games[i] = game
            found = true
        }
    }
    if (!found) {
        console.log('Game not found in list, just adding new...')
        games.push(game)
    }
    renderTable()
});
ws.on("join", uuid => document.location.href = "/lobby?uuid=" + uuid )