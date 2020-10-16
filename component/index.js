String.prototype.slugify = function (separator = "-") {
    return this
        .toString()
        .normalize('NFD')                   // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '')   // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, separator);
};

String.prototype.interpolate = function(params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${this}\`;`)(...vals);
};

const getDashboardContainer = () => document.getElementById('dash-board');

const getCardsContainer = () => getDashboardContainer().querySelector('.cards');
const getConfigurationContainer = () => getDashboardContainer().querySelector('.configuration');

const getSpinner = () => getDashboardContainer().querySelector('.spinner');
const getConfigureButton = () => getDashboardContainer().querySelector('.config-button');

const getDashboardHeaderTitle = () => getDashboardContainer().querySelector('header > .title');
const getDashboardFooter = () => getDashboardContainer().querySelector('footer');


const loadCard = async (card) => {
    return fetch(card.url)
        .then((response) => response.json())
        .then((cardData) => {
            const cardContent = JSON.stringify(cardData, null, 2);

            const cardTemplate =
                `<header>${card.header || card.title || ''}</header>
                <article>${cardContent || ''}</article>
                <footer>${card.footer || ''}</footer>`;
            
            const cardTag = document.createElement('div');
            cardTag.classList.add('card');
            cardTag.innerHTML = cardTemplate;
            cardTag.style.order = card.order;
            cardTag.style.flexBasis = card.baseSize;
            cardTag.style.width = card.baseSize;

            cardTag.dataset.config = cardContent;

            const cardsContainer = getCardsContainer();
            cardsContainer.appendChild(cardTag);
        });
};

const loadAllCards = (cards) => {
    Promise.all(cards.map(c => loadCard(c)));
};

const toggleShowCards = (showCards) => {
    const cards = getCardsContainer();
    const config = getConfigurationContainer();

    if (showCards) {
        cards.style.display = 'none';
        config.style.display = 'flex';
    }

    cards.style.display = cards.style.display === 'flex' ? 'none' : 'flex';
    config.style.display = config.style.display === 'flex' ? 'none' : 'flex';
};

const configure = () => {
    toggleShowCards();

    const configData = JSON.parse(getDashboardContainer().dataset.config);
    console.log(configData);

    

    // const cards = getCardsContainer();
    // const configuration = getConfigurationContainer();

    document.querySelectorAll('code').forEach((block) => {
      hljs.highlightBlock(block);
    });
};

const loadDashboard = () => {
    toggleShowCards(true);
    // toggleShowCards();
    getConfigureButton().addEventListener('click', configure);

    fetch(config.endpoints.dashboard)
        .then((response) => response.json())
        .then((dashboard) => {
            getDashboardContainer().dataset.config = JSON.stringify(dashboard, null, 2);

            const spinner = getSpinner();
            spinner.hidden = false;
            spinner.innerHTML = dashboard.spinner || '<em>loading...</em>';
            
            getDashboardHeaderTitle().innerHTML = dashboard.header || '';
            getDashboardFooter().innerHTML = dashboard.footer || '';
            
            loadAllCards(dashboard.cards);
        })
        .catch((err) => console.log(err))
        .then(() => {
            getSpinner().hidden = true;
        });
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  });