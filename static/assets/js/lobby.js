"use strict"

const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get('uuid');

const playersElement = document.getElementById("players")
const counterElement = document.getElementById("counter")
const pinElement = document.getElementById("pin")
document.getElementById("start").onclick = () => ws.emit("start")

const JOIN_ANIMATION = "animate__rubberBand"
const LEAVE_ANIMATION = "animate__hinge"

let game = {}
let players = []

function updateCounter() {
    counterElement.innerHTML = players.length + '/' + (game.max || 0)
}

function removePlayerFromList(uuid) {
    const p = players.find(p=> p.uuid === uuid)
    p.el.classList.toggle(LEAVE_ANIMATION);

    setTimeout(() => {
        p.el.parentNode.removeChild(p.el)
    }, 1700)

    players = players.filter(p => p.uuid !== uuid)
    updateCounter()
}

function addPlayersToList() {
    players.forEach(player => {
        if (player.el) return
        const newPlayerElement = document.createElement('div')
        newPlayerElement.className = 'animate__animated names ' + JOIN_ANIMATION
        newPlayerElement.innerText = player.name
        player.el = newPlayerElement;
        playersElement.appendChild(newPlayerElement);
    })
    updateCounter()
}

let ws = io('/lobby?uuid=' + uuid);

ws.on('connect', function(){
    console.log("Socket connected");
});
ws.on('disconnect', function(){
    console.log("Socket disconnected");
    // window.location.replace("/");
});
ws.on('reason', function(e){
    window.location.replace("/sorry?e=" + e);
});
ws.on('init', _game => { // [ players: {name, uuid}]
    if (_game.pin) {
        pinElement.hidden = false
        pinElement.innerText = _game.pin
    }
    console.log(_game)
    players = _game.players
    delete _game["players"]
    game = _game
    addPlayersToList()
});
ws.on('join', player => {
    console.log('Player joined', player.name)
    players.push(player)
    addPlayersToList()
});
ws.on('leave', uuid => {
    console.log('Player left')
    removePlayerFromList(uuid)
});
ws.on('start', () => {
    console.log('start')
    window.location.replace('/play?uuid=' + uuid)
});
