const Table = require('./table')
const shortid = require("shortid")
const Player = require("./player")
const games = require('../games');
const fs = require('fs');

class Game {

    static status = {
        WAITING: "waiting",
        PLAYING: "playing",
        FINISHED: "finished"
    }

    constructor(name= "undefined", turns=3, rolls=3, maxPlayers=4, pub = true) {
        this.uuid = shortid();
        this.name = name;
        this.turnsCount = turns;
        this.rollsCount = rolls;
        this.players = [];
        this.maxPlayers = maxPlayers;
        this.currentPlayer = null;
        this._status = Game.status.WAITING;
        this.whitelist = [] // Joining players
        this.ioIndex = null;
        this.ioPlay = null;
        this.public = pub;
        this.pin = '';
        this.timeout = null;
    }
    setPin(pin) {
        this.pin = pin
    }
    getPin() {
        return this.pin
    }
    isPublic() {
        return this.public
    }
    setIoIndex(io) {
        this.ioIndex = io;
    }
    setIoPlay(io) {
        this.ioPlay = io;
    }
    isWhitelisted(uuid) {
        return this.whitelist.filter(p => p.id === uuid).length === 1
    }
    isPlayer(uuid) {
        return this.players.filter(p => p.id === uuid).length === 1
    }
    setStatus(status) {
        this._status = status
    }
    getStatus() {
        return this._status
    }
    getPlayers() {
        return this.players;
    }
    getPlayer(uuid) {
        const filtered = this.players.filter(p => p.id === uuid)
        return filtered.length === 1 ? filtered[0] : undefined;
    }
    playerLeftGame(uuid) {
        if (this._status === Game.status.WAITING) {
            this.players = this.players.filter(p => p.getId() !== uuid)
            if (this.isPublic()) this.ioIndex.emit("re", this.getValue())
            if (this.players.length === 0)
                this.timeout = setTimeout(() => {
                    this.ioIndex.emit("del", this.getUUID())
                    delete games[this.getUUID()]
                }, 2000)
        }
        else if (this._status === Game.status.PLAYING) {
            const player = this.players.filter(p => p.getId() === uuid)[0]
            player.setStatus(Player.status.LEFT)
        }
    }
    addWhitelist(player) {
        const filtered = this.whitelist.filter(p => p.id === player.id)
        if (filtered.length === 0) {
            this.whitelist.push(player)
            clearTimeout(this.timeout)
            return true
        }
        return false
    }
    addPlayer(player) {
        const filtered = this.players.filter(p => p.id === player.id)
        if (filtered.length === 0) {
            this.players.push(player)
            return true
        }
        return false
    }

    whitelistedToPlayerList(uuid) {
        const player = this.whitelist.filter(p => p.id === uuid)[0]
        this.players.push(player);
        this.whitelist = this.whitelist.filter(p => p.id !== uuid)
        player.setStatus(Player.status.CONNECTED)
        if (this.isPublic()) this.ioIndex.emit("re", this.getValue())
        return player;
    }
    canJoin() {
        return this.players.length < this.maxPlayers && this.getStatus() === Game.status.WAITING
    }

    setGameName(name) {
        this.gameName = name;
    }
    getGameName() {
        return this.gameName;
    }
    getUUID() {
        return this.uuid;
    }

    canStart() {
        return this.players.length > 1
    }
    startGame() {
        this.setStatus(Game.status.PLAYING)
        if (this.isPublic()) this.ioIndex.emit("del", this.uuid)
        this.nextRound(true)
    }

    nextRound(first=false) {
        this.setNextPlayer(first);
        if (this.isFinished()) this.finishGame();
        else {
            const uuid = this.currentPlayer.getId()
            const status = this.currentPlayer.getStatus()
            const chosen = this.currentPlayer.currentTable.chosen
            const table = this.currentPlayer.currentTable.table
            const rolls = this.currentPlayer.currentTable.getRollsLeft()
            this.ioPlay.emit("next", {player:{uuid, status}, table, chosen, rolls})
        }
    }

    isFinished() {
        return this.currentPlayer.tables.length === this.turnsCount;
    }

    finishGame() {
        this.setStatus(Game.status.FINISHED)
        this.ioPlay.emit("gameover")
        this.saveGameDataToLocalStorage();
        delete games[this.getUUID()]
    }

    saveGameDataToLocalStorage() {
        const players = [];
        this.players.forEach((x) => players.push({n: x.name, s: x.calculateScore()}));
        const currentGameData = {
            t: Date.now(),
            r: this.turnsCount,
            p: players
        }
        fs.readFile('./app/scoreboard.json', 'utf8', (err, data) => {
            if (err) throw err;
            let games = JSON.parse(data);
            games.push(currentGameData)

            let json = JSON.stringify(games);
            fs.writeFileSync('./app/scoreboard.json', json);
        });
    }

    setNextPlayer(first=false) {
        if (first)
            this.currentPlayer = this.players[0]
        else
            this.currentPlayer = this.players[(this.players.findIndex((x) => x.id === this.currentPlayer.id) + 1) % this.players.length];
        this.currentPlayer.addTable(new Table(this.rollsCount));
    }
    selectDice(player, dice) {
        if (player === this.currentPlayer) {
            this.currentPlayer.currentTable.diceClick(dice)
            this.ioPlay.emit('select', {table:this.currentPlayer.currentTable.table, chosen:this.currentPlayer.currentTable.chosen})
        }
        return false
    }
    roll(player) {
        if (player === this.currentPlayer)
            if (this.currentPlayer.currentTable.roll())
                this.ioPlay.emit('roll', {table:this.currentPlayer.currentTable.table, rolls: this.currentPlayer.currentTable.getRollsLeft()})
    }
    selectRule(player, rule) {
        if (player === this.currentPlayer && this.currentPlayer.canSelectRule()) {
            this.currentPlayer.selectRule(rule);
            this.currentPlayer.setStatus(Player.status.PLAYING)
            const { method, score } = this.currentPlayer.currentTable
            this.ioPlay.emit('turn', { uuid: this.currentPlayer.getId(),status: this.currentPlayer.getStatus(), score: {rule: method, value: score}  })
            this.nextRound();
            return true
        }
    }

    getValue() {
        const val = { uuid: this.uuid, name: this.name, turns: this.turnsCount, rolls: this.rollsCount, max: this.maxPlayers, players: this.players.length }
        if (!this.isPublic())
            val.pin = this.getPin()
        return val
    }
}

module.exports = Game;