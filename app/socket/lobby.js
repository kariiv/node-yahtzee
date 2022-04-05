const {getCookie} = require('../utils/cookieUtils');
const games = require('../games');
const Game = require('../object/game');

const MESSAGE = {
  INIT: 'init',
  JOIN: 'join',
  REASON: 'reason',
  START: 'start',
  LEAVE: 'leave',
  DISCONNECT: 'disconnect'
}

const REASON = {
  GAME_NOT_FOUND: 0,
  PLAYER_NOT_FOUND: 1,
  GAME_FULL: 2,
  NOT_WHITELISTED: 3,
}

module.exports = (io, ioHome) => {
  io.on('connection', socket => {
    const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
    const gameUuid = socket.handshake.query.uuid
    const room = "lobby_" + gameUuid

    console.log("Connected To Lobby", room)

    const reject = (reason) => {
      socket.emit(MESSAGE.REASON, reason);
      socket.disconnect();
    }

    if (!(gameUuid in games))
      return reject(REASON.GAME_NOT_FOUND)

    const game = games[gameUuid]
    if (game.isPlayer(playerUuid))
      return reject(REASON.PLAYER_NOT_FOUND);

    if (!game.canJoin())
      return reject(REASON.GAME_FULL);

    if (!game.isWhitelisted(playerUuid))
      return reject(REASON.NOT_WHITELISTED);

    const player = game.whitelistedToPlayerList(playerUuid)
    io.to(room).emit(MESSAGE.JOIN, player.getValue());
    if (game.isPublic()) ioHome.emit("re", game.getValue())
    socket.join(room);
    const gameData = game.getValue();
    gameData.players = game.players.map(p => p.getValue());
    socket.emit(MESSAGE.INIT, gameData);

    socket.on(MESSAGE.START, () => {
      if (!game.canStart()) return;
      game.startGame();
      if (game.isPublic()) ioHome.emit("del", game.getUUID());
      io.to(room).emit(MESSAGE.START, '');
    });

    socket.on(MESSAGE.DISCONNECT, () => {
      game.playerLeftGame(playerUuid);
      if (game.getStatus() === Game.status.WAITING){
        if (game.isPublic()) ioHome.emit("re", this.getValue());
        if (game.getPlayers().length === 0)
          setTimeout(() => {
            if (game.getPlayers() !== 0) return;
            ioHome.emit("del", this.getUUID())
            delete games[this.getUUID()]
          }, 2000);
      }
      io.to(room).emit(MESSAGE.LEAVE, playerUuid);
      console.log("Disconnected from lobby");
    });
  });
}
