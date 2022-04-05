const {getCookie} = require('../utils/cookieUtils');
const games = require('../games');
const Player = require('../object/player');

const MESSAGE = {
  INIT: 'init',
  ROLL: 'roll',
  DICE: 'dice',
  SELECT: 'select',
  REASON: 'reason',
  JOIN: 'join',
  LEAVE: 'leave',
  TURN: 'turn',
  NEXT: 'next',
  GAME_OVER: 'gameover',
  DISCONNECT: 'disconnect'
}

const REASON = {
  GAME_NOT_FOUND: 0,
  PLAYER_NOT_FOUND: 1,
}

module.exports = (io) => {
  io.on('connection', socket => {
    const playerUuid = getCookie("uuid", socket.handshake.headers["cookie"])
    const gameUuid = socket.handshake.query.uuid
    const room = "play_" + gameUuid

    console.log("Connected To play", room)

    const reject = (reason) => {
      socket.emit(MESSAGE.REASON, reason);
      socket.disconnect();
    }

    if (!(gameUuid in games))
      return reject(REASON.GAME_NOT_FOUND)

    const game = games[gameUuid]
    if (game.isPlayer(playerUuid))
      return reject(REASON.PLAYER_NOT_FOUND);

    const player = game.getPlayer(playerUuid)
    player.setStatus(Player.status.PLAYING)
    socket.join(room)
    io.to(room).emit(MESSAGE.JOIN, playerUuid)

    socket.on(MESSAGE.SELECT, (rule) => {
      const res = game.selectRule(player, rule);
      if (!res) return;
      io.emit(MESSAGE.TURN, res);
      const nextRes = game.nextRound()
      if (!nextRes) {
        game.finishGame();
        io.emit(MESSAGE.GAME_OVER)
        return;
      }
      io.emit(MESSAGE.NEXT, nextRes);
    });
    socket.on(MESSAGE.ROLL, () => {
      const res = game.roll(player);
      if (!res) return;
      io.emit(MESSAGE.ROLL, res);
    });
    socket.on(MESSAGE.DICE, (dice) => {
      const res = game.selectDice(player, dice);
      if (!res) return;
      io.emit(MESSAGE.SELECT, res);
    });

    socket.on(MESSAGE.DISCONNECT, () => {
      game.playerLeftGame(playerUuid);
      io.to(room).emit(MESSAGE.LEAVE, playerUuid)
      console.log("Disconnected from play")
    });

    const {chosen, table} = game.currentPlayer.currentTable
    const players = game.players.map(p => {
      return { uuid: p.getId(), name: p.getName(), status:p.getStatus(), score: p.getScoresAsObj() }
    })

    socket.emit(MESSAGE.INIT, { chosen, table, rolls: game.currentPlayer.currentTable.getRollsLeft(), currentPlayer: game.currentPlayer.getId(), players })
  });
}
