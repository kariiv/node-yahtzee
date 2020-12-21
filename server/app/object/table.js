class Table {

    static rules = {
        "Ones": (table) => table.filter(x => x === 1).length,
        "Twos": (table) => table.filter(x => x === 2).length * 2,
        "Threes": (table) => table.filter(x => x === 3).length * 3,
        "Fours": (table) => table.filter(x => x === 4).length * 4,
        "Fives": (table) => table.filter(x => x === 5).length * 5,
        "Sixes": (table) => table.filter(x => x === 6).length * 6,
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

    constructor(rolls=3) {
        this.rolls = rolls;
        this.rolled = 0;

        this.rollable = 5;
        this.table = [];
        this.chosen = [];

        this.method = "";
        this.score = 0;
    }

    getRollsLeft() {
        return this.rolls - this.rolled;
    }

    roll() {
        if (this.rolls <= this.rolled) return false;
        if (this.rolled === 0) {
            for (let i = 5; i > 0; i--) {
                this.table.push({id: i, value: Math.floor(Math.random() * 6) + 1})
            }
        } else {
            // let number = this.rollable - this.chosen.length;
            console.log(this.table)
            this.table.forEach(dice => {
                dice.value = Math.floor(Math.random() * 6) + 1
            })
            // for (let i = number; i > 0; i--)
            //     this.table[i].value =
        }
        this.rolled += 1;
        return true;
    }

    diceClick(id) {
        if (this.isDiceInTable(id)) this.tableToChosen(id)
        else if (this.isDiceInChosen(id)) this.choseToTable(id)
        else console.log("Who lost the dice? xD")
    }


    isDiceInTable(id) {
        return this.table.filter(d => d.id === id).length === 1
    }
    isDiceInChosen(id) {
        return this.chosen.filter(d => d.id === id).length === 1
    }

    tableToChosen(id) {
        const dice = this.table.filter(d => d.id === id)[0]
        this.chosen.push(dice);
        this.table = this.table.filter(d => d.id !== id)
    }
    choseToTable(id) {
        const dice = this.chosen.filter(d => d.id === id)[0]
        this.table.push(dice);
        this.chosen = this.chosen.filter(d => d.id !== id)
    }


    getAllDicesValues() {
        return this.chosen.map(d => d.value).concat(this.table.map(d => d.value))
    }

    calculateRuleScore(rule) {
        return Table.rules[rule](this.getAllDicesValues());
    }

    selectRule(rule) {
        this.method = rule;
        this.score = this.calculateRuleScore(rule);
    }

}
module.exports = Table;