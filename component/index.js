var DashboardConfig = {};
var Editor = {};

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

const getDashboardConfigForm = () => getDashboardContainer().querySelector('#form-config-dashboard');
const getConfigDashboardHeaderField = () => getDashboardConfigForm().querySelector("#dashboardHeaderText");
const getConfigDashboardFooterField = () => getDashboardConfigForm().querySelector("#dashboardFooterText");

const getCardsConfigForm = () => getDashboardContainer().querySelector('#cards-configuration');
const getConfigCardsListField = () => getCardsConfigForm().querySelector("#cards-list");

const getCardMetaForm = () => getDashboardContainer().querySelector('#form-card-meta');
const getCardMetaTitleField = () => getCardMetaForm().querySelector("#meta-title");
const getCardMetaOrderField = () => getCardMetaForm().querySelector("#meta-order");
const getCardMetaBaseSizeField = () => getCardMetaForm().querySelector("#meta-base-size");
const getCardMetaFooterField = () => getCardMetaForm().querySelector("#meta-footer");

const getCardInputConfigForm = () => getDashboardContainer().querySelector('#form-card-input');
const getConfigCardInputsListField = () => getCardInputConfigForm().querySelector('#card-inputs-list');
const getConfigCardInputTypeField = () => getCardInputConfigForm().querySelector('#input-type');
const getConfigCardInputLabelField = () => getCardInputConfigForm().querySelector('#input-label');
const getConfigCardInputNameField = () => getCardInputConfigForm().querySelector('#input-name');
const getConfigCardInputValueField = () => getCardInputConfigForm().querySelector('#input-value');

const getCardIngestionConfigForm = () => getDashboardContainer().querySelector('#form-card-ingestion');
const getConfigCardIngestionEndpointUrlField = () => getCardIngestionConfigForm().querySelector("#endpoint-url");
const getConfigCardIngestionEndpointVerbField = () => getCardIngestionConfigForm().querySelector("#endpoint-verb");
const getConfigCardIngestionEndpointBodyTypeField = () => getCardIngestionConfigForm().querySelector("#endpoint-body-type");
const getConfigCardIngestionEndpointBodyTemplateField = () => getCardIngestionConfigForm().querySelector("#endpoint-body-template");

const getCardVizConfigForm = () => getDashboardContainer().querySelector('#form-card-viz');
const getConfigCardVizTypeField = () => getCardVizConfigForm().querySelector('#viz-type');
const getConfigCardVizTextTemplateField = () => getCardVizConfigForm().querySelector('#viz-text-text-template');
const getConfigCardVizPieObjectArrayField = () => getCardVizConfigForm().querySelector('#viz-pie-object-array-property');
const getConfigCardVizPieLabelField = () => getCardVizConfigForm().querySelector('#viz-pie-label-property');
const getConfigCardVizPieValueField = () => getCardVizConfigForm().querySelector('#viz-pie-value-property');

const getSpinner = () => getDashboardContainer().querySelector('.spinner');
const getConfigureButton = () => getDashboardContainer().querySelector('.config-button');
const getRefreshButton = () => getDashboardContainer().querySelector('.refresh-button');

const getDashboardHeaderTitle = () => getDashboardContainer().querySelector('header > .title');
const getDashboardFooter = () => getDashboardContainer().querySelector('.dashfooter');

const getCard = (cardObj) => getInputCardFields().querySelector(`#card-${cardObj.title.slugify()}`);
const getInputField = (cardObj, fieldObj) => getCard(cardObj).querySelector(`#card-input-${cardObj.title.slugify()}-${fieldObj.name.slugify()}`);
// const getInputFields = (card) => card.querySelectorAll('.card-inputs');

const loadCard = async (card) => {

    const request = {};

    let vars = {};
    if (card.input.length > 0) {
        card.input.forEach(i => vars[i.name] = i.value);
    }

    request.method = card.ingestion.endpoint.verb;
    
    if (request.method === "POST") {
        request.headers = {
            "Content-Type":"application/json",
        };
        if (card.ingestion.endpoint.bodyType === "json") {
            request.body = card.ingestion.endpoint.bodyTemplate ?
            JSON.stringify(
                card.ingestion.endpoint.bodyTemplate.interpolate(vars)
            ) : null;
        } else if (card.ingestion.endpoint.bodyType === "graphql") {
            request.body = card.ingestion.endpoint.bodyTemplate ?
            JSON.stringify(
                {   query: 
                        `${card.ingestion.endpoint.bodyTemplate.interpolate(vars)}`,
                    variables: vars
                }
            ) : null;
        }
    }

    const url = card.ingestion.endpoint.urlTemplate.interpolate(vars);

    return fetch(url, request)
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
            cardTag.id = `card-${card.title.slugify()}`;
            cardTag.classList.add('card');
            cardTag.innerHTML = cardEvaluation.markup;
            cardsContainer.appendChild(cardTag);
            
            cardTag.style.order = card.order;
            cardTag.style.flexBasis = card.baseSize;
            cardTag.style.width = card.baseSize;

            // cardTag.dataset.config = JSON.stringify(cardData);

            eval(cardEvaluation.script);
        });
};

const clearCardsContainer = () => {
    getCardsContainer().innerHTML = '';
};

const loadAllCards = () => {
    clearCardsContainer();
    Promise.all(DashboardConfig.cards.map(c => loadCard(c)));
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

const loadConfigToForms = () => {
    getConfigDashboardHeaderField().value = DashboardConfig.header || '';
    getConfigDashboardFooterField().value = DashboardConfig.footer || '';
    [...getConfigCardsListField().options].forEach(o => getConfigCardsListField().options.remove(o));
    for(let i = 0; i <= DashboardConfig.cards.length -1; i++) {
        const card = DashboardConfig.cards[i];
        const cardOption = document.createElement("option");
        cardOption.text = card.title;
        cardOption.value = i;
        getConfigCardsListField().options.add(cardOption);
    }
    getConfigCardsListField().selectedIndex = 0;
    getConfigCardsListField().dispatchEvent(new Event('change'));
};

const loadCardInputFields = () => {
    const cardIndex = getConfigCardsListField().selectedIndex;
    const card = DashboardConfig.cards[cardIndex];
    const inputIndex = getConfigCardInputsListField().selectedIndex;

    if (inputIndex >= 0) {
        const input = card.input[inputIndex];

        getConfigCardInputTypeField().value = input.type || '';
        getConfigCardInputLabelField().value = input.label || '';
        getConfigCardInputNameField().value = input.name || '';
        getConfigCardInputValueField().value = input.value || '';
    } else {
        getConfigCardInputTypeField().value = '';
        getConfigCardInputLabelField().value = '';
        getConfigCardInputNameField().value = '';
        getConfigCardInputValueField().value = '';
    }

};

const loadCardConfigurationFields = () => {
    const cardIndex = getConfigCardsListField().selectedIndex;
    const card = DashboardConfig.cards[cardIndex];

    getCardMetaTitleField().value = card.title;
    getCardMetaOrderField().value = card.order;
    getCardMetaBaseSizeField().value = card.baseSize;
    getCardMetaFooterField().value = card.footer;

    const inputsSelect = getConfigCardInputsListField();
    [...getConfigCardInputsListField().options].forEach(o => getConfigCardInputsListField().options.remove(o));
    for(let i = 0; i <= card.input.length -1; i++) {
        const input = card.input[i];
        const inputOption = document.createElement("option");
        inputOption.text = input.label;
        inputOption.value = i;
        getConfigCardInputsListField().options.add(inputOption);
    }
    getConfigCardInputsListField().selectedIndex = 0;
    getConfigCardInputsListField().dispatchEvent(new Event('change'));
    
    getConfigCardIngestionEndpointUrlField().value = card.ingestion.endpoint.urlTemplate;
    
    getConfigCardIngestionEndpointVerbField().value = card.ingestion.endpoint.verb;
    getConfigCardIngestionEndpointVerbField().dispatchEvent(new Event('change'));
    
    getConfigCardIngestionEndpointBodyTypeField().value = card.ingestion.endpoint.bodyType;
    getConfigCardIngestionEndpointBodyTypeField().dispatchEvent(new Event('change'));
    
    Editor.setValue(card.ingestion.endpoint.bodyTemplate || '');
    
    getConfigCardVizTypeField().value = card.visualization.type;
    getConfigCardVizTypeField().dispatchEvent(new Event('change'));

    getConfigCardVizTextTemplateField().value = card.visualization.text?.template || '';
    
    getConfigCardVizPieObjectArrayField().value = card.visualization.pie?.objectArray || '';
    getConfigCardVizPieLabelField().value = card.visualization.pie?.labelProperty || '';
    getConfigCardVizPieValueField().value = card.visualization.pie?.valueProperty || '';
};

const configure = () => {
    toggleShowCards();
    refreshDashboard();
};

const setDashboardConfig = (e) => {
    e.preventDefault();
    DashboardConfig.header = getConfigDashboardHeaderField().value;
    DashboardConfig.footer = getConfigDashboardFooterField().value;
    refreshDashboard();
};

const refreshDashboard = () => {
    getDashboardHeaderTitle().innerHTML = DashboardConfig.header || '';
    getDashboardFooter().innerHTML = DashboardConfig.footer || '';
    loadAllCards();
    loadConfigToForms();
};

const adjustVerbFields = () => {
    if (getConfigCardIngestionEndpointVerbField().value === "GET") {
        document.getElementById("endpoint-body-type-group").style.visibility = "hidden";
    } else {
        document.getElementById("endpoint-body-type-group").style.visibility = "";
    }
};

const adjustVizTypeFields = () => {
    if (getConfigCardVizTypeField().value === "text") {
        document.getElementById('viz-type-text-group').style.visibility = "";
        document.getElementById('viz-type-pie-group').style.visibility = "hidden";
    } else if (getConfigCardVizTypeField().value === "pie") {
        document.getElementById('viz-type-text-group').style.visibility = "hidden";
        document.getElementById('viz-type-pie-group').style.visibility = "";
    }
};

const adjustEditorMode = () => {
    if (getConfigCardIngestionEndpointBodyTypeField().value === "graphql") {
        setEditorToGraphQLMode();
        document.getElementById("endpoint-body-template-group").style.visibility = "";
        Editor.updateOptions({ readOnly: false });
    } else if (getConfigCardIngestionEndpointBodyTypeField().value === "json") {
        setEditorToJSONMode();
        document.getElementById("endpoint-body-template-group").style.visibility = "";
        Editor.updateOptions({ readOnly: true });
    } else {
        document.getElementById("endpoint-body-template-group").style.visibility = "hidden";
        Editor.updateOptions({ readOnly: true });
        Editor.setValue('');
    }
};

const setCardInputConfig = (e) => {
    e.preventDefault();
    const card = DashboardConfig.cards[getConfigCardsListField().selectedIndex];
    const input = card.input[getConfigCardInputsListField().selectedIndex];
    input.type = getConfigCardInputTypeField().value;
    input.label = getConfigCardInputLabelField().value;
    input.name = getConfigCardInputNameField().value;
    input.value = getConfigCardInputValueField().value;
}

const setCardMetaConfig = (e) => {
    e.preventDefault();
    const card = DashboardConfig.cards[getConfigCardsListField().selectedIndex];
    card.title = getCardMetaTitleField().value;
    card.order = getCardMetaOrderField().value;
    card.baseSize = getCardMetaBaseSizeField().value;
    card.footer = getCardMetaFooterField().value;
}

const setCardIngestionConfig = (e) => {
    e.preventDefault();
    const card = DashboardConfig.cards[getConfigCardsListField().selectedIndex];
    card.ingestion.endpoint.urlTemplate = getConfigCardIngestionEndpointUrlField().value;
    card.ingestion.endpoint.verb = getConfigCardIngestionEndpointVerbField().value;
    card.ingestion.endpoint.bodyType = getConfigCardIngestionEndpointBodyTypeField().value;
    card.ingestion.endpoint.bodyTemplate = Editor.getValue();
};

const setCardVizConfig = (e) => {
    e.preventDefault();
    const card = DashboardConfig.cards[getConfigCardsListField().selectedIndex];
    card.visualization = {};
    card.visualization.type = getConfigCardVizTypeField().value;
    
    if (card.visualization.type === "text") {
        card.visualization.text = {
            template: getConfigCardVizTextTemplateField().value,
        };
    } else if (card.visualization.type === "pie") {
        card.visualization.pie = {
            objectArray: getConfigCardVizPieObjectArrayField().value,
            labelProperty: getConfigCardVizPieLabelField().value,
            valueProperty: getConfigCardVizPieValueField().value,
        };
    }
};

const loadDashboard = () => {
    toggleShowCards(true);
    // toggleShowCards();

    fetch(config.endpoints.dashboard)
        .then((response) => response.json())
        .then((dashboard) => {
            DashboardConfig = dashboard;

            const spinner = getSpinner();
            spinner.hidden = false;
            spinner.innerHTML = dashboard.spinner || '<em>loading...</em>';
            
            refreshDashboard();
            // startEditor();
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
        title: config.title,
        header: config.header,
        footer: config.footer,
        objectArray: getPropertyFromObject(config.visualization?.pie?.objectArray, data),
        labelProperty: config.visualization?.pie?.labelProperty,
        valueProperty: config.visualization?.pie?.valueProperty,
    };

    const dataColumns = [];
    const defaultLabel = '-';
    content.objectArray.forEach((line) => {
        let i = dataColumns.findIndex(targetLine => targetLine[0] === (line[content.labelProperty] || defaultLabel));
        if (i < 0) {
            dataColumns.push([line[content.labelProperty] || defaultLabel])
            i = dataColumns.length -1;
        }

        dataColumns[i].push(!line[content.valueProperty] ? 1 : line[content.valueProperty]);
    });
  
    const cardId = 'card-c3-' +  Math.round(Math.random()*100000);

    const markup =`
        <header>${content.header || content.title || ''}</header>
        <article id="${cardId}"></article>
        <footer>${content.footer || ''}</footer>`;

    const script = `
        c3.generate({
            bindto: '#${cardId}',
            data: {
                type: 'pie',
                columns: ${JSON.stringify(dataColumns)}
            }
        });`;

    return { markup, script };
};

const startEditor = () => {
    Editor = monaco.editor.create(
        getConfigCardIngestionEndpointBodyTemplateField(), {
        value: '{}',
        language: 'json',
        theme: "vs-light",
        automaticLayout: true
    });
    Editor.layout({
        // width: '500px',
        // height: '400px'
    });
}

const setEditorToJSONMode = () => {
    Editor.updateOptions({
        language: 'json'
    });
}

const setEditorToGraphQLMode = () => {
    Editor.updateOptions({
        language: 'graphql'
    });
}

document.addEventListener('DOMContentLoaded', () => {
    startEditor();

    getConfigureButton().addEventListener('click', configure);
    getRefreshButton().addEventListener('click', refreshDashboard);

    getDashboardConfigForm().addEventListener('submit', setDashboardConfig);
    
    getConfigCardsListField().addEventListener('change', loadCardConfigurationFields);

    getConfigCardInputsListField().addEventListener('change', loadCardInputFields);
    getCardInputConfigForm().addEventListener('submit', setCardInputConfig);

    getCardMetaForm().addEventListener('submit', setCardMetaConfig);

    getConfigCardIngestionEndpointVerbField().addEventListener('change', adjustVerbFields);
    getConfigCardIngestionEndpointBodyTypeField().addEventListener('change', adjustEditorMode);
    getCardIngestionConfigForm().addEventListener('submit', setCardIngestionConfig);

    getConfigCardVizTypeField().addEventListener('change', adjustVizTypeFields);
    getCardVizConfigForm().addEventListener('submit', setCardVizConfig);
});