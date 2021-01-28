const router = require('express').Router();
const games = require("../games")

router.get('/:id', (req, res) => {
    // req.params.id
    if (req.params.id in games) {
        const game = games[req.params.id]
        const { uuid, name, turnsCount, rollsCount, maxPlayers } = game;
        return res.send({ uuid, name, max: maxPlayers, turns: turnsCount, rolls: rollsCount, players: game.getPlayers().map(p => { return {name: p.name, uuid: p.id }}) })
    }
    console.log("redirect")
    res.redirect('/')
})

router.get('/', (req, res) => {
    res.send(Object.values(games).map(g => {
        return {
            name: g.name,
            uuid: g.uuid,
            players: g.getPlayers().length,
            max: g.maxPlayers,
            turns: g.turnsCount,
            rolls: g.rollsCount
        }}))
})

module.exports = router;