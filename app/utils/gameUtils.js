const games = require('../games');

function getExistingPins() {
  return Object.values(games).filter(g => !g.isPublic() && !!game.getPin()).map(g => g.getPin());
}

function pinGenerator(existing) {
  while (true) {
    let seq = (Math.floor(Math.random() * 9999)).toString().padStart(4, '0');
    if (existing.includes(seq)) continue;
    return seq;
  }
}

function generatePin() {
  return pinGenerator(getExistingPins());
}

module.exports = {
  generatePin
}