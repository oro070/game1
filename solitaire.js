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
    
    canMoveFromFoundation(card, targetCard) {
        if (!targetCard) return false;
        return card.getColor() !== targetCard.getColor() &&
               card.getValue() === targetCard.getValue() - 1;
    }
    
    canMoveMultipleCards(fromCol, startCardIndex) {
        const column = this.tableau[fromCol];
        if (startCardIndex < 0 || startCardIndex >= column.length) return false;
        
        // startCardIndex以降のカード全てがfaceUpか確認
        for (let i = startCardIndex; i < column.length; i++) {
            if (!column[i].faceUp) return false;
        }
        
        // 色と値が正しく交互になっているか確認
        for (let i = startCardIndex + 1; i < column.length; i++) {
            const prevCard = column[i - 1];
            const currentCard = column[i];
            
            // 色が異なり、値が1小さければOK
            if (prevCard.getColor() === currentCard.getColor() ||
                currentCard.getValue() !== prevCard.getValue() - 1) {
                return false;
            }
        }
        
        return true;
    }
    
    moveInTableau(fromCol, toCol, startCardIndex) {
        const fromPile = this.tableau[fromCol];
        const toPile = this.tableau[toCol];
        
        if (fromCol === toCol || startCardIndex < 0 || startCardIndex >= fromPile.length) {
            return false;
        }
        
        // ドラッグしたカードの情報
        const sourceCard = fromPile[startCardIndex];
        const targetCard = toPile.length > 0 ? toPile[toPile.length - 1] : null;
        
        // 移動可能かチェック
        if (!this.canMoveInTableau(sourceCard, targetCard)) {
            return false;
        }
        
        // 複数枚を移動する場合、全てが有効に続いているか確認
        if (!this.canMoveMultipleCards(fromCol, startCardIndex)) {
            return false;
        }
        
        // カードを移動
        const cardsToMove = fromPile.splice(startCardIndex);
        toPile.push(...cardsToMove);
        
        // 移動元に裏向きカードがあれば、一番上のカードを表にする
        if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
            fromPile[fromPile.length - 1].faceUp = true;
        }
        
        return true;
    }
    
    moveToFoundation(fromType, fromIndex) {
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
                return true;
            }
        }
        return false;
    }
    
    moveFromFoundationToTableau(foundationIndex, tableauIndex) {
        const foundation = this.foundations[foundationIndex];
        const tableau = this.tableau[tableauIndex];
        
        if (foundation.length === 0) return false;
        
        const card = foundation[foundation.length - 1];
        const targetCard = tableau.length > 0 ? tableau[tableau.length - 1] : null;
        
        if (this.canMoveFromFoundation(card, targetCard) || (!targetCard && card.rank === 'K')) {
            tableau.push(foundation.pop());
            return true;
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
        this.draggedData = null;
        this.init();
    }
    
    init() {
        this.render();
    }
    
    render() {
        const container = document.getElementById('game-container');
        container.innerHTML = '';
        
        const topArea = document.createElement('div');
        topArea.className = 'top-area';
        
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
            
            column.forEach((card, cardIndex) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card ${!card.faceUp ? 'face-down' : 'face-up'}`;
                cardDiv.draggable = card.faceUp;
                
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
            // 複数枚ドラッグの場合、cardIndexから移動
            success = this.game.moveInTableau(sourceIndex, toCol, cardIndex);
        } else if (sourceType === 'foundation') {
            success = this.game.moveFromFoundationToTableau(sourceIndex, toCol);
        } else if (sourceType === 'waste') {
            if (this.game.waste.length > 0) {
                const card = this.game.waste[this.game.waste.length - 1];
                const toPile = this.game.tableau[toCol];
                const targetCard = toPile.length > 0 ? toPile[toPile.length - 1] : null;
                if (this.game.canMoveInTableau(card, targetCard)) {
                    toPile.push(this.game.waste.pop());
                    success = true;
                }
            }
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
            card.faceUp = true;
            this.render();
            return;
        }
        
        if (this.game.moveToFoundation('tableau', colIndex)) {
            this.render();
            return;
        }
    }
}

class Solitaire {
    constructor() {
        this.deck = new Deck();
        this.stock = [];
        this.waste = [];
        this.foundations = [[], [], [], []];
        this.tableau = [[], [], [], [], [], [], []];

        // 巻き戻し履歴
        this.history = [];

        this.initialize();
    }

    // =========================
    // 状態を保存
    // =========================
    saveState() {
        const cloneCards = cards => {
            return cards.map(card => ({
                suit: card.suit,
                rank: card.rank,
                faceUp: card.faceUp
            }));
        };

        this.history.push({
            stock: cloneCards(this.stock),
            waste: cloneCards(this.waste),
            foundations: this.foundations.map(cloneCards),
            tableau: this.tableau.map(cloneCards)
        });
    }

    // =========================
    // 直前の状態に戻す
    // =========================
    undo() {
        if (this.history.length === 0) {
            return false;
        }

        const state = this.history.pop();

        const restoreCards = cards => {
            return cards.map(data => {
                const card = new Card(data.suit, data.rank);
                card.faceUp = data.faceUp;
                return card;
            });
        };

        this.stock = restoreCards(state.stock);
        this.waste = restoreCards(state.waste);

        this.foundations =
            state.foundations.map(restoreCards);

        this.tableau =
            state.tableau.map(restoreCards);

        return true;
    }
}

onStockClick() {
    this.game.saveState();

    this.game.drawFromStock();

    this.render();
}

onCardClick(colIndex, cardIndex) {
    const card = this.game.tableau[colIndex][cardIndex];

    if (!card.faceUp) {
        this.game.saveState();

        card.faceUp = true;

        this.render();
        return;
    }

    this.game.saveState();

    if (this.game.moveToFoundation('tableau', colIndex)) {
        this.render();
        return;
    }

    // 移動できなかった場合は履歴を戻す
    this.game.history.pop();
}

handleDropOnTableau(e, toCol) {
    e.preventDefault();

    if (!this.draggedData) {
        return;
    }

    const { sourceType, sourceIndex, cardIndex }
        = this.draggedData;

    // 移動前の状態を保存
    this.game.saveState();

    let success = false;

    if (sourceType === 'tableau' &&
        sourceIndex !== toCol) {

        success = this.game.moveInTableau(
            sourceIndex,
            toCol,
            cardIndex
        );

    } else if (sourceType === 'foundation') {

        success =
            this.game.moveFromFoundationToTableau(
                sourceIndex,
                toCol
            );

    } else if (sourceType === 'waste') {

        if (this.game.waste.length > 0) {

            const card =
                this.game.waste[this.game.waste.length - 1];

            const toPile =
                this.game.tableau[toCol];

            const targetCard =
                toPile.length > 0
                    ? toPile[toPile.length - 1]
                    : null;

            if (this.game.canMoveInTableau(
                card,
                targetCard
            )) {
                toPile.push(this.game.waste.pop());
                success = true;
            }
        }
    }

    if (success) {
        this.render();
    } else {
        // 移動失敗なら保存した履歴を削除
        this.game.history.pop();
    }

    this.draggedData = null;
}

const undoButton = document.createElement('button');

undoButton.textContent = '↩ 巻き戻し';

undoButton.disabled =
    this.game.history.length === 0;

undoButton.onclick = () => {
    this.undo();
};

topArea.appendChild(undoButton);

undo() {
    if (this.game.undo()) {
        this.draggedData = null;
        this.render();
    }
}

window.addEventListener('DOMContentLoaded', () => {

    const ui = new GameUI();

    document.addEventListener('keydown', e => {

        if (
            (e.ctrlKey || e.metaKey) &&
            e.key.toLowerCase() === 'z'
        ) {
            e.preventDefault();

            ui.undo();
        }
    });

});
window.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});
