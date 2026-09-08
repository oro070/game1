// カードクラス
class Card {
    constructor(suit, rank) {
        this.suit = suit; // ♠ ♥ ♦ ♣
        this.rank = rank; // A, 2-10, J, Q, K
    }
    
    getValue() {
        const values = {'A': 1, 'J': 11, 'Q': 12, 'K': 13};
        return values[this.rank] || parseInt(this.rank);
    }
}

// デッキクラス
class Deck {
    constructor() {
        this.cards = [];
        this.initialize();
    }
    
    initialize() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
        this.shuffle();
    }
    
    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }
    
    drawCard() {
        return this.cards.pop();
    }
}

// ゲームクラス
class Solitaire {
    constructor() {
        this.deck = new Deck();
        this.stock = [];      // ストック
        this.waste = [];      // ウェイスト
        this.foundations = [[], [], [], []]; // ファンデーション
        this.tableau = [[], [], [], [], [], [], []]; // タブロー
        this.initialize();
    }
    
    initialize() {
        // タブローを初期化（7列）
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j <= i; j++) {
                const card = this.deck.drawCard();
                card.faceUp = (j === i); // 最後のカードだけ表向き
                this.tableau[i].push(card);
            }
        }
        
        // 残りのカードをストックに
        this.stock = this.deck.cards;
    }
    
    // ストックからウェイストへ
    drawFromStock() {
        if (this.stock.length === 0) {
            // ストックが空ならウェイストをストックに戻す
            this.stock = this.waste.reverse();
            this.waste = [];
        } else {
            const card = this.stock.pop();
            card.faceUp = true;
            this.waste.push(card);
        }
    }
    
    // ファンデーションに移動
    moveToFoundation(fromPile, cardIndex) {
        const card = fromPile[cardIndex];
        const foundationIndex = this.getFoundationIndex(card.suit);
        const foundation = this.foundations[foundationIndex];
        
        // A から始まるか、正しい順序か確認
        if (foundation.length === 0 && card.rank === 'A') {
            foundation.push(fromPile.splice(cardIndex, 1)[0]);
            return true;
        } else if (foundation.length > 0) {
            const topCard = foundation[foundation.length - 1];
            if (topCard.suit === card.suit && topCard.getValue() + 1 === card.getValue()) {
                foundation.push(fromPile.splice(cardIndex, 1)[0]);
                return true;
            }
        }
        return false;
    }
    
    // スートのインデックスを取得
    getFoundationIndex(suit) {
        const suits = ['♠', '♥', '♦', '♣'];
        return suits.indexOf(suit);
    }
    
    // ゲーム勝利判定
    isWon() {
        return this.foundations.every(f => f.length === 13);
    }
}
