class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.faceUp = false;
    }

    getValue() {
        const values = {
            'A': 1,
            'J': 11,
            'Q': 12,
            'K': 13
        };

        return values[this.rank] || parseInt(this.rank);
    }

    getColor() {
        return (this.suit === '♥' || this.suit === '♦')
            ? 'red'
            : 'black';
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
        const ranks = [
            'A', '2', '3', '4', '5', '6', '7',
            '8', '9', '10', 'J', 'Q', 'K'
        ];

        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [this.cards[i], this.cards[j]] =
                [this.cards[j], this.cards[i]];
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

        this.foundations = [
            [],
            [],
            [],
            []
        ];

        this.tableau = [
            [],
            [],
            [],
            [],
            [],
            [],
            []
        ];

        // ========================================
        // 巻き戻し用の履歴
        // ========================================
        this.history = [];

        this.initialize();
    }


    // ========================================
    // ゲーム初期化
    // ========================================
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


    // ========================================
    // カード情報をコピー
    // ========================================
    cloneCards(cards) {
        return cards.map(card => ({
            suit: card.suit,
            rank: card.rank,
            faceUp: card.faceUp
        }));
    }


    // ========================================
    // 現在のゲーム状態を保存
    // ========================================
    saveState() {

        this.history.push({
            stock: this.cloneCards(this.stock),

            waste: this.cloneCards(this.waste),

            foundations:
                this.foundations.map(
                    foundation => this.cloneCards(foundation)
                ),

            tableau:
                this.tableau.map(
                    column => this.cloneCards(column)
                )
        });
    }


    // ========================================
    // 保存したカード情報を実際のCardに戻す
    // ========================================
    restoreCards(cards) {

        return cards.map(data => {

            const card = new Card(
                data.suit,
                data.rank
            );

            card.faceUp = data.faceUp;

            return card;
        });
    }


    // ========================================
    // 1手前に巻き戻す
    // ========================================
    undo() {

        if (this.history.length === 0) {
            return false;
        }

        const state = this.history.pop();

        this.stock =
            this.restoreCards(state.stock);

        this.waste =
            this.restoreCards(state.waste);

        this.foundations =
            state.foundations.map(
                foundation =>
                    this.restoreCards(foundation)
            );

        this.tableau =
            state.tableau.map(
                column =>
                    this.restoreCards(column)
            );

        return true;
    }


    // ========================================
    // 山札からカードを引く
    // ========================================
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


    // ========================================
    // Tableauへの移動可能判定
    // ========================================
    canMoveInTableau(sourceCard, targetCard) {

        if (!targetCard) {
            return sourceCard.rank === 'K';
        }

        return (
            sourceCard.getColor() !== targetCard.getColor() &&
            sourceCard.getValue() === targetCard.getValue() - 1
        );
    }


    // ========================================
    // Foundationへの移動可能判定
    // ========================================
    canMoveToFoundation(card, foundationIndex) {

        const foundation =
            this.foundations[foundationIndex];

        if (foundation.length === 0) {
            return card.rank === 'A';
        }

        const topCard =
            foundation[foundation.length - 1];

        return (
            card.suit === topCard.suit &&
            card.getValue() === topCard.getValue() + 1
        );
    }


    // ========================================
    // FoundationからTableauへの移動判定
    // ========================================
    canMoveFromFoundation(card, targetCard) {

        if (!targetCard) {
            return false;
        }

        return (
            card.getColor() !== targetCard.getColor() &&
            card.getValue() === targetCard.getValue() - 1
        );
    }


    // ========================================
    // 複数カード移動可能判定
    // ========================================
    canMoveMultipleCards(fromCol, startCardIndex) {

        const column =
            this.tableau[fromCol];

        if (
            startCardIndex < 0 ||
            startCardIndex >= column.length
        ) {
            return false;
        }


        // 全て表向きか確認
        for (
            let i = startCardIndex;
            i < column.length;
            i++
        ) {

            if (!column[i].faceUp) {
                return false;
            }
        }


        // 数字と色が正しく並んでいるか確認
        for (
            let i = startCardIndex + 1;
            i < column.length;
            i++
        ) {

            const prevCard =
                column[i - 1];

            const currentCard =
                column[i];


            if (
                prevCard.getColor() ===
                    currentCard.getColor() ||

                currentCard.getValue() !==
                    prevCard.getValue() - 1
            ) {

                return false;
            }
        }

        return true;
    }


    // ========================================
    // TableauからTableauへ移動
    // ========================================
    moveInTableau(
        fromCol,
        toCol,
        startCardIndex
    ) {

        const fromPile =
            this.tableau[fromCol];

        const toPile =
            this.tableau[toCol];


        if (
            fromCol === toCol ||
            startCardIndex < 0 ||
            startCardIndex >= fromPile.length
        ) {

            return false;
        }


        const sourceCard =
            fromPile[startCardIndex];

        const targetCard =
            toPile.length > 0
                ? toPile[toPile.length - 1]
                : null;


        if (
            !this.canMoveInTableau(
                sourceCard,
                targetCard
            )
        ) {

            return false;
        }


        if (
            !this.canMoveMultipleCards(
                fromCol,
                startCardIndex
            )
        ) {

            return false;
        }


        const cardsToMove =
            fromPile.splice(startCardIndex);


        toPile.push(...cardsToMove);


        // 移動元の一番上を表にする
        if (
            fromPile.length > 0 &&
            !fromPile[fromPile.length - 1].faceUp
        ) {

            fromPile[
                fromPile.length - 1
            ].faceUp = true;
        }

        return true;
    }


    // ========================================
    // Foundationへ移動
    // ========================================
    moveToFoundation(
        fromType,
        fromIndex
    ) {

        let card = null;


        if (
            fromType === 'waste' &&
            this.waste.length > 0
        ) {

            card =
                this.waste[
                    this.waste.length - 1
                ];

        } else if (
            fromType === 'tableau' &&
            this.tableau[fromIndex].length > 0
        ) {

            card =
                this.tableau[fromIndex][
                    this.tableau[fromIndex].length - 1
                ];

        } else if (
            fromType === 'foundation' &&
            this.foundations[fromIndex].length > 0
        ) {

            card =
                this.foundations[fromIndex][
                    this.foundations[fromIndex].length - 1
                ];
        }


        if (!card) {
            return false;
        }


        for (let i = 0; i < 4; i++) {

            if (
                this.canMoveToFoundation(
                    card,
                    i
                )
            ) {

                if (fromType === 'waste') {

                    this.waste.pop();

                } else if (fromType === 'tableau') {

                    this.tableau[fromIndex].pop();


                    if (
                        this.tableau[fromIndex].length > 0 &&
                        !this.tableau[fromIndex][
                            this.tableau[fromIndex].length - 1
                        ].faceUp
                    ) {

                        this.tableau[fromIndex][
                            this.tableau[fromIndex].length - 1
                        ].faceUp = true;
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


    // ========================================
    // FoundationからTableauへ移動
    // ========================================
    moveFromFoundationToTableau(
        foundationIndex,
        tableauIndex
    ) {

        const foundation =
            this.foundations[foundationIndex];

        const tableau =
            this.tableau[tableauIndex];


        if (foundation.length === 0) {
            return false;
        }


        const card =
            foundation[
                foundation.length - 1
            ];


        const targetCard =
            tableau.length > 0
                ? tableau[tableau.length - 1]
                : null;


        if (
            this.canMoveFromFoundation(
                card,
                targetCard
            ) ||
            (!targetCard && card.rank === 'K')
        ) {

            tableau.push(
                foundation.pop()
            );

            return true;
        }


        return false;
    }


    // ========================================
    // 勝利判定
    // ========================================
    isWon() {

        return this.foundations.every(
            foundation =>
                foundation.length === 13
        );
    }
}



class GameUI {

    constructor() {

        this.game =
            new Solitaire();

        this.draggedData =
            null;

        this.init();
    }


    // ========================================
    // 初期化
    // ========================================
    init() {

        this.render();
    }


    // ========================================
    // 画面描画
    // ========================================
    render() {

        const container =
            document.getElementById(
                'game-container'
            );


        if (!container) {

            console.error(
                'game-container が見つかりません'
            );

            return;
        }


        container.innerHTML = '';


        // ========================================
        // 上部エリア
        // ========================================
        const topArea =
            document.createElement('div');

        topArea.className =
            'top-area';


        // ========================================
        // Stock
        // ========================================
        const stockDiv =
            document.createElement('div');

        stockDiv.className =
            'pile stock';

        stockDiv.id =
            'stock';

        stockDiv.textContent =
            this.game.stock.length > 0
                ? `📦 ${this.game.stock.length}`
                : '空';


        stockDiv.onclick =
            () => this.onStockClick();


        stockDiv.ondragover =
            e => this.handleDragOver(e);


        stockDiv.ondrop =
            e => this.handleDropOnStock(e);


        topArea.appendChild(stockDiv);


        // ========================================
        // Waste
        // ========================================
        const wasteDiv =
            document.createElement('div');

        wasteDiv.className =
            'pile waste';

        wasteDiv.id =
            'waste';


        if (this.game.waste.length > 0) {

            const card =
                this.game.waste[
                    this.game.waste.length - 1
                ];


            wasteDiv.innerHTML =
                this.renderCardHTML(card);


            const cardElement =
                wasteDiv.querySelector('.card');


            if (cardElement) {

                cardElement.draggable =
                    true;


                cardElement.ondragstart =
                    e =>
                        this.handleDragStart(
                            e,
                            'waste',
                            -1
                        );
            }

        } else {

            wasteDiv.textContent = '空';
        }


        topArea.appendChild(wasteDiv);


        // ========================================
        // 巻き戻しボタン
        // ========================================
        const undoButton =
            document.createElement('button');


        undoButton.id =
            'undo-button';


        undoButton.textContent =
            `↩ 巻き戻し (${this.game.history.length})`;


        undoButton.disabled =
            this.game.history.length === 0;


        undoButton.title =
            '直前の操作を取り消します';


        undoButton.style.marginLeft =
            '10px';

        undoButton.style.padding =
            '8px 14px';


        undoButton.onclick =
            () => this.undo();


        topArea.appendChild(
            undoButton
        );


        container.appendChild(
            topArea
        );


        // ========================================
        // Foundation
        // ========================================
        const foundationArea =
            document.createElement('div');

        foundationArea.className =
            'foundation-area';


        const suits =
            ['♠', '♥', '♦', '♣'];


        this.game.foundations.forEach(
            (foundation, i) => {

                const div =
                    document.createElement('div');


                div.className =
                    'pile foundation';


                div.id =
                    `foundation-${i}`;


                div.ondragover =
                    e => this.handleDragOver(e);


                div.ondrop =
                    e =>
                        this.handleDropOnFoundation(
                            e,
                            i
                        );


                if (foundation.length > 0) {

                    const card =
                        foundation[
                            foundation.length - 1
                        ];


                    div.innerHTML =
                        this.renderCardHTML(card);


                    const cardElement =
                        div.querySelector('.card');


                    if (cardElement) {

                        cardElement.draggable =
                            true;


                        cardElement.ondragstart =
                            e =>
                                this.handleDragStart(
                                    e,
                                    'foundation',
                                    i
                                );
                    }

                } else {

                    // 修正済み
                    div.innerHTML =
                        `<div class="empty-foundation">${suits[i]}</div>`;
                }


                foundationArea.appendChild(div);
            }
        );


        container.appendChild(
            foundationArea
        );


        // ========================================
        // Tableau
        // ========================================
        const tableauArea =
            document.createElement('div');

        tableauArea.className =
            'tableau-area';


        this.game.tableau.forEach(
            (column, colIndex) => {

                const colDiv =
                    document.createElement('div');


                colDiv.className =
                    'tableau-column';


                colDiv.id =
                    `tableau-${colIndex}`;


                colDiv.ondragover =
                    e =>
                        this.handleDragOver(e);


                colDiv.ondrop =
                    e =>
                        this.handleDropOnTableau(
                            e,
                            colIndex
                        );


                column.forEach(
                    (card, cardIndex) => {

                        const cardDiv =
                            document.createElement('div');


                        cardDiv.className =
                            `card ${
                                !card.faceUp
                                    ? 'face-down'
                                    : 'face-up'
                            }`;


                        cardDiv.draggable =
                            card.faceUp;


                        if (card.faceUp) {

                            const colorClass =
                                card.getColor() === 'red'
                                    ? 'card-rank-red'
                                    : 'card-rank-black';


                            cardDiv.innerHTML = `
                                <div class="card-top ${colorClass}">
                                    <div>${card.rank}</div>
                                    <div>${card.suit}</div>
                                </div>

                                <div class="card-center">
                                    ${card.suit}
                                </div>

                                <div class="card-bottom ${colorClass}">
                                    <div>${card.rank}</div>
                                    <div>${card.suit}</div>
                                </div>
                            `;


                            cardDiv.ondragstart =
                                e =>
                                    this.handleDragStart(
                                        e,
                                        'tableau',
                                        colIndex,
                                        cardIndex
                                    );


                            cardDiv.style.cursor =
                                'grab';


                            cardDiv.onmousedown =
                                () =>
                                    cardDiv.style.cursor =
                                        'grabbing';


                            cardDiv.onmouseup =
                                () =>
                                    cardDiv.style.cursor =
                                        'grab';

                        } else {

                            cardDiv.textContent =
                                '🂠';


                            cardDiv.onclick =
                                () =>
                                    this.onCardClick(
                                        colIndex,
                                        cardIndex
                                    );


                            cardDiv.style.cursor =
                                'pointer';
                        }


                        colDiv.appendChild(
                            cardDiv
                        );
                    }
                );


                tableauArea.appendChild(
                    colDiv
                );
            }
        );


        container.appendChild(
            tableauArea
        );


        // ========================================
        // ゲームクリア
        // ========================================
        if (this.game.isWon()) {

            setTimeout(
                () =>
                    alert(
                        '🎉 ゲーム完了！おめでとうございます！'
                    ),
                100
            );
        }
    }


    // ========================================
    // カードHTML
    // ========================================
    renderCardHTML(card) {

        const colorClass =
            card.getColor() === 'red'
                ? 'card-rank-red'
                : 'card-rank-black';


        return `
            <div
                class="card"
                style="pointer-events: auto;"
            >

                <div class="card-top ${colorClass}">
                    <div>${card.rank}</div>
                    <div>${card.suit}</div>
                </div>

                <div class="card-center">
                    ${card.suit}
                </div>

                <div class="card-bottom ${colorClass}">
                    <div>${card.rank}</div>
                    <div>${card.suit}</div>
                </div>

            </div>
        `;
    }


    // ========================================
    // ドラッグ開始
    // ========================================
    handleDragStart(
        e,
        sourceType,
        sourceIndex,
        cardIndex = -1
    ) {

        this.draggedData = {
            sourceType,
            sourceIndex,
            cardIndex
        };


        e.dataTransfer.effectAllowed =
            'move';


        e.dataTransfer.setData(
            'text/html',
            e.target.innerHTML
        );
    }


    // ========================================
    // ドラッグ中
    // ========================================
    handleDragOver(e) {

        e.preventDefault();

        e.dataTransfer.dropEffect =
            'move';
    }


    // ========================================
    // Tableauへドロップ
    // ========================================
    handleDropOnTableau(
        e,
        toCol
    ) {

        e.preventDefault();


        if (!this.draggedData) {
            return;
        }


        const {
            sourceType,
            sourceIndex,
            cardIndex
        } = this.draggedData;


        let success = false;


        // ========================================
        // 操作前の状態を保存
        // ========================================
        this.game.saveState();


        if (
            sourceType === 'tableau' &&
            sourceIndex !== toCol
        ) {

            success =
                this.game.moveInTableau(
                    sourceIndex,
                    toCol,
                    cardIndex
                );

        } else if (
            sourceType === 'foundation'
        ) {

            success =
                this.game.moveFromFoundationToTableau(
                    sourceIndex,
                    toCol
                );

        } else if (
            sourceType === 'waste'
        ) {

            if (this.game.waste.length > 0) {

                const card =
                    this.game.waste[
                        this.game.waste.length - 1
                    ];


                const toPile =
                    this.game.tableau[toCol];


                const targetCard =
                    toPile.length > 0
                        ? toPile[
                            toPile.length - 1
                        ]
                        : null;


                if (
                    this.game.canMoveInTableau(
                        card,
                        targetCard
                    )
                ) {

                    toPile.push(
                        this.game.waste.pop()
                    );

                    success = true;
                }
            }
        }


        if (success) {

            this.render();

        } else {

            // 移動失敗なら履歴を削除
            if (this.game.history.length > 0) {
                this.game.history.pop();
            }
        }


        this.draggedData = null;
    }


    // ========================================
    // Foundationへドロップ
    // ========================================
    handleDropOnFoundation(
        e,
        toFoundation
    ) {

        e.preventDefault();


        if (!this.draggedData) {
            return;
        }


        const {
            sourceType,
            sourceIndex
        } = this.draggedData;


        let success = false;


        // 操作前の状態を保存
        this.game.saveState();


        if (sourceType === 'tableau') {

            success =
                this.game.moveToFoundation(
                    'tableau',
                    sourceIndex
                );

        } else if (
            sourceType === 'waste'
        ) {

            success =
                this.game.moveToFoundation(
                    'waste',
                    -1
                );

        } else if (
            sourceType === 'foundation'
        ) {

            success = false;
        }


        if (success) {

            this.render();

        } else {

            // 移動失敗なら履歴を削除
            if (this.game.history.length > 0) {
                this.game.history.pop();
            }
        }


        this.draggedData = null;
    }


    // ========================================
    // Stockへドロップ
    // ========================================
    handleDropOnStock(e) {

        e.preventDefault();

        this.draggedData = null;
    }


    // ========================================
    // 山札クリック
    // ========================================
    onStockClick() {

        // 山札を操作する前に保存
        this.game.saveState();


        this.game.drawFromStock();


        this.render();
    }


    // ========================================
    // 巻き戻し
    // ========================================
    undo() {

        const success =
            this.game.undo();


        if (success) {

            this.draggedData = null;

            this.render();
        }
    }


    // ========================================
    // 裏向きカードクリック
    // ========================================
    onCardClick(
        colIndex,
        cardIndex
    ) {

        const card =
            this.game.tableau[colIndex][
                cardIndex
            ];


        // ========================================
        // 裏向きカードを表にする
        // ========================================
        if (!card.faceUp) {

            this.game.saveState();


            card.faceUp = true;


            this.render();

            return;
        }


        // ========================================
        // Foundationへ移動
        // ========================================
        this.game.saveState();


        if (
            this.game.moveToFoundation(
                'tableau',
                colIndex
            )
        ) {

            this.render();

            return;
        }


        // 移動できなかった場合は
        // 保存した履歴を削除
        if (this.game.history.length > 0) {
            this.game.history.pop();
        }
    }
}


// ========================================
// ゲーム開始
// ========================================
window.addEventListener(
    'DOMContentLoaded',
    () => {

        const ui =
            new GameUI();


        // ========================================
        // Ctrl + Z / Cmd + Z
        // ========================================
        document.addEventListener(
            'keydown',
            e => {

                if (
                    (e.ctrlKey || e.metaKey) &&
                    e.key.toLowerCase() === 'z'
                ) {

                    e.preventDefault();

                    ui.undo();
                }
            }
        );
    }
);
