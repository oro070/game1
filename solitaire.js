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
    constructor(historyLimit = 50) {
        this.deck = new Deck();
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];

        // undo history: stores previous states (plain objects)
        this.history = [];
        this.historyLimit = historyLimit;

        this.initialize();
        // Initial state is effectively the state before any player action, so don't push an extra snapshot here.
    }
    
    initialize() {
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.draw();
                card.faceUp = (row === col);
                this.tableau[col].push(card);
            }
        }
        
        this.stock = this.deck.cards;
    }

    // Serialize current game state into a plain object (for history)
    _serializeState() {
        const serializeCard = (c) => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp });
        return {
            stock: this.stock.map(serializeCard),
            waste: this.waste.map(serializeCard),
            foundations: this.foundations.map(f => f.map(serializeCard)),
            tableau: this.tableau.map(col => col.map(serializeCard))
        };
    }

    // Restore a state object (from history)
    _restoreState(state) {
        const buildCard = (o) => {
            const c = new Card(o.suit, o.rank);
            c.faceUp = !!o.faceUp;
            return c;
        };

        this.stock = state.stock.map(buildCard);
        this.waste = state.waste.map(buildCard);
        this.foundations = state.foundations.map(col => col.map(buildCard));
        this.tableau = state.tableau.map(col => col.map(buildCard));

        // keep deck.cards in sync with stock (so drawFromStock still works as expected if some code relies on deck)
        this.deck.cards = this.stock;
    }

    // push a previous snapshot onto history (called BEFORE performing a change)
    _pushSnapshot(snapshot) {
        this.history.push(snapshot);
        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
    }

    // public undo: restore the last snapshot. Returns true if undo succeeded.
    undo() {
        if (this.history.length === 0) return false;
        const prev = this.history.pop();
        this._restoreState(prev);
        return true;
    }
    
    drawFromStock() {
        // always change state, so snapshot before changing
        const snapshot = this._serializeState();

        if (this.stock.length === 0) {
            // reverse without mutating the original snapshot arrays
            this.stock = this.waste.slice().reverse();
            this.waste = [];
            this.deck.cards = this.stock;
            // record snapshot (previous state) so undo can revert
            this._pushSnapshot(snapshot);
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
            this.deck.cards = this.stock;
            this._pushSnapshot(snapshot);
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
    
    canMoveFromFoundation(card, targetCard) {
        if (!targetCard) return false;
        return card.getColor() !== targetCard.getColor() &&
               card.getValue() === targetCard.getValue() - 1;
    }
    
    canMoveMultipleCards(fromCol, startCardIndex) {
        const column = this.tableau[fromCol];
        if (startCardIndex < 0 || startCardIndex >= column.length) return false;
        
        for (let i = startCardIndex; i < column.length; i++) {
            if (!column[i].faceUp) return false;
        }
        
        for (let i = startCardIndex + 1; i < column.length; i++) {
            const prevCard = column[i - 1];
            const currentCard = column[i];
            
            if (prevCard.getColor() === currentCard.getColor() ||
                currentCard.getValue() !== prevCard.getValue() - 1) {
                return false;
            }
        }
        
        return true;
    }
    
    moveInTableau(fromCol, toCol, startCardIndex) {
        // snapshot previous state; push only if move succeeds
        const snapshot = this._serializeState();

        const fromPile = this.tableau[fromCol];
        const toPile = this.tableau[toCol];
        
        if (fromCol === toCol || startCardIndex < 0 || startCardIndex >= fromPile.length) {
            return false;
        }
        
        const sourceCard = fromPile[startCardIndex];
        const targetCard = toPile.length > 0 ? toPile[toPile.length - 1] : null;
        
        if (!this.canMoveInTableau(sourceCard, targetCard)) {
            return false;
        }
        
        if (!this.canMoveMultipleCards(fromCol, startCardIndex)) {
            return false;
        }
        
        const cardsToMove = fromPile.splice(startCardIndex);
        toPile.push(...cardsToMove);
        
        if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
            fromPile[fromPile.length - 1].faceUp = true;
        }

        // record previous snapshot for undo
        this._pushSnapshot(snapshot);
        return true;
    }
    
    // Move the top card (waste) to tableau if legal. Used by UI to avoid modifying arrays directly.
    moveWasteToTableau(toCol) {
        if (this.waste.length === 0) return false;
        const card = this.waste[this.waste.length - 1];
        const toPile = this.tableau[toCol];
        const targetCard = toPile.length > 0 ? toPile[toPile.length - 1] : null;
        if (!this.canMoveInTableau(card, targetCard)) return false;

        const snapshot = this._serializeState();
        toPile.push(this.waste.pop());
        this._pushSnapshot(snapshot);
        return true;
    }

    moveToFoundation(fromType, fromIndex) {
        const snapshot = this._serializeState();
        let card = null;
        
        if (fromType === 'waste' && this.waste.length > 0) {
            card = this.waste[this.waste.length - 1];
        } else if (fromType === 'tableau' && this.tableau[fromIndex].length > 0) {
            card = this.tableau[fromIndex][this.tableau[fromIndex].length - 1];
        } else if (fromType === 'foundation' && this.foundations[fromIndex].length > 0) {
            card = this.foundations[fromIndex][this.foundations[fromIndex].length - 1];
        }
        
        if (!card) return false;
        
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                if (fromType === 'waste') {
                    this.waste.pop();
                } else if (fromType === 'tableau') {
                    this.tableau[fromIndex].pop();
                    if (this.tableau[fromIndex].length > 0 && !this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp) {
                        this.tableau[fromIndex][this.tableau[fromIndex].length - 1].faceUp = true;
                    }
                } else if (fromType === 'foundation') {
                    this.foundations[fromIndex].pop();
                }
                this.foundations[i].push(card);
                this._pushSnapshot(snapshot);
                return true;
            }
        }
        return false;
    }
    
    moveFromFoundationToTableau(foundationIndex, tableauIndex) {
        const snapshot = this._serializeState();

        const foundation = this.foundations[foundationIndex];
        const tableau = this.tableau[tableauIndex];
        
        if (foundation.length === 0) return false;
        
        const card = foundation[foundation.length - 1];
        const targetCard = tableau.length > 0 ? tableau[tableau.length - 1] : null;
        
        if (this.canMoveFromFoundation(card, targetCard) || (!targetCard && card.rank === 'K')) {
            tableau.push(foundation.pop());
            this._pushSnapshot(snapshot);
            return true;
        }
        return false;
    }

    // flip a facedown card in tableau (used by UI on click) — undoable
    flipTableauCard(colIndex, cardIndex) {
        const column = this.tableau[colIndex];
        if (!column || cardIndex < 0 || cardIndex >= column.length) return false;
        const card = column[cardIndex];
        if (card.faceUp) return false;
        const snapshot = this._serializeState();
        card.faceUp = true;
        this._pushSnapshot(snapshot);
        return true;
    }
    
    isWon() {
        return this.foundations.every(f => f.length === 13);
    }
}

class GameUI {
    constructor() {
        this.game = new Solitaire();
        this.draggedData = null;
        this.init();
    }
    
    init() {
        this.render();
    }
    
    render() {
        const container = document.getElementById('game-container');
        if (!container) return;
        container.innerHTML = '';
        
        const topArea = document.createElement('div');
        topArea.className = 'top-area';

        // Undo button
        const undoBtn = document.createElement('button');
        undoBtn.textContent = '戻す';
        undoBtn.title = '一手戻す';
        undoBtn.onclick = () => {
            if (this.game.undo()) this.render();
        };
        topArea.appendChild(undoBtn);
        
        const stockDiv = document.createElement('div');
        stockDiv.className = 'pile stock';
        stockDiv.id = 'stock';
        stockDiv.textContent = this.game.stock.length > 0 ? `📦 ${this.game.stock.length}` : '空';
        stockDiv.onclick = () => this.onStockClick();
        stockDiv.ondragover = (e) => this.handleDragOver(e);
        stockDiv.ondrop = (e) => this.handleDropOnStock(e);
        topArea.appendChild(stockDiv);
        
        const wasteDiv = document.createElement('div');
        wasteDiv.className = 'pile waste';
        wasteDiv.id = 'waste';
        if (this.game.waste.length > 0) {
            const card = this.game.waste[this.game.waste.length - 1];
            wasteDiv.innerHTML = this.renderCardHTML(card);
            const cardElement = wasteDiv.querySelector('.card');
            if (cardElement) {
                cardElement.draggable = true;
                cardElement.ondragstart = (e) => this.handleDragStart(e, 'waste', -1);
            }
        } else {
            wasteDiv.textContent = '空';
        }
        topArea.appendChild(wasteDiv);
        
        container.appendChild(topArea);
        
        const foundationArea = document.createElement('div');
        foundationArea.className = 'foundation-area';
        const suits = ['♠', '♥', '♦', '♣'];
        
        this.game.foundations.forEach((foundation, i) => {
            const div = document.createElement('div');
            div.className = 'pile foundation';
            div.id = `foundation-${i}`;
            div.ondragover = (e) => this.handleDragOver(e);
            div.ondrop = (e) => this.handleDropOnFoundation(e, i);
            
            if (foundation.length > 0) {
                const card = foundation[foundation.length - 1];
                div.innerHTML = this.renderCardHTML(card);
                const cardElement = div.querySelector('.card');
                if (cardElement) {
                    cardElement.draggable = true;
                    cardElement.ondragstart = (e) => this.handleDragStart(e, 'foundation', i);
                }
            } else {
                div.innerHTML = `<div class="empty-foundation">${suits[i]}</div>`;
            }
            foundationArea.appendChild(div);
        });
        
        container.appendChild(foundationArea);
        
        const tableauArea = document.createElement('div');
        tableauArea.className = 'tableau-area';
        
        this.game.tableau.forEach((column, colIndex) => {
            const colDiv = document.createElement('div');
            colDiv.className = 'tableau-column';
            colDiv.id = `tableau-${colIndex}`;
            colDiv.ondragover = (e) => this.handleDragOver(e);
            colDiv.ondrop = (e) => this.handleDropOnTableau(e, colIndex);
            colDiv.style.minHeight = '500px';
            colDiv.style.height = '100%';
            
            column.forEach((card, cardIndex) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card ${!card.faceUp ? 'face-down' : 'face-up'}`;
                cardDiv.draggable = card.faceUp;
                
                cardDiv.style.position = 'absolute';
                cardDiv.style.left = '0';
                cardDiv.style.top = `${cardIndex * 18}px`;
                cardDiv.style.zIndex = String(100 - cardIndex);
                
                if (card.faceUp) {
                    const colorClass = card.getColor() === 'red' ? 'card-rank-red' : 'card-rank-black';
                    cardDiv.innerHTML = `
                        <div class="card-top ${colorClass}">
                            <div>${card.rank}</div>
                            <div>${card.suit}</div>
                        </div>
                        <div class="card-center">${card.suit}</div>
                        <div class="card-bottom ${colorClass}">
                            <div>${card.rank}</div>
                            <div>${card.suit}</div>
                        </div>
                    `;
                    cardDiv.ondragstart = (e) => this.handleDragStart(e, 'tableau', colIndex, cardIndex);
                    cardDiv.style.cursor = 'grab';
                    cardDiv.onmousedown = () => cardDiv.style.cursor = 'grabbing';
                    cardDiv.onmouseup = () => cardDiv.style.cursor = 'grab';
                } else {
                    cardDiv.textContent = '🂠';
                    cardDiv.onclick = () => this.onCardClick(colIndex, cardIndex);
                    cardDiv.style.cursor = 'pointer';
                }
                
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
        const colorClass = card.getColor() === 'red' ? 'card-rank-red' : 'card-rank-black';
        return `<div class="card" style="pointer-events: auto;">
            <div class="card-top ${colorClass}">
                <div>${card.rank}</div>
                <div>${card.suit}</div>
            </div>
            <div class="card-center">${card.suit}</div>
            <div class="card-bottom ${colorClass}">
                <div>${card.rank}</div>
                <div>${card.suit}</div>
            </div>
        </div>`;
    }
    
    handleDragStart(e, sourceType, sourceIndex, cardIndex = -1) {
        this.draggedData = { sourceType, sourceIndex, cardIndex };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.innerHTML);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    handleDropOnTableau(e, toCol) {
        e.preventDefault();
        if (!this.draggedData) return;
        
        const { sourceType, sourceIndex, cardIndex } = this.draggedData;
        let success = false;
        
        if (sourceType === 'tableau' && sourceIndex !== toCol) {
            success = this.game.moveInTableau(sourceIndex, toCol, cardIndex);
        } else if (sourceType === 'foundation') {
            success = this.game.moveFromFoundationToTableau(sourceIndex, toCol);
        } else if (sourceType === 'waste') {
            // use the new game.moveWasteToTableau method which records history
            success = this.game.moveWasteToTableau(toCol);
        }
        
        if (success) {
            this.render();
        }
        
        this.draggedData = null;
    }
    
    handleDropOnFoundation(e, toFoundation) {
        e.preventDefault();
        if (!this.draggedData) return;
        
        const { sourceType, sourceIndex } = this.draggedData;
        let success = false;
        
        if (sourceType === 'tableau') {
            success = this.game.moveToFoundation('tableau', sourceIndex);
        } else if (sourceType === 'waste') {
            success = this.game.moveToFoundation('waste', -1);
        } else if (sourceType === 'foundation') {
            success = false;
        }
        
        if (success) {
            this.render();
        }
        
        this.draggedData = null;
    }
    
    handleDropOnStock(e) {
        e.preventDefault();
        this.draggedData = null;
    }
    
    onStockClick() {
        this.game.drawFromStock();
        this.render();
    }
    
    onCardClick(colIndex, cardIndex) {
        const card = this.game.tableau[colIndex][cardIndex];
        
        if (!card.faceUp) {
            // use game.flipTableauCard so the action is undoable
            if (this.game.flipTableauCard(colIndex, cardIndex)) this.render();
            return;
        }
        
        if (this.game.moveToFoundation('tableau', colIndex)) {
            this.render();
            return;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});
