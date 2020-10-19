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
    return fetch(card.ingestion.endpoint.urlTemplate)
        .then((response) => response.json())
        .then((cardData) => {
            let cardEvaluation = {markup: '', script: ''};

            switch (card.visualization?.type) {
                case "text":
                    cardEvaluation = getTextCard(card, cardData);
                    break;
                case "pie":
                    cardEvaluation = getPieCard(card, cardData);
                    break;
            
                default:
                    break;
            }
            
            const cardsContainer = getCardsContainer();

            const cardTag = document.createElement('div');
            cardTag.classList.add('card');
            cardTag.innerHTML = cardEvaluation.markup;
            cardsContainer.appendChild(cardTag);
            
            cardTag.style.order = card.order;
            cardTag.style.flexBasis = card.baseSize;
            cardTag.style.width = card.baseSize;

            cardTag.dataset.config = JSON.stringify(cardData);

            eval(cardEvaluation.script);
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

const getPropertyFromObject = (p, o) => p.split('.').reduce((x, y) => x[y], o);

const getTextCard = (config, data) => {
    const content = {
        title: config.title ,
        header: config.header,
        footer: config.footer,
        text: config.visualization?.text?.template.interpolate(data),
    };

    const markup =`
<header>${content.header || content.title || 'no title'}</header>
<article>${content.text || 'no text'}</article>
<footer>${content.footer || 'no footer'}</footer>`;

    const script = ``;
    
    return { markup, script };
};

const getPieCard = (config, data) => {
    const content = {
        title: config.title ,
        header: config.header,
        footer: config.footer,
        objectArray: getPropertyFromObject(config.visualization?.pie?.objectArray, data),
        labelProperty: config.visualization?.pie?.labelProperty,
        valueProperty: config.visualization?.pie?.valueProperty,
    };

    const dataColumns = [];
    content.objectArray.forEach((line) => {
        let i = dataColumns.findIndex(targetLine => targetLine[0] === line[content.labelProperty]);
        if (i < 0) {
            dataColumns.push([line[content.labelProperty]])
            i = dataColumns.length -1;
        }

        dataColumns[i].push(!line[content.valueProperty] ? 1 : line[content.valueProperty]);
    });
  
    const cardId = 'card-c3-' +  Math.round(Math.random()*100000);

    const markup =`
<header>${content.header || content.title || ''}</header>
<article id="${cardId}"></article>
<footer>${content.footer || ''}</footer>
`;

    const script = `
    c3.generate({
        bindto: '#${cardId}',
        data: {
            type: 'pie',
            columns: ${JSON.stringify(dataColumns)}
        }
    });
`;

    return { markup, script };
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('code').forEach((block) => {
      hljs.highlightBlock(block);
    });
  });