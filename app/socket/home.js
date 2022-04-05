const Game = require('../object/game');
const {generatePin} = require('../utils/gameUtils');
const {getCookie} = require('../utils/cookieUtils');
const Player = require('../object/player');
const games = require('../games');

const MESSAGE = {
  NEW: 'new',
  JOIN: 'join',
  PIN: 'pin',
  INIT: 'init',
}

module.exports = (io) => {
  io.on('connection', socket => {
    console.log("Connected To Index")

    socket.on(MESSAGE.NEW, data => {
      const { turns, gameName, rolls, nickname, max, public:pub } = data
      if (!turns || !gameName || !rolls || !nickname || !max) return false
      const newGame = new Game(gameName, parseInt(turns) || 3, parseInt(rolls), max, pub);
      if (!newGame.isPublic()) newGame.setPin(generatePin());

      const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
      newGame.addWhitelist(new Player(playerUuid, nickname))

      const { uuid, name, turnsCount, rollsCount, maxPlayers } = newGame;
      games[newGame.getUUID()] = newGame;

      if (newGame.isPublic()) io.emit(MESSAGE.NEW, { uuid, name, players: 0, max: maxPlayers, turns: turnsCount, rolls: rollsCount})
      socket.emit(MESSAGE.JOIN, uuid)
    })

    socket.on(MESSAGE.PIN, data => { // { pin:"dasd a", nickname: "Kalas" }
      const { pin, nickname } = data
      const pinGames = Object.values(games).filter(g => !g.isPublic() && g.getPin() === pin);
      if (pinGames.length !== 1) return;
      const game = pinGames[0];
      const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
      if (!(nickname || playerUuid) || !game.canJoin()) return
      game.addWhitelist(new Player(playerUuid, nickname))
      socket.emit(MESSAGE.JOIN, game.getUUID())
    })

    socket.on(MESSAGE.JOIN, data => { // { gameUuid:"dasd a", nickname: "Kalas" }
      const { gameUuid, nickname } = data
      if (!(gameUuid in games)) return;
      const game = games[gameUuid];

      const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
      if (!(nickname || playerUuid) || !game.canJoin()) return
      game.addWhitelist(new Player(playerUuid, nickname))
      socket.emit(MESSAGE.JOIN, gameUuid)
    })

    socket.emit(MESSAGE.INIT, Object.values(games).filter(game => game.getStatus() === Game.status.WAITING && game.isPublic()).map(g=> g.getValue()))

    socket.on('disconnect', () => {
      console.log("Disconnected from lobby")
    });
  });
}
