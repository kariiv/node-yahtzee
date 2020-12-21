"use strict"

const urlParams = new URLSearchParams(window.location.search);
const uuid = urlParams.get('uuid');

const playersElement = document.getElementById('players');
const scoreBoardElement = document.getElementById('scoreBoard');
const chosenDicesElement = document.getElementById('chosenDices');
const tableDicesElement = document.getElementById('tableDices');
const rollButton = document.getElementById('roll');
rollButton.onclick = handleRollClick;

let playersData = []; // [{ uuid, name, status, score:{"Ones":1} }, ]
let chosenDicesData = []; // [{id, value}, ]
let tableDicesData = []; // [{id, value}, ]
let currentPlayer = ''; // uuid
let rollsLeft = 0

const me = getCookie("uuid")


function wsOnInit(_game) {
    console.log(_game)
    chosenDicesData = _game.chosen
    tableDicesData = _game.table
    playersData = _game.players
    currentPlayer = _game.currentPlayer
    rollsLeft = _game.rolls

    changeAll();
}

function wsOnGameOver() {
    window.location.replace('/scoreboard')
}

function wsOnRoll(data) { // {table:[{id, value}], rolls}
    tableDicesData = data.table
    rollsLeft = data.rolls
    changeTableDices();
    makeScoreBoard();
    changePlayers()
}

function wsOnLeave(data) {
    // Todo: Set Next state from data
}

function wsOnJoin(data) {
    // Todo: Set Next state from data
}
function wsOnNext(data) {// { table, chosen, player: {uuid, status}, rolls }
    // Todo: Set Next state from data
    chosenDicesData = data.chosen
    tableDicesData = data.table
    for (let i = 0; i < playersData.length; i++) {
        if (playersData[i].uuid === data.player.uuid) {
            playersData[i].status = data.player.status
        }
    }
    currentPlayer = data.player.uuid;
    rollsLeft = data.rolls
    changeAll();
}

function wsOnTurn(data) { // {uuid, status, score:{"rule": "Ones", value:2}}
    for (let i = 0; i < playersData.length; i++) {
        if (playersData[i].uuid === data.uuid) {
            playersData[i].status = data.status
            playersData[i].score[data.score.rule] = data.score.value
        }
    }
    changePlayers()
    makeScoreBoard()
}
function wsOnSelect(data) { // {table, chosen}
    chosenDicesData = data.chosen
    tableDicesData = data.table

    console.log("Select data:", data)
    changeTableDices();
    changeChosenDices();
}

function handleRollClick() {
    ws.emit("roll")
}

function changeAll() {
    makeScoreBoard();
    changeChosenDices();
    changeTableDices();
    changePlayers();

    currentPlayer === me ? rollButton.hidden = false : rollButton.hidden = true
}

class Table {

    static FACE = ["Dice1.png", "Dice2.png", "Dice3.png", "Dice4.png", "Dice5.png", "Dice6.png"];

    static rules = {
        "Ones": (table) => table.filter(x => x===1).length,
        "Twos": (table) => table.filter(x => x===2).length * 2,
        "Threes": (table) => table.filter(x => x===3).length * 3,
        "Fours": (table) => table.filter(x => x===4).length * 4,
        "Fives": (table) => table.filter(x => x===5).length * 5,
        "Sixes": (table) => table.filter(x => x===6).length * 6,
        "Three of a kind": (table) => Table.countToList(table)[0] >= 3 ? Table.getSumOfList(table) : 0,
        "Four of a kind": (table) => Table.countToList(table)[0] >= 4 ? Table.getSumOfList(table) : 0,
        "Full house": (table) => Table.countToList(table)[0] === 3 && Table.countToList(table)[1] === 2 ? 25 : 0,
        "Small straight": (table) => Table.maxStraight(table) >= 4 ? 30 : 0,
        "Large straight": (table) => Table.maxStraight(table) >= 5 ? 40 : 0,
        "Joker": (table) => Table.getSumOfList(table),
        "Yahtzee": (table) => Table.countToList(table)[0] === 5 ? 50 : 0,
    }

    static maxStraight(numbers) {
        let sorted = [...numbers];
        sorted.sort((x, y) => x - y);
        let max = 1
        let conseq = 1;
        for (let idx = 1; idx < sorted.length ; idx++) {
            if (sorted[idx] === sorted[idx-1] + 1) conseq++;
            else conseq = 1;
            if (conseq > max) max = conseq;
        }
        return max;
    }

    static getSumOfList(numbers) {
        return numbers.reduce((a, b) => a + b, 0)
    }

    static countToList(numbers) {
        const nrDict = {}
        for ( let nr of numbers) nrDict[nr] = nrDict[nr] ? nrDict[nr] + 1 : 1;

        const s = Object.values(nrDict);
        s.sort((x, y) => y - x);
        return s;
    }

    static getImage(nr) {
        return Table.FACE[nr-1];
    }

    static calculateScore(rule, dices) {
        return Table.rules[rule](dices.map(d => d.value))
    }
}

function makeScoreBoard() {
    scoreBoardElement.innerHTML = "";

    const header = document.createElement('tr');
    header.appendChild(document.createElement("th"))

    playersData.forEach((x) => {
        const col = document.createElement("th")
        col.innerHTML = x.name;
        header.appendChild(col);
    });
    const thead = document.createElement("thead")
    thead.appendChild(header)

    const tbody = document.createElement("tbody")

    Object.keys(Table.rules).forEach((x) => {
        const row = document.createElement('tr');
        const column = document.createElement('td');
        column.innerHTML = x;
        row.appendChild(column);

        playersData.forEach((player) => {
            const scoreElement = document.createElement('td');
            let score = x in player.score? player.score[x] : 0;

            if (score === 0){
                 if (player.uuid === me && me === currentPlayer) {
                     score = Table.calculateScore(x, chosenDicesData.concat(tableDicesData));
                     if (score) {
                         scoreElement.classList.add("score-me");
                         scoreElement.onclick = () => ws.emit("select", x);
                     }
                } else if (player.uuid === currentPlayer) {
                    score = Table.calculateScore(x, chosenDicesData.concat(tableDicesData));
                     if (score) scoreElement.classList.add("score-op");
                }
            } else
                scoreElement.classList.add("score-el");

            if (score) scoreElement.innerHTML = score;
            row.appendChild(scoreElement);
        });
        tbody.appendChild(row);
    });

    const total = document.createElement('tr');
    const totalLabel = document.createElement('td');
    totalLabel.className = "total"
    totalLabel.innerHTML = "TOTAL";
    total.appendChild(totalLabel)

    playersData.forEach((player) => {
        const totalScore = document.createElement('td');
        totalScore.className = "total"
        let score = 0
        Object.values(player.score).forEach(s => score += s)
        totalScore.innerHTML = score;
        total.appendChild(totalScore);
    });

    scoreBoardElement.appendChild(thead);
    scoreBoardElement.appendChild(tbody);
    scoreBoardElement.appendChild(total);
}

function changeChosenDices() {
    changeDiceList(chosenDicesData, chosenDicesElement)
}
function changeTableDices() {
    changeDiceList(tableDicesData, tableDicesElement)
}

function changeDiceList(data, element) {
    element.innerHTML = "";

    data.forEach(dice => {
        const diceContainer = document.createElement("span");
        diceContainer.onclick = () => ws.emit("dice", dice.id);

        const image = document.createElement("img")
        image.alt = dice.value
        image.src = "/assets/images/"+ Table.getImage(dice.value);
        image.height = 50;

        diceContainer.appendChild(image);
        element.appendChild(diceContainer);
    });
}

function changePlayers() {
    playersElement.innerHTML = playersData.map(p => makeAvatar(p)).reduce((a, b) => a + b, "")
}

function makeAvatar(player) {
    return `<div class="chip mb-2">
<img src="${initial(player.uuid === currentPlayer, rollsLeft)}" alt="Person" width="96" height="96">${player.name}</div>
</div>`
}

function initial(status, number) {
    var canvas = document.createElement('canvas');
    canvas.style.display = 'none';
    canvas.width = '96';
    canvas.height = '96';
    document.body.appendChild(canvas);
    var context = canvas.getContext('2d');
    status? context.fillStyle = "#630f80" : context.fillStyle = "#f7dbb4";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = "60px Arial";
    context.fillStyle = "#eee";
    if (status) {
        if (number > 9) {
            context.fillText(number.toString(), 13, 68);
        } else {
            context.fillText(number.toString(), 31, 68);
        }
    }

    var data = canvas.toDataURL();
    document.body.removeChild(canvas);
    return data;
}


function getCookie(name) {
    // Split cookie string and get all individual name=value pairs in an array
    var cookieArr = document.cookie.split(";");

    // Loop through the array elements
    for(var i = 0; i < cookieArr.length; i++) {
        var cookiePair = cookieArr[i].split("=");
        /* Removing whitespace at the beginning of the cookie name
        and compare it with the given string */
        if(name === cookiePair[0].trim()) {
            // Decode the cookie value and return
            return decodeURIComponent(cookiePair[1]);
        }
    }
    // Return null if not found
    return null;
}

const ws = io('/play?uuid=' + uuid);

ws.on('connect', () => {
    console.log("Socket connected");
});

ws.on('disconnect', function(){
    console.log("Socket disconnected");
});
ws.on('reason', function(e){
    window.location.replace("/sorry?e=" + e);
});
ws.on('init', wsOnInit);
ws.on('roll', wsOnRoll);
ws.on('next', wsOnNext);
ws.on('turn', wsOnTurn);
ws.on('select', wsOnSelect);
ws.on('join', wsOnJoin);
ws.on('leave', wsOnLeave);
ws.on('gameover', wsOnGameOver)

// wsOnInit({chosen: [], table:[], currentPlayer: 'Sizsadsm', rolls:3, players: [{uuid:'Sizsadsm', name: "SyrStyle", status: "playing", score: {} }, {uuid:'S7d8hsda', name: "Mr_Toruabi", status: "playing", score: {} }] })