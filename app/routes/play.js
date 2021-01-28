const router = require('express').Router();
const games = require('../games');

router.get("/:uuid", (req, res) => {
    // Todo: mangu full stat
    const gameUuid = req.params.uuid;

    if (!(gameUuid in games))
        return res.send({})
    const game = games[req.params.uuid]
    const { uuid, roundCount, rollsCount, maxPlayers } = game;
    res.send({uuid, round:roundCount, rolls:rollsCount, max:maxPlayers, players:game.getPlayers().length })
})


module.exports = router;