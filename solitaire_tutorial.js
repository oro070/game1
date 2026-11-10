// solitaire_tutorial.js

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

        // 一手戻すための履歴
        this.history = [];
        this.historyLimit = historyLimit;

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

    _serializeState() {
        const serializeCard = (c) => ({
            suit: c.suit,
            rank: c.rank,
            faceUp: c.faceUp
        });

        return {
            stock: this.stock.map(serializeCard),
            waste: this.waste.map(serializeCard),
            foundations: this.foundations.map(f => f.map(serializeCard)),
            tableau: this.tableau.map(col => col.map(serializeCard))
        };
    }

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

        this.deck.cards = this.stock;
    }

    _pushSnapshot(snapshot) {
        this.history.push(snapshot);

        if (this.history.length > this.historyLimit) {
            this.history.shift();
        }
    }

    undo() {
        if (this.history.length === 0) return false;

        const prev = this.history.pop();
        this._restoreState(prev);

        return true;
    }

    drawFromStock() {
        const snapshot = this._serializeState();

        if (this.stock.length === 0) {
            this.stock = this.waste.slice().reverse();
            this.waste = [];
            this.deck.cards = this.stock;
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

    // 組札に置けるか確認
    canMoveToFoundation(card, foundationIndex) {
        const foundation = this.foundations[foundationIndex];
        const suits = ['♠', '♥', '♦', '♣'];

        // 空の組札には表示されているマークと同じAだけ置ける
        if (foundation.length === 0) {
            return card.rank === 'A' &&
                   card.suit === suits[foundationIndex];
        }

        const topCard = foundation[foundation.length - 1];

        return card.suit === topCard.suit &&
               card.getValue() === topCard.getValue() + 1;
    }

    canMoveFromFoundation(card, targetCard) {
        if (!targetCard) return false;

        return card.getColor() !== targetCard.getColor() &&
               card.getValue() === targetCard.getValue() - 1;
    }

    canMoveMultipleCards(fromCol, startCardIndex) {
        const column = this.tableau[fromCol];

        if (startCardIndex < 0 || startCardIndex >= column.length) {
            return false;
        }

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
        const snapshot = this._serializeState();

        const fromPile = this.tableau[fromCol];
        const toPile = this.tableau[toCol];

        if (fromCol === toCol ||
            startCardIndex < 0 ||
            startCardIndex >= fromPile.length) {
            return false;
        }

        const sourceCard = fromPile[startCardIndex];

        const targetCard = toPile.length > 0
            ? toPile[toPile.length - 1]
            : null;

        if (!this.canMoveInTableau(sourceCard, targetCard)) {
            return false;
        }

        if (!this.canMoveMultipleCards(fromCol, startCardIndex)) {
            return false;
        }

        const cardsToMove = fromPile.splice(startCardIndex);
        toPile.push(...cardsToMove);

        if (fromPile.length > 0 &&
            !fromPile[fromPile.length - 1].faceUp) {
            fromPile[fromPile.length - 1].faceUp = true;
        }

        this._pushSnapshot(snapshot);

        return true;
    }

    moveWasteToTableau(toCol) {
        if (this.waste.length === 0) return false;

        const card = this.waste[this.waste.length - 1];
        const toPile = this.tableau[toCol];

        const targetCard = toPile.length > 0
            ? toPile[toPile.length - 1]
            : null;

        if (!this.canMoveInTableau(card, targetCard)) return false;

        const snapshot = this._serializeState();

        toPile.push(this.waste.pop());
        this._pushSnapshot(snapshot);

        return true;
    }

    // 組札へカードを移動
    moveToFoundation(fromType, fromIndex, foundationIndex = null) {
        let card = null;

        if (fromType === 'waste' && this.waste.length > 0) {
            card = this.waste[this.waste.length - 1];

        } else if (fromType === 'tableau' &&
                   this.tableau[fromIndex].length > 0) {
            card = this.tableau[fromIndex][
                this.tableau[fromIndex].length - 1
            ];
        }

        if (!card || !card.faceUp) return false;

        const targets = foundationIndex !== null
            ? [foundationIndex]
            : [0, 1, 2, 3];

        for (const i of targets) {
            if (i < 0 || i >= 4) continue;

            if (!this.canMoveToFoundation(card, i)) {
                continue;
            }

            const snapshot = this._serializeState();

            if (fromType === 'waste') {
                this.waste.pop();

            } else if (fromType === 'tableau') {
                this.tableau[fromIndex].pop();

                const column = this.tableau[fromIndex];

                if (column.length > 0 &&
                    !column[column.length - 1].faceUp) {
                    column[column.length - 1].faceUp = true;
                }
            }

            this.foundations[i].push(card);
            this._pushSnapshot(snapshot);

            return true;
        }

        return false;
    }

    moveFromFoundationToTableau(foundationIndex, tableauIndex) {
        const snapshot = this._serializeState();

        const foundation = this.foundations[foundationIndex];
        const tableau = this.tableau[tableauIndex];

        if (foundation.length === 0) return false;

        const card = foundation[foundation.length - 1];

        const targetCard = tableau.length > 0
            ? tableau[tableau.length - 1]
            : null;

        if (this.canMoveFromFoundation(card, targetCard) ||
            (!targetCard && card.rank === 'K')) {

            tableau.push(foundation.pop());
            this._pushSnapshot(snapshot);

            return true;
        }

        return false;
    }

    flipTableauCard(colIndex, cardIndex) {
        const column = this.tableau[colIndex];

        if (!column ||
            cardIndex < 0 ||
            cardIndex >= column.length) {
            return false;
        }

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

        this.injectLargeCardStyles();
        this.init();
        this.createTutorial();
    }

    injectLargeCardStyles() {
        if (document.getElementById('large-solitaire-styles')) return;

        const style = document.createElement('style');
        style.id = 'large-solitaire-styles';

        style.textContent = `
            html, body {
                margin: 0;
                min-height: 100%;
                height: 100%;
                font-size: 18px;
                background: #1f4b2a;
            }

            body {
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding: 20px 16px 40px;
                box-sizing: border-box;
            }

            #game-container {
                width: min(95vw, 1100px);
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .top-area {
                width: min(92vw, 1000px);
                font-size: 18px;
                margin-bottom: 12px;
            }

            button {
                font-size: 18px;
                padding: 8px 14px;
                min-width: 120px;
            }

            .pile {
                width: 110px;
                height: 150px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 12px;
                font-size: 20px;
                font-weight: 700;
            }

            .foundation-area,
            .tableau-area {
                width: min(92vw, 1000px);
                gap: 14px;
                justify-content: center;
            }

            .tableau-column {
                position: relative;
                width: 110px;
                min-width: 110px;
                min-height: 500px;
                height: 100%;
            }

            .card {
                width: 100px;
                height: 140px;
                border-radius: 12px;
                border: 2px solid #333;
                background: white;
                color: #111;
                box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 8px 10px;
                box-sizing: border-box;
                font-size: 18px;
                line-height: 1.1;
                user-select: none;
            }

            .card-top,
            .card-bottom {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 1.1em;
                font-weight: 700;
            }

            .card-center {
                font-size: 2.4em;
                text-align: center;
                line-height: 1;
            }

            .card-rank-red {
                color: #d11a2a;
            }

            .card-rank-black {
                color: #171717;
            }

            .empty-foundation {
                font-size: 42px;
                opacity: 0.6;
            }

            .face-down {
                font-size: 24px;
                background: linear-gradient(135deg, #2f6ae6, #1247b7);
                color: white;
                border-color: #0d3a8f;
            }
        `;

        document.head.appendChild(style);
    }

    createTutorial() {
        const style = document.createElement('style');
        style.id = 'solitaire-tutorial-styles';

        style.textContent = `
            #solitaire-tutorial {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 18px;
                box-sizing: border-box;
                background: rgba(4, 20, 13, .94);
                color: #fff;
                font-family: Arial, sans-serif;
            }

            #solitaire-tutorial .tutorial-panel {
                width: min(760px, 100%);
                max-height: 94vh;
                overflow: auto;
                background: linear-gradient(145deg, #1d593b, #103522);
                border: 1px solid rgba(255,255,255,.22);
                border-radius: 18px;
                padding: 24px;
                box-shadow: 0 18px 60px rgba(0,0,0,.45);
                text-align: center;
            }

            #solitaire-tutorial h2 {
                color: #ffe29a;
                margin: 0 0 8px;
            }

            #solitaire-tutorial .tutorial-lead {
                color: #e3f0e7;
                line-height: 1.6;
            }

            #solitaire-tutorial .tutorial-progress {
                height: 7px;
                background: rgba(255,255,255,.18);
                border-radius: 9px;
                margin: 18px 0;
                overflow: hidden;
            }

            #solitaire-tutorial .tutorial-progress span {
                display: block;
                height: 100%;
                background: #f4d477;
                transition: width .2s;
            }

            #solitaire-tutorial .tutorial-board {
                display: flex;
                justify-content: center;
                align-items: flex-start;
                gap: 24px;
                flex-wrap: wrap;
                margin: 24px 0 18px;
            }

            #solitaire-tutorial .tutorial-slot {
                width: 104px;
                height: 146px;
                border: 2px dashed rgba(255,255,255,.55);
                border-radius: 11px;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                position: relative;
                background: rgba(0,0,0,.13);
                padding-top: 4px;
                box-sizing: border-box;
            }

            #solitaire-tutorial .tutorial-slot small {
                position: absolute;
                bottom: -25px;
                left: 0;
                right: 0;
                color: #e2eee5;
                font-size: 12px;
            }

            #solitaire-tutorial .tutorial-card {
                width: 94px;
                height: 132px;
                border-radius: 9px;
                background: #fff;
                color: #151515;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 8px;
                box-sizing: border-box;
                font-size: 22px;
                font-weight: bold;
                cursor: grab;
                user-select: none;
                box-shadow: 0 4px 12px rgba(0,0,0,.3);
            }

            #solitaire-tutorial .tutorial-card.red {
                color: #d21d32;
            }

            #solitaire-tutorial .tutorial-card .suit {
                text-align: center;
                font-size: 43px;
            }

            #solitaire-tutorial .tutorial-card[draggable="true"]:active {
                cursor: grabbing;
            }

            #solitaire-tutorial .tutorial-slot.over {
                background: rgba(255,220,100,.22);
                border-color: #ffe29a;
            }

            #solitaire-tutorial .tutorial-stock {
                width: 104px;
                height: 146px;
                border: 2px dashed rgba(255,255,255,.55);
                border-radius: 11px;
                background: #164b9a;
                color: white;
                font-size: 17px;
                font-weight: bold;
                cursor: pointer;
            }

            #solitaire-tutorial .tutorial-actions {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
                margin-top: 22px;
            }

            #solitaire-tutorial button {
                border: 0;
                border-radius: 9px;
                padding: 12px 20px;
                font-size: 15px;
                font-weight: bold;
                cursor: pointer;
                min-width: 130px;
            }

            #solitaire-tutorial .tutorial-primary {
                background: #f4d477;
                color: #173b29;
            }

            #solitaire-tutorial .tutorial-secondary {
                background: rgba(255,255,255,.14);
                color: #fff;
            }

            #solitaire-tutorial .tutorial-feedback {
                min-height: 24px;
                color: #ffe29a;
                font-weight: bold;
            }

            @media(max-width:520px) {
                #solitaire-tutorial .tutorial-panel {
                    padding: 18px 12px;
                }

                #solitaire-tutorial .tutorial-board {
                    gap: 14px;
                }

                #solitaire-tutorial .tutorial-slot,
                #solitaire-tutorial .tutorial-stock {
                    width: 84px;
                    height: 120px;
                }

                #solitaire-tutorial .tutorial-card {
                    width: 76px;
                    height: 106px;
                    font-size: 18px;
                }

                #solitaire-tutorial .tutorial-card .suit {
                    font-size: 34px;
                }
            }
        `;

        document.head.appendChild(style);

        this.tutorialStep = 0;
        this.tutorialDone = false;

        this.tutorialRoot = document.createElement('div');
        this.tutorialRoot.id = 'solitaire-tutorial';

        document.body.appendChild(this.tutorialRoot);

        this.renderTutorialStep();
    }

    tutorialCard(rank, suit, draggable = true) {
        const red = suit === '♥' || suit === '♦';

        return `<div class="tutorial-card ${red ? 'red' : ''}"
                    draggable="${draggable}"
                    data-tutorial-card="${rank}${suit}">
                    <div>${rank} ${suit}</div>
                    <div class="suit">${suit}</div>
                    <div style="transform:rotate(180deg)">
                        ${rank} ${suit}
                    </div>
                </div>`;
    }

    renderTutorialStep() {
        if (!this.tutorialRoot || this.tutorialDone) return;

        const steps = [
            {
                title: 'STEP 1：数字を小さくしながら赤と黒を交互に重ねる',
                lead: '場札では、数字が1つずつ小さくなるように、赤と黒のカードを交互に重ねます。例えば、黒い7の上には赤い6、その上には黒い5を置けます。今回は「6♥」を「7♠」の上にドラッグしてください。',
                board: `
                    <div class="tutorial-slot"
                         data-tutorial-target="tableau">
                        ${this.tutorialCard('7','♠')}
                        <small>移動先：7♠</small>
                    </div>
                    <div class="tutorial-slot"
                         data-tutorial-target="source">
                        ${this.tutorialCard('6','♥')}
                        <small>動かすカード：6♥</small>
                    </div>
                `,
                hint: 'ヒント：置くカードは、下のカードより数字が1つ小さく、色も赤・黒で交互になる必要があります。K、Q、J、10、9……の順に小さくなります。'
            },
            {
                title: 'STEP 2：組札にAを置く',
                lead: '右上の4つの組札には、同じマークをAから順番に重ねます。A♦を組札の空いている場所へドラッグしてください。',
                board: `
                    <div class="tutorial-slot"
                         data-tutorial-target="foundation">
                        <div style="font-size:42px;align-self:center;color:#ffe29a">
                            A
                        </div>
                        <small>組札：Aから開始</small>
                    </div>
                    <div class="tutorial-slot"
                         data-tutorial-target="source">
                        ${this.tutorialCard('A','♦')}
                        <small>動かすカード：A♦</small>
                    </div>
                `,
                hint: 'ヒント：組札はAから始めます。次は同じマークの2です。'
            },
            {
                title: 'STEP 3：山札からカードを引く',
                lead: '場札で動かせるカードがないときは、山札をクリックして新しいカードをめくります。山札をクリックしてください。',
                board: `
                    <button class="tutorial-stock"
                            data-tutorial-stock="true">
                        📦<br>山札<br><small>クリック</small>
                    </button>
                    <div class="tutorial-slot" data-tutorial-waste="true">
                        <div style="align-self:center;color:#e5eee7;font-size:13px">
                            めくったカードが<br>ここに出ます
                        </div>
                        <small>めくり札</small>
                    </div>
                `,
                hint: 'ヒント：山札をクリックすると、次のカードが表向きになります。'
            },
            {
                title: 'STEP 4：空いた列にはKを置く',
                lead: '場札の列が空になった場合、その場所にはK（キング）だけを置くことができます。K♣を空いた列へドラッグしてください。',
                board: `
                    <div class="tutorial-slot"
                         data-tutorial-target="empty">
                        <small>空いた列</small>
                    </div>
                    <div class="tutorial-slot"
                         data-tutorial-target="source">
                        ${this.tutorialCard('K','♣')}
                        <small>動かすカード：K♣</small>
                    </div>
                `,
                hint: 'ヒント：空の列に置けるのはKだけです。'
            }
        ];

        const step = steps[this.tutorialStep];
        const progress = (this.tutorialStep / steps.length) * 100;

        this.tutorialRoot.innerHTML = `
            <div class="tutorial-panel">
                <div style="letter-spacing:3px;color:#f4d477;font-weight:bold">
                    SOLITAIRE TUTORIAL
                </div>

                <h2>${step.title}</h2>

                <p class="tutorial-lead">
                    ${step.lead}
                </p>

                <div class="tutorial-progress">
                    <span style="width:${progress}%"></span>
                </div>

                <div class="tutorial-board">
                    ${step.board}
                </div>

                <p class="tutorial-feedback" id="tutorial-feedback">
                    カードを実際に動かしてみましょう。
                </p>

                <p style="font-size:13px;color:#dce9df">
                    ${step.hint}
                </p>

                <div class="tutorial-actions">
                    <button class="tutorial-secondary" id="tutorial-skip">
                        スキップしてゲーム開始
                    </button>
                </div>

                <p style="font-size:12px;color:#c8d9cd;margin-top:14px">
                    チュートリアル ${this.tutorialStep + 1} / ${steps.length}
                </p>
            </div>
        `;

        this.tutorialRoot.querySelector('#tutorial-skip').onclick = () => {
            this.finishTutorial();
        };

        const source = this.tutorialRoot.querySelector(
            '[data-tutorial-target="source"] .tutorial-card'
        );

        if (source) {
            source.addEventListener('dragstart', e => {
                e.dataTransfer.setData(
                    'text/plain',
                    source.dataset.tutorialCard
                );

                e.dataTransfer.effectAllowed = 'move';
            });
        }

        this.tutorialRoot.querySelectorAll(
            '[data-tutorial-target]'
        ).forEach(target => {

            target.addEventListener('dragover', e => {
                e.preventDefault();
                target.classList.add('over');
            });

            target.addEventListener('dragleave', () => {
                target.classList.remove('over');
            });

            target.addEventListener('drop', e => {
                e.preventDefault();
                target.classList.remove('over');

                const card = e.dataTransfer.getData('text/plain');
                const targetType = target.dataset.tutorialTarget;

                const correct =
                    (this.tutorialStep === 0 &&
                     card === '6♥' &&
                     targetType === 'tableau') ||

                    (this.tutorialStep === 1 &&
                     card === 'A♦' &&
                     targetType === 'foundation') ||

                    (this.tutorialStep === 3 &&
                     card === 'K♣' &&
                     targetType === 'empty');

                if (correct) {
                    target.innerHTML = this.tutorialCard(
                        this.tutorialStep === 0 ? '6' :
                        this.tutorialStep === 1 ? 'A' : 'K',

                        this.tutorialStep === 0 ? '♥' :
                        this.tutorialStep === 1 ? '♦' : '♣',

                        false
                    ) + '<small>移動できました！</small>';

                    this.completeTutorialStep();

                } else {
                    this.showTutorialFeedback(
                        'その場所には置けません。説明とヒントを確認してみましょう。'
                    );
                }
            });
        });

        const stock = this.tutorialRoot.querySelector(
            '[data-tutorial-stock]'
        );

        if (stock) {
            stock.onclick = () => {

                const waste = this.tutorialRoot.querySelector(
                    '[data-tutorial-waste]'
                );

                if (waste) {
                    waste.innerHTML = this.tutorialCard('9', '♥', false) +
                        '<small>めくり札</small>';
                }

                stock.disabled = true;

                this.completeTutorialStep();
            };
        }
    }

    showTutorialFeedback(message) {
        const feedback = this.tutorialRoot.querySelector(
            '#tutorial-feedback'
        );

        if (feedback) {
            feedback.textContent = message;
        }
    }

    completeTutorialStep() {
        this.showTutorialFeedback(
            '正解！ルールを覚えました。次の説明に進みます。'
        );

        const next = document.createElement('button');
        next.className = 'tutorial-primary';

        next.textContent = this.tutorialStep === 3
            ? 'ゲームを始める'
            : '次へ';

        next.onclick = () => {
            this.tutorialStep++;

            if (this.tutorialStep >= 4) {
                this.finishTutorial();
            } else {
                this.renderTutorialStep();
            }
        };

        const actions = this.tutorialRoot.querySelector(
            '.tutorial-actions'
        );

        if (actions &&
            !actions.querySelector('.tutorial-primary')) {
            actions.prepend(next);
        }
    }

    finishTutorial() {
        this.tutorialDone = true;

        if (this.tutorialRoot) {
            this.tutorialRoot.remove();
        }

        const container = document.getElementById('game-container');

        if (container) {
            container.style.display = 'flex';
        }
    }

    init() {
        this.render();
    }

    newGame() {
        this.game = new Solitaire();
        this.draggedData = null;
        this.render();
    }

    render() {
        const container = document.getElementById('game-container');

        if (!container) return;

        container.innerHTML = '';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.margin = '0 auto';

        const topArea = document.createElement('div');
        topArea.className = 'top-area';
        topArea.style.display = 'flex';
        topArea.style.justifyContent = 'space-between';
        topArea.style.alignItems = 'center';
        topArea.style.marginBottom = '8px';
        topArea.style.width = 'min(92vw, 1000px)';

        // 山札とめくり札
        const leftArea = document.createElement('div');
        leftArea.style.display = 'flex';
        leftArea.style.gap = '12px';
        leftArea.style.alignItems = 'center';

        const stockDiv = document.createElement('div');
        stockDiv.className = 'pile stock';
        stockDiv.id = 'stock';

        stockDiv.textContent = this.game.stock.length > 0
            ? `📦 ${this.game.stock.length}`
            : '空';

        stockDiv.onclick = () => this.onStockClick();
        stockDiv.ondragover = (e) => this.handleDragOver(e);
        stockDiv.ondrop = (e) => this.handleDropOnStock(e);

        leftArea.appendChild(stockDiv);

        const wasteDiv = document.createElement('div');
        wasteDiv.className = 'pile waste';
        wasteDiv.id = 'waste';

        if (this.game.waste.length > 0) {
            const card = this.game.waste[
                this.game.waste.length - 1
            ];

            wasteDiv.innerHTML = this.renderCardHTML(card);

            const cardElement = wasteDiv.querySelector('.card');

            if (cardElement) {
                cardElement.draggable = true;

                cardElement.ondragstart = (e) => {
                    this.handleDragStart(e, 'waste', -1);
                };
            }
        } else {
            wasteDiv.textContent = '空';
        }

        leftArea.appendChild(wasteDiv);
        topArea.appendChild(leftArea);

        // 操作ボタン
        const rightArea = document.createElement('div');
        rightArea.style.display = 'flex';
        rightArea.style.gap = '8px';
        rightArea.style.alignItems = 'center';

        // 一手戻すボタン
        const undoBtn = document.createElement('button');
        undoBtn.textContent = '一手戻す';
        undoBtn.title = '一手戻す';

        undoBtn.onclick = () => {
            if (this.game.undo()) {
                this.render();
            }
        };

        rightArea.appendChild(undoBtn);

        // 新しいゲームボタン
        const newGameBtn = document.createElement('button');
        newGameBtn.textContent = '新しいゲーム';
        newGameBtn.title = '新しいゲームを開始';

        newGameBtn.onclick = () => {
            if (confirm(
                '新しいゲームを開始しますか？ 現在の進行は失われます。'
            )) {
                this.newGame();
            }
        };

        rightArea.appendChild(newGameBtn);
        topArea.appendChild(rightArea);

        container.appendChild(topArea);

        // 組札
        const foundationArea = document.createElement('div');
        foundationArea.className = 'foundation-area';
        foundationArea.style.display = 'flex';
        foundationArea.style.gap = '14px';
        foundationArea.style.justifyContent = 'center';
        foundationArea.style.width = 'min(92vw, 1000px)';

        const suits = ['♠', '♥', '♦', '♣'];

        this.game.foundations.forEach((foundation, i) => {
            const div = document.createElement('div');
            div.className = 'pile foundation';
            div.id = `foundation-${i}`;

            div.ondragover = (e) => this.handleDragOver(e);

            div.ondrop = (e) => {
                this.handleDropOnFoundation(e, i);
            };

            if (foundation.length > 0) {
                const card = foundation[foundation.length - 1];

                div.innerHTML = this.renderCardHTML(card);

                const cardElement = div.querySelector('.card');

                if (cardElement) {
                    cardElement.draggable = true;

                    cardElement.ondragstart = (e) => {
                        this.handleDragStart(e, 'foundation', i);
                    };
                }
            } else {
                div.innerHTML = `
                    <div class="empty-foundation">${suits[i]}</div>
                `;
            }

            foundationArea.appendChild(div);
        });

        container.appendChild(foundationArea);

        // 場札
        const tableauArea = document.createElement('div');
        tableauArea.className = 'tableau-area';
        tableauArea.style.display = 'flex';
        tableauArea.style.gap = '14px';
        tableauArea.style.justifyContent = 'center';
        tableauArea.style.width = 'min(92vw, 1000px)';

        this.game.tableau.forEach((column, colIndex) => {
            const colDiv = document.createElement('div');

            colDiv.className = 'tableau-column';
            colDiv.id = `tableau-${colIndex}`;

            colDiv.ondragover = (e) => this.handleDragOver(e);

            colDiv.ondrop = (e) => {
                this.handleDropOnTableau(e, colIndex);
            };

            colDiv.style.minHeight = '500px';
            colDiv.style.height = '100%';

            column.forEach((card, cardIndex) => {
                const cardDiv = document.createElement('div');

                cardDiv.className = `card ${
                    !card.faceUp ? 'face-down' : 'face-up'
                }`;

                cardDiv.draggable = card.faceUp;

                cardDiv.style.position = 'absolute';
                cardDiv.style.left = '0';
                cardDiv.style.top = `${cardIndex * 28}px`;
                cardDiv.style.zIndex = String(100 + cardIndex);

                if (card.faceUp) {
                    const colorClass = card.getColor() === 'red'
                        ? 'card-rank-red'
                        : 'card-rank-black';

                    cardDiv.innerHTML = `
                        <div class="card-top ${colorClass}">
                            <div>${card.rank}</div>
                            <div>${card.suit}</div>
                        </div>

                        <div class="card-center ${colorClass}">
                            ${card.suit}
                        </div>

                        <div class="card-bottom ${colorClass}">
                            <div>${card.rank}</div>
                            <div>${card.suit}</div>
                        </div>
                    `;

                    cardDiv.ondragstart = (e) => {
                        this.handleDragStart(
                            e,
                            'tableau',
                            colIndex,
                            cardIndex
                        );
                    };

                    cardDiv.style.cursor = 'grab';

                    cardDiv.onmousedown = () => {
                        cardDiv.style.cursor = 'grabbing';
                    };

                    cardDiv.onmouseup = () => {
                        cardDiv.style.cursor = 'grab';
                    };

                } else {
                    // 裏向きのカードはクリックしてもめくれない
                    cardDiv.textContent = '🂠';

                    cardDiv.onclick = null;
                    cardDiv.draggable = false;
                    cardDiv.style.cursor = 'default';
                }

                colDiv.appendChild(cardDiv);
            });

            tableauArea.appendChild(colDiv);
        });

        container.appendChild(tableauArea);

        if (this.game.isWon()) {
            setTimeout(() => {
                alert('🎉 ゲーム完了！おめでとうございます！');
            }, 100);
        }
    }

    renderCardHTML(card) {
        const colorClass = card.getColor() === 'red'
            ? 'card-rank-red'
            : 'card-rank-black';

        return `
            <div class="card" style="pointer-events: auto;">
                <div class="card-top ${colorClass}">
                    <div>${card.rank}</div>
                    <div>${card.suit}</div>
                </div>

                <div class="card-center ${colorClass}">
                    ${card.suit}
                </div>

                <div class="card-bottom ${colorClass}">
                    <div>${card.rank}</div>
                    <div>${card.suit}</div>
                </div>
            </div>
        `;
    }

    handleDragStart(e, sourceType, sourceIndex, cardIndex = -1) {
        this.draggedData = {
            sourceType,
            sourceIndex,
            cardIndex
        };

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

        const {
            sourceType,
            sourceIndex,
            cardIndex
        } = this.draggedData;

        let success = false;

        if (sourceType === 'tableau' && sourceIndex !== toCol) {
            success = this.game.moveInTableau(
                sourceIndex,
                toCol,
                cardIndex
            );

        } else if (sourceType === 'foundation') {
            success = this.game.moveFromFoundationToTableau(
                sourceIndex,
                toCol
            );

        } else if (sourceType === 'waste') {
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
            success = this.game.moveToFoundation(
                'tableau',
                sourceIndex,
                toFoundation
            );
        } else if (sourceType === 'waste') {
            success = this.game.moveToFoundation(
                'waste',
                -1,
                toFoundation
            );
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

        // 裏向きのカードは操作できない
        if (!card || !card.faceUp) {
            return;
        }

        // 表向きのカードだけ組札への移動を試す
        if (this.game.moveToFoundation('tableau', colIndex)) {
            this.render();
            return;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new GameUI();
});
