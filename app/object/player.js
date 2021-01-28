class Player {

    static status = {
        WHITELISTED: "whitelist",
        CONNECTED: "connected",
        PLAYING: "playing",
        ROLLING: "rolling",
        LEFT: "left",
        KICKED: "finished"
    }

    constructor(id, name) {
        this.id = id;
        this.score = 0;
        this.name = name;
        this.tables = [];
        this.currentTable = null;
        this._status = Player.status.WHITELISTED
    }
    getId() {
       return this.id;
    }
    getName() {
        return this.name;
    }
    setStatus(status) {
        this._status = status
    }
    getStatus() {
        return this._status
    }
    addTable(table) {
        this.currentTable = table;
    }
    calculateScore() {
        let score = 0;
        for (let table of this.tables) score += table.score;
        return score;
    }
    getUnavailableRules() {
        return this.tables.map(t => t.method);
    }
    canSelectRule() {
        return !this.currentTable.method;
    }
    selectRule(rule) {
        this.currentTable.selectRule(rule);
        this.tables.push(this.currentTable);
    }

    isRuleAvailable(rule) {
        return this.tables.filter(t => t.method === rule).length === 0
    }
    getScoresAsObj() {
        const scores = {}
        this.tables.forEach(t => scores[t.method] = t.score)
        return scores;
    }

    getValue() {
        return { uuid: this.id, name: this.name }
    }
}

module.exports = Player;