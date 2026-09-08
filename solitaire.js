class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
    }
    
    getValue() {
        const values = {'A': 1, 'J': 11, 'Q': 12, 'K': 13};
        return values[this.rank] || parseInt(this.rank);
    }
    
    getColor() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }
    
    initializeDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    draw() {
        return this.cards.pop();
    }
}

class Solitaire {
    constructor() {
        this.deck = new Deck();
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];
        this.initialize();
    }
    
    initialize() {
        // タブロー初期化
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.draw();
                card.faceUp = (row === col);
                this.tableau[col].push(card);
            }
        }
        
        this.stock = this.deck.cards;
    }
    
    drawFromStock() {
        if (this.stock.length === 0) {
            this.stock = this.waste.reverse();
            this.waste = [];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
    }
    
    canMoveInTableau(sourceCard, targetCard) {
        if (!targetCard) return sourceCard.rank === 'K';
        return sourceCard.getColor() !== targetCard.getColor() &&
               sourceCard.getValue() === targetCard.getValue() - 1;
    }
    
    canMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        if (foundation.length === 0) return card.rank === 'A';
        const topCard = foundation[foundation.length - 1];
        return card.suit === topCard.suit && card.getValue() === topCard.getValue() + 1;
    }
    
    moveInTableau(fromCol, toCol) {
        const fromPile = this.tableau[fromCol];
        const toPile = this.tableau[toCol];
        
        if (fromPile.length === 0) return false;
        
        const sourceCard = fromPile[fromPile.length - 1];
        const targetCard = toPile.length > 0 ? toPile[toPile.length - 1] : null;
        
        if (this.canMoveInTableau(sourceCard, targetCard)) {
            toPile.push(fromPile.pop());
            if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
                fromPile[fromPile.length - 1].faceUp = true;
            }
            return true;
        }
        return false;
    }
    
    moveToFoundation(fromType, fromIndex) {
        let card = null;
        
        if (fromType === 'waste' && this.waste.length > 0) {
            card = this.waste[this.waste.length - 1];
        } else if (fromType === 'tableau' && this.tableau[fromIndex].length > 0) {
            card = this.tableau[fromIndex][this.tableau[fromIndex].length - 1];
        }
        
        if (!card) return false;
        
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                if (fromType === 'waste') {
                    this.waste.pop();
                } else {
                    this.tableau[fromIndex].pop();
                    if (this.tableau[fromIndex].length > 0 && !this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp) {
                        this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp = true;
                    }
                }
                this.foundations[i].push(card);
                return true;
            }
        }
        return false;
    }
    
    isWon() {
        return this.foundations.every(f => f.length === 13);
    }
}

class GameUI {
    constructor() {
        this.game = new Solitaire();
        this.init();
    }
    
    init() {
        this.render();
    }
    
    render() {
        const container = document.getElementById('game-container');
        container.innerHTML = '';
        
        // ストック＆ウェイスト
        const topArea = document.createElement('div');
        topArea.className = 'top-area';
        
        const stockDiv = document.createElement('div');
        stockDiv.className = 'pile stock';
        stockDiv.id = 'stock';
        stockDiv.textContent = this.game.stock.length > 0 ? `📦 ${this.game.stock.length}` : '空';
        stockDiv.onclick = () => this.onStockClick();
        topArea.appendChild(stockDiv);
        
        const wasteDiv = document.createElement('div');
        wasteDiv.className = 'pile waste';
        wasteDiv.id = 'waste';
        if (this.game.waste.length > 0) {
            const card = this.game.waste[this.game.waste.length - 1];
            wasteDiv.innerHTML = this.renderCardHTML(card);
        } else {
            wasteDiv.textContent = '空';
        }
        topArea.appendChild(wasteDiv);
        
        container.appendChild(topArea);
        
        // ファンデーション
        const foundationArea = document.createElement('div');
        foundationArea.className = 'foundation-area';
        const suits = ['♠', '♥', '♦', '♣'];
        
        this.game.foundations.forEach((foundation, i) => {
            const div = document.createElement('div');
            div.className = 'pile foundation';
            if (foundation.length > 0) {
                const card = foundation[foundation.length - 1];
                div.innerHTML = this.renderCardHTML(card);
            } else {
                div.innerHTML = `<div class="empty-foundation">${suits[i]}</div>`;
            }
            foundationArea.appendChild(div);
        });
        
        container.appendChild(foundationArea);
        
        // タブロー
        const tableauArea = document.createElement('div');
        tableauArea.className = 'tableau-area';
        
        this.game.tableau.forEach((column, colIndex) => {
            const colDiv = document.createElement('div');
            colDiv.className = 'tableau-column';
            colDiv.id = `tableau-${colIndex}`;
            
            column.forEach((card, cardIndex) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card ${!card.faceUp ? 'face-down' : 'face-up'}`;
                
                if (card.faceUp) {
                    cardDiv.innerHTML = `
                        <div class="card-rank">${card.rank}</div>
                        <div class="card-suit" style="color: ${card.getColor()}">${card.suit}</div>
                    `;
                } else {
                    cardDiv.textContent = '🂠';
                }
                
                cardDiv.onclick = () => this.onCardClick(colIndex, cardIndex);
                colDiv.appendChild(cardDiv);
            });
            
            tableauArea.appendChild(colDiv);
        });
        
        container.appendChild(tableauArea);
        
        if (this.game.isWon()) {
            setTimeout(() => alert('🎉 ゲーム完了！おめでとうございます！'), 100);
        }
    }
    
    renderCardHTML(card) {
        return `<div class="card-content">
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit" style="color: ${card.getColor()}">${card.suit}</div>
        </div>`;
    }
    
    onStockClick() {
        this.game.drawFromStock();
        this.render();
    }
    
    onCardClick(colIndex, cardIndex) {
        const card = this.game.tableau[colIndex][cardIndex];
        
        if (!card.faceUp) {
            card.faceUp = true;
            this.render();
            return;
        }
        
        // ファンデーションへ移動を試す
        if (this.game.moveToFoundation('tableau', colIndex)) {
            this.render();
            return;
        }
    }
}

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});