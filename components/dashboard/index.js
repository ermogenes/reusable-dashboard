// Globals

var EngineConfig = {};
var DashboardConfig = {};

// Extensions

String.prototype.slugify = function (separator = '-') {
    return this
        .toString()
        .normalize('NFD')                   // split an accented letter in the base letter and the acent
        .replace(/[\u0300-\u036f]/g, '')   // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, '')   // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, separator);
};

String.prototype.interpolate = function (params) {
    const names = Object.keys(params);
    const vals = Object.values(params);
    return new Function(...names, `return \`${this}\`;`)(...vals);
};

// Utils

const utils = {
    getPropertyFromObject: (p, o) => p.split('.').reduce((x, y) => x[y], o),
};

// The Magic

var engine = {
    preload: async () => {
        await engine.loadConfigurationMarkup();
        ui.startEditor();
        ui.setUiEvents();
    },

    start: (data) => {
        DashboardConfig = data;
        engine.refreshDashboard();
        ui.toggleShowCards(true);
    },    

    loadConfigurationMarkup: async () => {
        const response = await fetch(EngineConfig.endpoints.configurationMarkup);
        ui.configurationContainer().innerHTML = await response.text();
    },

    loadCard: async (card) => {
        const request = {};

        let vars = {};
        if (card.input.length > 0) {
            card.input.forEach(i => vars[i.name] = i.value);
        }

        request.method = card.ingestion.endpoint.verb;
        
        if (request.method === 'POST') {
            request.headers = {
                'Content-Type':'application/json',
            };
            if (card.ingestion.endpoint.bodyType === 'json') {
                request.body = card.ingestion.endpoint.bodyTemplate ?
                JSON.stringify(
                    card.ingestion.endpoint.bodyTemplate.interpolate(vars)
                ) : null;
            } else if (card.ingestion.endpoint.bodyType === 'graphql') {
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
                    case 'text':
                        cardEvaluation = viz.buildTextCard(card, cardData);
                        break;
                    case 'pie':
                        cardEvaluation = viz.buildPieCard(card, cardData);
                        break;
                
                    default:
                        break;
                }
                
                const cardsContainer = ui.cardsContainer();

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
    },

    loadAllCards: () => {
        ui.clearCardsContainer();
        return Promise.all(DashboardConfig.cards.map(c => engine.loadCard(c)));
    },

    refreshDashboard: () => {
        ui.headerTitle().innerHTML = DashboardConfig.header || '';
        ui.footer().innerHTML = DashboardConfig.footer || '';
        engine.loadAllCards()
            .then(() => ui.fillConfigurationFields());
    },
};

var ui = {
    container: () => document.getElementById('dashboard'),
    cardsContainer: () => ui.container().querySelector('.cards'),
    configurationContainer: () => ui.container().querySelector('.configuration'),
    configForm: () => document.getElementById('form-dashboard'),
    headerField: () => document.getElementById('dashboard-header-text'),
    footerField: () => document.getElementById('dashboard-footer-text'),
    
    cardsConfigForm: () => document.getElementById('cards-configuration'),
    cardsListField: () => document.getElementById('cards-list'),

    cardsTabs: () => ui.configurationContainer().querySelectorAll(".card-tab"),
    
    metaForm: () => document.getElementById('form-card-meta'),
    metaTitleField: () => document.getElementById('meta-title'),
    metaOrderField: () => document.getElementById('meta-order'),
    metaBaseSizeField: () => document.getElementById('meta-base-size'),
    metaFooterField: () => document.getElementById('meta-footer'),
    
    inputConfigForm: () => document.getElementById('form-card-input'),
    inputsListField: () => document.getElementById('card-inputs-list'),
    inputTypeField: () => document.getElementById('input-type'),
    inputLabelField: () => document.getElementById('input-label'),
    inputNameField: () => document.getElementById('input-name'),
    inputValueField: () => document.getElementById('input-value'),
    
    ingestionConfigForm: () => document.getElementById('form-card-ingestion'),
    ingestionEndpointUrlField: () => document.getElementById('endpoint-url'),
    ingestionEndpointVerbField: () => document.getElementById('endpoint-verb'),
    ingestionEndpointBodyTypeField: () => document.getElementById('endpoint-body-type'),
    ingestionEndpointBodyTemplateField: () => document.getElementById('endpoint-body-template'),
    ingestionEndpointBodyTemplateGroup: () => document.getElementById('endpoint-body-template-group'),
    
    vizConfigForm: () => document.getElementById('form-card-viz'),
    vizTypeField: () => document.getElementById('viz-type'),
    
    vizTextGroup: () => document.getElementById('viz-type-text-group'),
    vizTextTemplateField: () => document.getElementById('viz-text-text-template'),
    
    vizPieGroup: () => document.getElementById('viz-type-pie-group'),
    vizPieObjectArrayField: () => document.getElementById('viz-pie-object-array-property'),
    vizPieLabelField: () => document.getElementById('viz-pie-label-property'),
    vizPieValueField: () => document.getElementById('viz-pie-value-property'),
    
    configureButton: () => ui.container().querySelector('.config-button'),
    refreshButton: () => ui.container().querySelector('.refresh-button'),
    
    headerTitle: () => ui.container().querySelector('header > .title'),
    footer: () => ui.container().querySelector('footer .footer'),
    
    getCard: (cardObj) => getInputCardFields().querySelector(`#card-${cardObj.title.slugify()}`),

    editor: {},

    startEditor: () => {
        ui.editor = monaco.editor.create(
            ui.ingestionEndpointBodyTemplateField(), {
            value: '{}',
            language: 'json',
            theme: 'vs-light',
            automaticLayout: true
        });
        
        ui.editor.layout({
            // width: '500px',
            // height: '400px'
        });
    },

    getInputField: (cardObj, fieldObj) => getCard(cardObj)
        .querySelector(`#card-input-${cardObj.title.slugify()}-${fieldObj.name.slugify()}`),

    setUiEvents: () => {
        ui.configureButton().addEventListener('click', ui.toggleView);
        ui.refreshButton().addEventListener('click', engine.refreshDashboard);
    
        ui.configForm().addEventListener('submit', ui.setDashboardConfig);
        
        ui.cardsListField().addEventListener('change', ui.fillCardFields);

        ui.cardsTabs().forEach(t =>
            t.addEventListener('click', ui.setVisibleCardTab)
        );
    
        ui.inputsListField().addEventListener('change', ui.fillInputFields);
        ui.inputConfigForm().addEventListener('submit', ui.setInputConfig);
    
        ui.metaForm().addEventListener('submit', ui.setCardMetaConfig);
    
        ui.ingestionEndpointVerbField().addEventListener('change', ui.adjustVerbFields);
        ui.ingestionEndpointBodyTypeField().addEventListener('change', ui.adjustEditorMode);
        ui.ingestionConfigForm().addEventListener('submit', ui.setCardIngestionConfig);
    
        ui.vizTypeField().addEventListener('change', ui.adjustVizTypeFields);
        ui.vizConfigForm().addEventListener('submit', ui.setCardVizConfig);    
    },
    
    toggleShowCards: (showCards) => {
        const cards = ui.cardsContainer();
        const config = ui.configurationContainer();
        
        if (showCards) {
            cards.style.display = 'none';
            config.style.display = 'flex';
        }
        
        cards.style.display = cards.style.display === 'flex' ? 'none' : 'flex';
        config.style.display = config.style.display === 'flex' ? 'none' : 'flex';
    },

    fillConfigurationFields: () => {
        ui.headerField().value = DashboardConfig.header || '';
        ui.footerField().value = DashboardConfig.footer || '';
        [...ui.cardsListField().options].forEach(o => ui.cardsListField().options.remove(o));
        for(let i = 0; i <= DashboardConfig.cards.length -1; i++) {
            const card = DashboardConfig.cards[i];
            const cardOption = document.createElement('option');
            cardOption.text = card.title;
            cardOption.value = i;
            ui.cardsListField().options.add(cardOption);
        }
        ui.cardsListField().selectedIndex = 0;
        ui.cardsListField().dispatchEvent(new Event('change'));
    },

    clearCardsContainer: () => {
        ui.cardsContainer().innerHTML = '';
    },

    toggleView: () => {
        ui.toggleShowCards();
        engine.refreshDashboard();
    },
 
    fillCardFields: () => {
        const cardIndex = ui.cardsListField().selectedIndex;
        const card = DashboardConfig.cards[cardIndex];

        ui.metaTitleField().value = card.title;
        ui.metaOrderField().value = card.order;
        ui.metaBaseSizeField().value = card.baseSize;
        ui.metaFooterField().value = card.footer;

        const inputsSelect = ui.inputsListField();
        [...ui.inputsListField().options].forEach(o =>
            ui.inputsListField().options.remove(o)
        );

        for(let i = 0; i <= card.input.length -1; i++) {
            const input = card.input[i];
            const inputOption = document.createElement('option');
            inputOption.text = input.label;
            inputOption.value = i;
            ui.inputsListField().options.add(inputOption);
        }

        ui.inputsListField().selectedIndex = 0;
        ui.inputsListField().dispatchEvent(new Event('change'));
        
        ui.ingestionEndpointUrlField().value = card.ingestion.endpoint.urlTemplate;
        
        ui.ingestionEndpointVerbField().value = card.ingestion.endpoint.verb;
        ui.ingestionEndpointVerbField().dispatchEvent(new Event('change'));
        
        ui.ingestionEndpointBodyTypeField().value = card.ingestion.endpoint.bodyType;
        ui.ingestionEndpointBodyTypeField().dispatchEvent(new Event('change'));
        
        ui.editor.setValue(card.ingestion.endpoint.bodyTemplate || '');
        
        ui.vizTypeField().value = card.visualization.type;
        ui.vizTypeField().dispatchEvent(new Event('change'));

        ui.vizTextTemplateField().value = card.visualization.text?.template || '';
        
        ui.vizPieObjectArrayField().value = card.visualization.pie?.objectArray || '';
        ui.vizPieLabelField().value = card.visualization.pie?.labelProperty || '';
        ui.vizPieValueField().value = card.visualization.pie?.valueProperty || '';

        ui.cardsTabs()[0].dispatchEvent(new Event('click'));
    },

    fillInputFields: () => {
        const cardIndex = ui.cardsListField().selectedIndex;
        const card = DashboardConfig.cards[cardIndex];
        const inputIndex = ui.inputsListField().selectedIndex;
    
        if (inputIndex >= 0) {
            const input = card.input[inputIndex];
    
            ui.inputTypeField().value = input.type || '';
            ui.inputLabelField().value = input.label || '';
            ui.inputNameField().value = input.name || '';
            ui.inputValueField().value = input.value || '';
        } else {
            ui.inputTypeField().value = '';
            ui.inputLabelField().value = '';
            ui.inputNameField().value = '';
            ui.inputValueField().value = '';
        }
    },

    setVisibleCardTab: (e) => {
        e.preventDefault();
        const tabClass = e.currentTarget.dataset.activateClass;
        
        const allTabs = document.querySelectorAll(
            `#cards-configuration .card-tab-container`
        );
        
        const tabsToActivate = document.querySelectorAll(
            `#cards-configuration .card-tab-container.${tabClass}`
        );
        
        allTabs.forEach(t => t.hidden = true);
        tabsToActivate.forEach(t => t.hidden = false);
    },    

    adjustVerbFields: () => {
        if (ui.ingestionEndpointVerbField().value === 'GET') {
            document.getElementById('endpoint-body-type-group').hidden = true;
        } else {
            document.getElementById('endpoint-body-type-group').hidden = false;
        }
    },
    
    adjustVizTypeFields: (e) => {
        if (e.currentTarget.value === 'text') {
            ui.vizTextGroup().style.display = 'flex';
            ui.vizPieGroup().style.display = 'none';
        } else if (e.currentTarget.value === 'pie') {
            ui.vizTextGroup().style.display = 'none';
            ui.vizPieGroup().style.display = 'flex';
        }
    },
    
    adjustEditorMode: () => {
        if (ui.ingestionEndpointBodyTypeField().value === 'graphql') {
            ui.ingestionEndpointBodyTemplateGroup().hidden = false;
            ui.editor.updateOptions({ language: 'graphql', readOnly: false });
        } else if (ui.ingestionEndpointBodyTypeField().value === 'json') {
            ui.ingestionEndpointBodyTemplateGroup().hidden = false;
            ui.editor.updateOptions({ language: 'json', readOnly: true });
        } else {
            ui.ingestionEndpointBodyTemplateGroup().hidden = true;
            ui.editor.updateOptions({ readOnly: true });
            ui.editor.setValue('');
        }
    },    
    
    setDashboardConfig: (e) => {
        e.preventDefault();
        DashboardConfig.header = ui.headerField().value;
        DashboardConfig.footer = ui.footerField().value;
        engine.refreshDashboard();
    },

    setInputConfig: (e) => {
        e.preventDefault();
        const card = DashboardConfig.cards[ui.cardsListField().selectedIndex];
        const input = card.input[ui.inputsListField().selectedIndex];
        input.type = ui.inputTypeField().value;
        input.label = ui.inputLabelField().value;
        input.name = ui.inputNameField().value;
        input.value = ui.inputValueField().value;
    },

    setCardMetaConfig: (e) => {
        e.preventDefault();
        const card = DashboardConfig.cards[ui.cardsListField().selectedIndex];
        card.title = ui.metaTitleField().value;
        card.order = ui.metaOrderField().value;
        card.baseSize = ui.metaBaseSizeField().value;
        card.footer = ui.metaFooterField().value;
    },
    
    setCardIngestionConfig: (e) => {
        e.preventDefault();
        const card = DashboardConfig.cards[ui.cardsListField().selectedIndex];
        card.ingestion.endpoint.urlTemplate = ui.ingestionEndpointUrlField().value;
        card.ingestion.endpoint.verb = ui.ingestionEndpointVerbField().value;
        card.ingestion.endpoint.bodyType = ui.ingestionEndpointBodyTypeField().value;
        card.ingestion.endpoint.bodyTemplate = ui.editor.getValue();
    },
    
    setCardVizConfig: (e) => {
        e.preventDefault();
        const card = DashboardConfig.cards[ui.cardsListField().selectedIndex];
        card.visualization = {};
        card.visualization.type = ui.vizTypeField().value;
        
        if (card.visualization.type === 'text') {
            card.visualization.text = {
                template: ui.vizTextTemplateField().value,
            };
        } else if (card.visualization.type === 'pie') {
            card.visualization.pie = {
                objectArray: ui.vizPieObjectArrayField().value,
                labelProperty: ui.vizPieLabelField().value,
                valueProperty: ui.vizPieValueField().value,
            };
        }
    },    

};

var viz = {
    buildTextCard: (config, data) => {
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
    },
    
    buildPieCard: (config, data) => {
        const content = {
            title: config.title,
            header: config.header,
            footer: config.footer,
            objectArray: utils.getPropertyFromObject(config.visualization?.pie?.objectArray, data),
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
            <article id='${cardId}'></article>
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
    },
};

// Working...


// Initialization

const loadDashboard = (engineConfig) => {
    EngineConfig = engineConfig;

    return fetch(engineConfig.endpoints.dashboard)
        .then((response) => response.json())
        .then((data) => engine.start(data));
};

document.addEventListener('DOMContentLoaded', engine.preload);
