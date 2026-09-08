// ============ ステップ1: カードモデル ============
class Card {
    constructor(suit, rank) {
        this.suit = suit;        // ♠ ♥ ♦ ♣
        this.rank = rank;        // A, 2-10, J, Q, K
        this.faceUp = false;     // 表向き/裏向き
        this.id = `${rank}${suit}`;
    }
    
    getValue() {
        const rankValues = {
            'A': 1, 'J': 11, 'Q': 12, 'K': 13
        };
        return rankValues[this.rank] || parseInt(this.rank);
    }
    
    getColor() {
        return (this.suit === '♥' || this.suit === '♦') ? 'red' : 'black';
    }
}

// ============ ステップ2: デッキ管理 ============
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
        // Fisher-Yates シャッフルアルゴリズム
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    draw() {
        return this.cards.pop();
    }
}

// ============ ステップ3: ゲームロジック ============
class Solitaire {
    constructor() {
        this.deck = new Deck();
        this.stock = [];              // ストック
        this.waste = [];              // ウェイスト
        this.foundations = [[], [], [], []]; // ファンデーション（4つ）
        this.tableau = [[], [], [], [], [], [], []]; // タブロー（7列）
        this.moveHistory = [];        // 履歴（アンドゥ用）
        this.initialize();
    }
    
    // ゲーム初期化
    initialize() {
        // タブローに カード配置
        for (let col = 0; col < 7; col++) {
            for (let row = 0; row <= col; row++) {
                const card = this.deck.draw();
                card.faceUp = (row === col); // 最後のカードだけ表向き
                this.tableau[col].push(card);
            }
        }
        
        // 残りをストックに
        this.stock = this.deck.cards;
    }
    
    // ============ ストック操作 ============
    drawFromStock(drawCount = 1) {
        if (this.stock.length === 0) {
            // ストック空 → ウェイストをストックに戻す
            this.stock = this.waste.reverse();
            this.waste = [];
            return;
        }
        
        // ウェイストに移動
        for (let i = 0; i < drawCount && this.stock.length > 0; i++) {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
    }
    
    // ============ 移動のルール判定 ============
    
    // タブロー間の移動が有効か
    canMoveInTableau(sourceCard, targetCard) {
        // 対象が空 → Kのみ可
        if (!targetCard) {
            return sourceCard.rank === 'K';
        }
        
        // 色が異なり、ランクが1つ小さいか
        return sourceCard.getColor() !== targetCard.getColor() &&
               sourceCard.getValue() === targetCard.getValue() - 1;
    }
    
    // ファンデーションへの移動が有効か
    canMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        
        // ファンデーション空 → Aのみ
        if (foundation.length === 0) {
            return card.rank === 'A';
        }
        
        // 同じスート＆ランクが1つ大きい
        const topCard = foundation[foundation.length - 1];
        return card.suit === topCard.suit &&
               card.getValue() === topCard.getValue() + 1;
    }
    
    // ============ 移動操作 ============
    
    // タブロー内で移動
    moveInTableau(fromCol, toCol, cardCount = 1) {
        const fromPile = this.tableau[fromCol];
        const toPile = this.tableau[toCol];
        
        if (fromPile.length === 0) return false;
        
        const sourceCard = fromPile[fromPile.length - cardCount];
        const targetCard = toPile[toPile.length - 1];
        
        if (this.canMoveInTableau(sourceCard, targetCard)) {
            this.recordMove('tableau', fromCol, 'tableau', toCol, cardCount);
            
            // カード移動
            const cardsToMove = fromPile.splice(-cardCount);
            toPile.push(...cardsToMove);
            
            // 新しいトップカードを表向きに
            if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
                fromPile[fromPile.length - 1].faceUp = true;
            }
            
            return true;
        }
        return false;
    }
    
    // ウェイストからファンデーションへ
    moveWasteToFoundation() {
        if (this.waste.length === 0) return false;
        
        const card = this.waste[this.waste.length - 1];
        
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                this.recordMove('waste', -1, 'foundation', i, 1);
                this.waste.pop();
                this.foundations[i].push(card);
                return true;
            }
        }
        return false;
    }
    
    // タブロー からファンデーションへ
    moveTableauToFoundation(colIndex) {
        const pile = this.tableau[colIndex];
        if (pile.length === 0) return false;
        
        const card = pile[pile.length - 1];
        
        for (let i = 0; i < 4; i++) {
            if (this.canMoveToFoundation(card, i)) {
                this.recordMove('tableau', colIndex, 'foundation', i, 1);
                pile.pop();
                this.foundations[i].push(card);
                
                // 新しいトップカードを表向きに
                if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
                    pile[pile.length - 1].faceUp = true;
                }
                return true;
            }
        }
        return false;
    }
    
    // ============ ゲーム状態 ============
    
    isWon() {
        return this.foundations.every(f => f.length === 13);
    }
    
    isGameOver() {
        // ストック、ウェイストが空で、他に移動不可
        return this.stock.length === 0 && this.waste.length === 0;
    }
    
    recordMove(fromType, fromIndex, toType, toIndex, cardCount) {
        this.moveHistory.push({
            fromType, fromIndex, toType, toIndex, cardCount, timestamp: Date.now()
        });
    }
}

// ============ ステップ4: UIコントローラー ============
class GameUI {
    constructor(gameContainer) {
        this.container = gameContainer;
        this.game = new Solitaire();
        this.selectedCard = null;
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = '';
        
        // ストック＆ウェイスト
        const topArea = document.createElement('div');
        topArea.className = 'top-area';
        topArea.innerHTML = `
            <div class="pile stock" id="stock">
                ${this.game.stock.length > 0 ? '📦' : 'empty'}
            </div>
            <div class="pile waste" id="waste">
                ${this.game.waste.length > 0 ? this.renderCard(this.game.waste[this.game.waste.length - 1]) : 'empty'}
            </div>
        `;
        this.container.appendChild(topArea);
        
        // ファンデーション
        const foundationArea = document.createElement('div');
        foundationArea.className = 'foundation-area';
        this.game.foundations.forEach((foundation, i) => {
            const div = document.createElement('div');
            div.className = 'pile foundation';
            div.id = `foundation-${i}`;
            div.innerHTML = foundation.length > 0 ? 
                this.renderCard(foundation[foundation.length - 1]) : 
                `<div class="suit">${['♠', '♥', '♦', '♣'][i]}</div>`;
            foundationArea.appendChild(div);
        });
        this.container.appendChild(foundationArea);
        
        // タブロー
        const tableauArea = document.createElement('div');
        tableauArea.className = 'tableau-area';
        this.game.tableau.forEach((column, colIndex) => {
            const div = document.createElement('div');
            div.className = 'tableau-column';
            div.id = `tableau-${colIndex}`;
            
            column.forEach((card, cardIndex) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card ${!card.faceUp ? 'face-down' : ''}`;
                cardDiv.innerHTML = card.faceUp ? 
                    `<div class="rank">${card.rank}</div><div class="suit" style="color: ${card.getColor()}">${card.suit}</div>` :
                    '🂠';
                cardDiv.addEventListener('click', () => this.onCardClick(colIndex, cardIndex, 'tableau'));
                div.appendChild(cardDiv);
            });
            
            tableauArea.appendChild(div);
        });
        this.container.appendChild(tableauArea);
    }
    
    renderCard(card) {
        return `<div class="card-content">
            <div class="rank">${card.rank}</div>
            <div class="suit" style="color: ${card.getColor()}">${card.suit}</div>
        </div>`;
    }
    
    onCardClick(colIndex, cardIndex, type) {
        if (type === 'tableau') {
            const card = this.game.tableau[colIndex][cardIndex];
            
            if (!card.faceUp) {
                card.faceUp = true;
                this.render();
                return;
            }
            
            // ファンデーションへ自動移動
            if (this.game.moveTableauToFoundation(colIndex)) {
                this.render();
                this.checkWin();
                return;
            }
        }
    }
    
    attachEventListeners() {
        document.getElementById('stock')?.addEventListener('click', () => {
            this.game.drawFromStock();
            this.render();
        });
        
        document.getElementById('waste')?.addEventListener('click', () => {
            if (this.game.moveWasteToFoundation()) {
                this.render();
                this.checkWin();
            }
        });
    }
    
    checkWin() {
        if (this.game.isWon()) {
            alert('🎉 ゲーム完了！おめでとうございます！');
        }
    }
}

// ゲーム起動
document.addEventListener('DOMContentLoaded', () => {
    const gameUI = new GameUI(document.getElementById('game-container'));
});
