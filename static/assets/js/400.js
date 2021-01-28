const urlParams = new URLSearchParams(window.location.search);
const e = parseInt(urlParams.get('e'));

const mainEl = document.getElementById("main")
const descriptionEl = document.getElementById("description")

const reasons = [
    { main: "Game is not found!", description: "Create new game or join with others on Home page"},
    { main: "Looks like you are already playing!", description: "Sorry, cannot connect to the same game within same browser"},
    { main: "Game is already full", description: "Pick another game or start new game"},
    { main: "Looks like you jumped right into game!", description: "Sorry, you need to join on Home page"},
]

mainEl.innerText = reasons[e].main
descriptionEl.innerText = reasons[e].description