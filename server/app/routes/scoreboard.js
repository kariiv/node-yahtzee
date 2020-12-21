const router = require('express').Router();
const path = require('path');

router.get("/", (req, res) => {
    res.sendFile(path.resolve('app/scoreboard.json'))
})

module.exports = router;