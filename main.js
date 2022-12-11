/**
 * @author Victor Taran <tarvics@gmail.com>
 */

/**
 * Клас реалізації картки
 * @class {Object} Card
 */
class Card {
    #imagePath;
    #element;

    /**
     * Конструктор класу Card
     * @param {string} image Ім'я файлу із малюнком на передній частині карти
     */
    constructor(image) {
        this.#imagePath = `images/${image}`;

        this.#element = document.createElement("div");
        this.#element.className = 'flip-card';

        const card = document.createElement("div");
        card.className = 'card is-flipped';

        const front = document.createElement("div");
        front.className = 'card-face card-face-front';
        front.style.backgroundImage = `url('${this.imagePath}')`;

        const back = document.createElement("div");
        back.className = 'card-face card-face-back';
        back.style.backgroundImage = "url('images/tile-bg.png')";
        card.append(front, back);

        this.#element.appendChild(card);
        this.#element.connectedCard = this;
    }

    /**
     * Перегортання карти
     */
    flip() {
        this.#element.children[0].classList.toggle('is-flipped');
    }

    /**
     * Видалення посилання на об'єкт карти у випадку, коли до карти знайдено пару
     */
    disconnectFromDOM() {
        this.#element.connectedCard = null;
    }

    /**
     * Шлях до файлу із малюнком на передній частині карти
     */
    get imagePath() {
        return this.#imagePath;
    }

    /**
     * Посилання на графічне представлення карти
     */
    get element() {
        return this.#element;
    }
}

/**
 * Клас реалізації поля із картками
 * @class {Object} Deck
 */
class Deck {

    /**
     * Тасування масиву з використанням алгоритму Фішера-Єйтса у варианті Дурштенфельда
     */
    #shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Створення набору парних кард для гри із наступним їх тасуванням
     */
    shuffle() {
        this.cards = [];

        const indexes = Array.from(new Array(36),(x, i) => i);

        while (this.cards.length < 20) {
            const index = Math.floor(Math.random() * indexes.length);
            const value = indexes[index];
            indexes.splice(index, 1);

            const image = 'tile-' + (value < 10 ? '0' + value : value) + '.png';
            this.cards.push(new Card(image));
            this.cards.push(new Card(image));
        }

        this.#shuffleArray(this.cards);
    }

    /**
     * Видалення використаної карти у випадку, якщо їй було знайдено пару
     * @param {Card} card Об'єкт ігрової карти
     */
    removeCard(card) {
        let index = this.cards.findIndex(item => item.imagePath === card.imagePath);
        if (index !== -1) {
            this.cards.splice(index, 1);
            card.disconnectFromDOM();
        }
    }
}

/**
 * Клас зображення таймера гри
 * @class {Object} ScoreTimer
 */
class ScoreTimer {
    #active = false;
    #scoreTime;
    #startTime;
    #timeOutput;
    #timer = null;

    /**
     * Callback функція для виведення активного часу гри
     */
    #timerTick() {
        const currTime = new Date();
        const delta = (currTime - this.#startTime) / 1000;
        const min = Math.floor(delta / 60);
        const sec = Math.floor(delta % 60);

        this.#timeOutput.textContent = `${min < 10 ? '0' + min : min}:${sec < 10 ? '0' + sec : sec}`;

        if (this.#active) {
            if (this.#timer) clearTimeout(this.#timer);
            this.#timer = setTimeout(this.#timerTick.bind(this), 1000);
        }
    }

    /**
     * Конструктор класу ScoreTimer
     */
    constructor() {
        this.#timeOutput = document.getElementById('timeOutput');
        this.#scoreTime = this.#timeOutput.parentNode;
        this.clear();
    }

    /**
     * Запуск таймера гри
     */
    start() {
        this.#startTime = new Date();
        this.#active = true;
        this.#timerTick();
    }

    /**
     * Зупинка таймера гри
     */
    stop() {
        this.#active = false;
    }

    /**
     * Очищення таймера гри
     */
    clear() {
        this.stop();
        if (this.#timer) clearTimeout(this.#timer);
        this.#startTime = new Date();
        this.#timerTick();
    }

    get active() { return this.#active }
}

/**
 * Клас реалізації логіки "Memory Game"
 * @class {Object} GameManager
 */
class GameManager {
    #stickerElement;
    #warningElement;
    #startButtonElement;
    #boardElement;
    #scoreElement;

    #deck = new Deck();
    #firstCard = null;
    #secondCard = null;

    #attemptNumber = 0;
    #scoreTimer;
    #waitCounter = 0;
    #waitTimer = null;

    /**
     * Інціалізація посилань на елементи
     */
    #init() {
        this.#warningElement = document.getElementById('rotate-words');

        this.#stickerElement = document.querySelector('.sticker');
        this.gameTitle = '';

        this.#startButtonElement = document.querySelector("#startGame");
        this.#startButtonElement.addEventListener("click", () => this.startGame());

        this.#scoreElement = document.querySelector("#attemptNumOutput");

        this.#boardElement = document.querySelector("#board");
        this.#boardElement.addEventListener("click", e => {
            const el = e.target.closest('.flip-card');
            if (!el) return;
            const clickedCard = el.connectedCard;

            if (clickedCard) {
                this.selectCard(clickedCard);
            }
        });
    }

    /**
     * Конструктор класу GameManager
     */
    constructor() {
        this.#init();

        this.#scoreTimer = new ScoreTimer();
        this.#prepareDeck();
    }

    /**
     * Ініціалізація класу GameManager
     */
    static run() {
        return new GameManager();
    }

    /**
     * Показ відкритих карт для запам'ятовування перед початком гри
     */
    #waitReady() {
        if (this.#waitCounter === 5) {
            this.#warningElement.style.display = 'inline-block';
            this.#stickerElement.style.opacity = '0';
        }

        const warningInner = this.#warningElement.firstElementChild;

        warningInner.classList.add('rotate');
        warningInner.textContent = `Get ready ${this.#waitCounter}`;
        if (this.#waitTimer) clearTimeout(this.#waitTimer);

        this.#waitTimer = setTimeout(() => {
            warningInner.style.opacity = '0';
            warningInner.classList.remove('rotate');
            this.#waitCounter--;
            if (this.#waitCounter > 0) {
                this.#waitTimer = setTimeout(() => this.#waitReady(), 200);
            } else {
                this.#warningElement.style.display = 'none';
                this.gameTitle = '';
                this.#stickerElement.style.opacity = '1';
                this.#flipAll();
                this.#scoreTimer.start();
            }
        }, 800);
    }

    /**
     * Перегортання усіх кард одночасно
     */
    #flipAll() {
        setTimeout(() => this.#deck.cards.forEach(card => card.flip()), 500);
    }

    /**
     * Запуск гри
     */
    startGame() {
        this.#waitCounter = 5;
        this.#scoreTimer.clear();
        this.attemptNumber = 0;
        this.#prepareDeck();

        this.#flipAll();
        this.#waitReady();
    }

    /**
     * Підготовка ігрового поля перед грою
     */
    #prepareDeck() {
        this.attemptNumber = 0;
        this.#deck = new Deck();
        this.#boardElement.innerHTML = "";
        this.#deck.shuffle();
        this.#deck.cards.forEach(card => this.#boardElement.append(card.element));
    }

    /**
     * Встановлення елементу css клас на короткий проміжок часу
     * @param {HTMLElement} element Посилання на елемент
     * @param {string} className Назва класу
     * @param {number} timeout Час, на який буде встановлено css клас
     */
    setTemporaryClass = (element, className, timeout) => {
        element.classList.add(className);
        setTimeout(() => {
            element.classList.remove(className);
        }, timeout);
    }

    /**
     * Спрацювання перегортання карти із наступним аналізом
     * @param {Card} card Об'єкт ігрової карти
     */
    selectCard(card) {
        if(card === this.#firstCard || !this.#scoreTimer.active) return;

        card.flip();

        if (this.#firstCard && this.#secondCard) {
            // this.#firstCard.flip();
            // this.#secondCard.flip();
            //
            // this.#firstCard = this.#secondCard = null;

            this.#firstCard.flip();
            this.#firstCard = this.#secondCard;
            this.#secondCard = null;
        }

        if (!this.#firstCard) {
            this.#firstCard = card;
        } else if (!this.#secondCard) {
            this.attemptNumber++;
            this.#secondCard = card;

            if (this.#firstCard.imagePath === card.imagePath) {
                this.setTemporaryClass(this.#firstCard.element, 'constant-tilt-shake', 800);
                this.setTemporaryClass(this.#secondCard.element, 'constant-tilt-shake', 800);

                this.#deck.removeCard(this.#firstCard);
                this.#deck.removeCard(this.#secondCard);

                this.#firstCard = this.#secondCard = null;

                if (!this.#deck.cards.length) {
                    this.gameTitle = 'Game over';
                    this.#scoreTimer.stop();
                }
            }
        }
    }

    /**
     * Повернення кількості спроб
     * @returns {number}
     */
    get attemptNumber() {
        return this.#attemptNumber;
    }

    /**
     * Встановлення кількості спроб
     * @param value
     */
    set attemptNumber(value) {
        this.#attemptNumber = value;
        this.#scoreElement.innerHTML = value;
    }

    /**
     * Встановлення заголоку гри
     * @param value
     */
    set gameTitle(value) {
        if (!value) value = 'Memory game';
        this.#stickerElement.style.opacity = '0';
        this.#stickerElement.dataset.text = value;
        this.#stickerElement.firstElementChild.textContent = value;
        setTimeout(() => {this.#stickerElement.style.opacity = '1'}, 500);
    }
}

GameManager.run();