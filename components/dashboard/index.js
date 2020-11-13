// Globals

var EngineConfig = {};
var DashboardConfig = {};
var _preloadPromises = [];

// Extensions

String.prototype.slugify = function (separator = '-') {
  return this.toString()
    .normalize('NFD') // split an accented letter in the base letter and the acent
    .replace(/[\u0300-\u036f]/g, '') // remove all previously split accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '') // remove all chars not letters, numbers and spaces (to be replaced)
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
  preload: () =>
    engine.loadConfigurationMarkup().then(() => {
      ui.startEditor();
      ui.setUiEvents();
    }),

  start: (data) => {
    engine.restart(data);
    ui.toggleShowCards(true);
  },

  restart: (data) => {
    DashboardConfig = data;
    engine.refreshDashboard();
  },

  loadConfigurationMarkup: () =>
    fetch(EngineConfig.endpoints.configurationMarkup.url, {
      method: EngineConfig.endpoints.configurationMarkup.method || undefined,
    })
      .then((response) => response.text())
      .then((markup) => {
        document.getElementById('dashboard').innerHTML = `
          <header>
              <div class="title"></div>
              <div class="toolbar">
                  <span class="config-button dashboard-action">Configure</span>
                  <span class="refresh-button dashboard-action">Refresh</span>
              </div>
          </header>
          <div class="cards"></div>
          <div class="configuration"></div>
          <footer>
              <div class="footer"></div>
          </footer>
        `;
        ui.configurationContainer().innerHTML = markup;
      }),

  loadCard: (card) => {
    let vars = {};
    if (card.input.length > 0) {
      card.input.forEach((i) => (vars[i.name] = i.value));
    }

    const request = {};
    request.method = card.ingestion.endpoint.method || undefined;

    if (request.method === 'POST') {
      request.headers = {
        'Content-Type': 'application/json',
      };
      if (card.ingestion.endpoint.bodyType === 'json') {
        request.body = card.ingestion.endpoint.bodyTemplate
          ? JSON.stringify(
              card.ingestion.endpoint.bodyTemplate.interpolate(vars)
            )
          : null;
      } else if (card.ingestion.endpoint.bodyType === 'graphql') {
        request.body = card.ingestion.endpoint.bodyTemplate
          ? JSON.stringify({
              query: `${card.ingestion.endpoint.bodyTemplate.interpolate(
                vars
              )}`,
              variables: vars,
            })
          : null;
      }
    }

    const url = card.ingestion.endpoint.urlTemplate.interpolate(vars);

    return fetch(url, request)
      .then((response) => response.json())
      .then((cardData) => {
        let cardEvaluation = { markup: '', script: '' };
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
        eval(cardEvaluation.script);
      });
  },

  loadAllCards: () => {
    ui.clearCardsContainer();
    return Promise.all(DashboardConfig.cards.map((c) => engine.loadCard(c)));
  },

  refreshDashboard: () => {
    ui.headerTitle().innerHTML = DashboardConfig.header || '';
    ui.footer().innerHTML = DashboardConfig.footer || '';
    engine.loadAllCards().then(() => ui.fillConfigurationFields());
  },

  getConfigFromServer: () =>
    fetch(EngineConfig.endpoints.dashboard.url, {
      method: EngineConfig.endpoints.dashboard.method || undefined,
    }).then((response) => response.json()),

  reloadConfiguration: () =>
    engine.getConfigFromServer().then((data) => engine.restart(data)),

  sendConfiguration: () =>
    fetch(EngineConfig.endpoints.persist.url, {
      method: EngineConfig.endpoints.persist.method || 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(DashboardConfig),
    })
      .then((response) => {
        if (!response.ok) {
          alert('Failed!');
        } else {
          alert('Ok!');
        }
      })
      .catch((error) => {
        alert('Error!');
      }),
};

var ui = {
  container: () => document.getElementById('dashboard'),
  cardsContainer: () => ui.container().querySelector('.cards'),
  configurationContainer: () => ui.container().querySelector('.configuration'),
  configForm: () => document.getElementById('form-dashboard'),
  headerField: () => document.getElementById('dashboard-header-text'),
  footerField: () => document.getElementById('dashboard-footer-text'),
  saveButton: () => document.getElementById('dashboard-save-button'),

  cardsConfigForm: () => document.getElementById('cards-configuration'),
  configReloadButton: () => document.getElementById('reload-button'),
  configSendButton: () => document.getElementById('send-button'),
  configExportButton: () => document.getElementById('export-button'),
  configImportButton: () => document.getElementById('import-button'),
  configImportFileField: () => document.getElementById('import-file'),

  cardsListField: () => document.getElementById('cards-list'),
  cardsNewCardButton: () => document.getElementById('new-card-button'),
  cardsCloneCardButton: () => document.getElementById('clone-card-button'),
  cardsDeleteCardButton: () => document.getElementById('delete-card-button'),

  cardsTabs: () => ui.configurationContainer().querySelectorAll('.card-tab'),

  metaForm: () => document.getElementById('form-card-meta'),
  metaTitleField: () => document.getElementById('meta-title'),
  metaOrderField: () => document.getElementById('meta-order'),
  metaBaseSizeField: () => document.getElementById('meta-base-size'),
  metaFooterField: () => document.getElementById('meta-footer'),
  metaSaveButton: () => document.getElementById('meta-save-button'),

  inputConfigForm: () => document.getElementById('form-card-input'),
  inputsListField: () => document.getElementById('card-inputs-list'),
  inputTypeField: () => document.getElementById('input-type'),
  inputLabelField: () => document.getElementById('input-label'),
  inputNameField: () => document.getElementById('input-name'),
  inputValueField: () => document.getElementById('input-value'),
  inputNewButton: () => document.getElementById('input-new-button'),
  inputCloneButton: () => document.getElementById('input-clone-button'),
  inputDeleteButton: () => document.getElementById('input-delete-button'),
  inputSaveButton: () => document.getElementById('input-save-button'),

  ingestionConfigForm: () => document.getElementById('form-card-ingestion'),
  ingestionEndpointUrlField: () => document.getElementById('endpoint-url'),
  ingestionEndpointMethodField: () =>
    document.getElementById('endpoint-method'),
  ingestionEndpointBodyTypeField: () =>
    document.getElementById('endpoint-body-type'),
  ingestionEndpointBodyTemplateField: () =>
    document.getElementById('endpoint-body-template'),
  ingestionEndpointBodyTemplateGroup: () =>
    document.getElementById('endpoint-body-template-group'),
  ingestionSaveButton: () => document.getElementById('ingestion-save-button'),

  vizConfigForm: () => document.getElementById('form-card-viz'),
  vizTypeField: () => document.getElementById('viz-type'),

  vizTextGroup: () => document.getElementById('viz-type-text-group'),
  vizTextTemplateField: () => document.getElementById('viz-text-text-template'),

  vizPieGroup: () => document.getElementById('viz-type-pie-group'),
  vizPieObjectArrayField: () =>
    document.getElementById('viz-pie-object-array-property'),
  vizPieLabelField: () => document.getElementById('viz-pie-label-template'),
  vizPieValueField: () => document.getElementById('viz-pie-value-property'),
  vizSaveButton: () => document.getElementById('viz-save-button'),

  configureButton: () => ui.container().querySelector('.config-button'),
  refreshButton: () => ui.container().querySelector('.refresh-button'),

  headerTitle: () => ui.container().querySelector('header > .title'),
  footer: () => ui.container().querySelector('footer .footer'),

  getCard: (cardObj) =>
    getInputCardFields().querySelector(`#card-${cardObj.title.slugify()}`),

  editor: {},

  startEditor: () => {
    ui.editor = monaco.editor.create(ui.ingestionEndpointBodyTemplateField(), {
      value: '{}',
      language: 'plaintext', // or 'json'
      theme: 'vs-light',
      automaticLayout: true,
    });

    ui.editor.layout({
      // width: '500px',
      // height: '400px'
    });
  },

  getInputField: (cardObj, fieldObj) =>
    getCard(cardObj).querySelector(
      `#card-input-${cardObj.title.slugify()}-${fieldObj.name.slugify()}`
    ),

  setUiEvents: () => {
    ui.configureButton().addEventListener('click', ui.toggleView);
    ui.refreshButton().addEventListener('click', engine.refreshDashboard);

    ui
      .configReloadButton()
      .addEventListener('click', engine.reloadConfiguration),
      ui.configSendButton().addEventListener('click', engine.sendConfiguration),
      ui
        .configImportButton()
        .addEventListener('change', ui.importFromFile, false),
      ui.configExportButton().addEventListener('click', ui.export),
      ui.saveButton().addEventListener('click', ui.setDashboardConfig);

    ui.cardsListField().addEventListener('change', ui.fillCardFields);

    ui.cardsNewCardButton().addEventListener('click', ui.addEmptyCard);
    ui.cardsCloneCardButton().addEventListener('click', ui.cloneCard);
    ui.cardsDeleteCardButton().addEventListener('click', ui.deleteCard);

    ui.cardsTabs().forEach((t) =>
      t.addEventListener('click', ui.setVisibleCardTab)
    );

    ui.metaSaveButton().addEventListener('click', ui.setCardMetaConfig);

    ui.inputsListField().addEventListener('change', ui.fillInputFields);

    ui.inputNewButton().addEventListener('click', ui.addEmptyInput);
    ui.inputCloneButton().addEventListener('click', ui.cloneInput);
    ui.inputDeleteButton().addEventListener('click', ui.deleteInput);

    ui.inputSaveButton().addEventListener('click', ui.setInputConfig);

    ui.ingestionEndpointMethodField().addEventListener(
      'change',
      ui.adjustMethodFields
    );
    ui.ingestionEndpointBodyTypeField().addEventListener(
      'change',
      ui.adjustEditorMode
    );

    ui.ingestionSaveButton().addEventListener(
      'click',
      ui.setCardIngestionConfig
    );

    ui.vizTypeField().addEventListener('change', ui.adjustVizTypeFields);

    ui.vizSaveButton().addEventListener('click', ui.setCardVizConfig);
  },

  toggleShowCards: (showCards) => {
    const cards = ui.cardsContainer();
    const config = ui.configurationContainer();

    if (showCards) {
      cards.style.display = 'none';
      config.style.display = 'flex';
    }

    if (cards.style.display === 'flex') {
      cards.style.display = 'none';
      config.style.display = 'flex';
      ui.configureButton().innerHTML = 'Dashboard';
    } else if (config.style.display === 'flex') {
      cards.style.display = 'flex';
      config.style.display = 'none';
      ui.configureButton().innerHTML = 'Configure';
    }
  },

  fillConfigurationFields: () => {
    ui.headerField().value = DashboardConfig.header || '';
    ui.footerField().value = DashboardConfig.footer || '';
    [...ui.cardsListField().options].forEach((o) =>
      ui.cardsListField().options.remove(o)
    );
    for (let i = 0; i <= DashboardConfig.cards.length - 1; i++) {
      const card = DashboardConfig.cards[i];
      const cardOption = document.createElement('option');
      cardOption.text = card.title;
      cardOption.value = i;
      ui.cardsListField().options.add(cardOption);
    }
    ui.cardsListField().selectedIndex = 0;
    ui.cardsListField().dispatchEvent(new Event('change'));
    ui.cardsTabs()[0].dispatchEvent(new Event('click'));
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
    [...ui.inputsListField().options].forEach((o) =>
      ui.inputsListField().options.remove(o)
    );

    for (let i = 0; i <= card.input.length - 1; i++) {
      const input = card.input[i];
      const inputOption = document.createElement('option');
      inputOption.text = input.label;
      inputOption.value = i;
      ui.inputsListField().options.add(inputOption);
    }

    ui.inputsListField().selectedIndex = 0;
    ui.inputsListField().dispatchEvent(new Event('change'));

    ui.ingestionEndpointUrlField().value = card.ingestion.endpoint.urlTemplate;

    ui.ingestionEndpointMethodField().value = card.ingestion.endpoint.method;
    ui.ingestionEndpointMethodField().dispatchEvent(new Event('change'));

    ui.ingestionEndpointBodyTypeField().value =
      card.ingestion.endpoint.bodyType;
    ui.ingestionEndpointBodyTypeField().dispatchEvent(new Event('change'));

    ui.editor.setValue(card.ingestion.endpoint.bodyTemplate || '');

    ui.vizTypeField().value = card.visualization.type;
    ui.vizTypeField().dispatchEvent(new Event('change'));

    ui.vizTextTemplateField().value = card.visualization.text?.template || '';

    ui.vizPieObjectArrayField().value =
      card.visualization.pie?.objectArray || '';
    ui.vizPieLabelField().value = card.visualization.pie?.labelTemplate || '';
    ui.vizPieValueField().value = card.visualization.pie?.valueProperty || '';
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

    allTabs.forEach((t) => (t.hidden = true));
    tabsToActivate.forEach((t) => (t.hidden = false));
  },

  adjustMethodFields: () => {
    if (ui.ingestionEndpointMethodField().value === 'GET') {
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
      ui.editor.updateOptions({ language: 'plaintext', readOnly: false });
    } else if (ui.ingestionEndpointBodyTypeField().value === 'json') {
      ui.ingestionEndpointBodyTemplateGroup().hidden = false;
      ui.editor.updateOptions({ language: 'json', readOnly: true });
    } else {
      ui.ingestionEndpointBodyTemplateGroup().hidden = true;
      ui.editor.updateOptions({ language: 'plaintext', readOnly: true });
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
    card.ingestion.endpoint.method = ui.ingestionEndpointMethodField().value;
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
        labelTemplate: ui.vizPieLabelField().value,
        valueProperty: ui.vizPieValueField().value,
      };
    }
  },

  export: () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(DashboardConfig, null, 2)], {
        type: 'application/json',
      })
    );
    link.download = `dashboard-${document.location.href.slugify()}-${new Date().toISOString()}.json`;
    link.click();
  },

  importFromFile: () => {
    const file = ui.configImportFileField().files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        engine.restart(JSON.parse(reader.result));
      };
      reader.error = () => {
        alert('Erro ao carregar.');
      };
    }
  },

  addEmptyCard: () => {
    const newCard = {
      order: ui.cardsListField().length,
      title: `New card #${parseInt(Math.random() * 100000)}`,
      baseSize: '200px',
      footer: '',
      input: [],
      ingestion: {
        endpoint: {
          urlTemplate: 'http(s)://...',
          method: 'GET',
          bodyType: 'json',
        },
      },
      visualization: {
        type: 'text',
        text: {
          template: 'Card text',
        },
      },
    };
    DashboardConfig.cards.push(newCard);
    const cardOption = document.createElement('option');
    cardOption.text = newCard.title;
    cardOption.value = ui.cardsListField().length - 1;
    ui.cardsListField().options.add(cardOption);

    ui.cardsListField().selectedIndex = ui.cardsListField().length - 1;
    ui.cardsListField().dispatchEvent(new Event('change'));
  },

  deleteCard: () => {
    const cardIndex = ui.cardsListField().selectedIndex;
    if (cardIndex >= 0) {
      DashboardConfig.cards.splice(cardIndex, 1);
      const card = DashboardConfig.cards[cardIndex];
      ui.cardsListField().options.remove(cardIndex);
      if (ui.cardsListField().options.length === 0) {
        ui.addEmptyCard();
      }
      ui.cardsListField().selectedIndex = 0;
    }

    ui.cardsListField().dispatchEvent(new Event('change'));
  },

  cloneCard: () => {
    const cardIndex = ui.cardsListField().selectedIndex;
    const card = DashboardConfig.cards[cardIndex];
    const newCard = JSON.parse(JSON.stringify(card));
    newCard.title = `${newCard.title} [clone] #${parseInt(
      Math.random() * 100000
    )}`;
    DashboardConfig.cards.push(newCard);
    const cardOption = document.createElement('option');
    cardOption.text = newCard.title;
    cardOption.value = ui.cardsListField().length - 1;
    ui.cardsListField().options.add(cardOption);

    ui.cardsListField().selectedIndex = ui.cardsListField().length - 1;
    ui.cardsListField().dispatchEvent(new Event('change'));
  },

  addEmptyInput: () => {
    const label = `New input #${parseInt(Math.random() * 100000)}`;
    const newInput = {
      type: 'text',
      label,
      name: label.slugify(),
      value: '',
    };

    const cardIndex = ui.cardsListField().selectedIndex;

    if (!DashboardConfig.cards[cardIndex].input)
      DashboardConfig.cards[cardIndex].input = [];
    DashboardConfig.cards[cardIndex].input.push(newInput);

    const inputIndex = ui.inputsListField().length - 1;
    const input = DashboardConfig.cards[cardIndex].input[inputIndex];

    const inputOption = document.createElement('option');
    inputOption.text = newInput.label;
    inputOption.value = inputIndex;
    ui.inputsListField().options.add(inputOption);

    ui.inputsListField().selectedIndex = ui.inputsListField().length - 1;
    ui.inputsListField().dispatchEvent(new Event('change'));
  },

  deleteInput: () => {
    const cardIndex = ui.cardsListField().selectedIndex;
    if (cardIndex >= 0) {
      const inputIndex = ui.inputsListField().selectedIndex;
      if (inputIndex >= 0) {
        DashboardConfig.cards[cardIndex].input.splice(inputIndex, 1);
        const input = DashboardConfig.cards[cardIndex].input[inputIndex];
        ui.inputsListField().options.remove(inputIndex);
        ui.inputsListField().selectedIndex = 0;
      }
    }
    ui.cardsListField().dispatchEvent(new Event('change'));
  },

  cloneInput: () => {
    const cardIndex = ui.cardsListField().selectedIndex;
    const inputIndex = ui.inputsListField().selectedIndex;
    const input = DashboardConfig.cards[cardIndex].input[inputIndex];

    const newInput = JSON.parse(JSON.stringify(input));
    newInput.label = `${newInput.label} [clone] #${parseInt(
      Math.random() * 100000
    )}`;

    if (!DashboardConfig.cards[cardIndex].input)
      DashboardConfig.cards[cardIndex].input = [];
    DashboardConfig.cards[cardIndex].input.push(newInput);

    const inputOption = document.createElement('option');
    inputOption.text = newInput.label;
    inputOption.value = ui.inputsListField().length - 1;
    ui.inputsListField().options.add(inputOption);
  },
};

var viz = {
  buildTextCard: (config, data) => {
    const content = {
      title: config.title,
      header: config.header,
      footer: config.footer,
      text: config.visualization?.text?.template.interpolate(data),
    };

    const markup = `
    <header>${content.header || content.title || 'no title'}</header>
    <article>${content.text || 'no text'}</article>
    <footer>${content.footer || 'no footer'}</footer>`;

    const script = ``;

    return { markup, script };
  },

  getObjectArray: (objectArray, data) => {
    const temp = utils.getPropertyFromObject(objectArray, data);
    if (Array.isArray(temp)) return temp;
    else if (data) return data;
    else return [];
  },

  buildPieCard: (config, data) => {
    const content = {
      title: config.title,
      header: config.header,
      footer: config.footer,
      objectArray: viz.getObjectArray(
        config.visualization?.pie?.objectArray,
        data
      ),
      labelTemplate: config.visualization?.pie?.labelTemplate,
      valueProperty: config.visualization?.pie?.valueProperty,
    };

    const dataColumns = [];
    const defaultLabel = '-';

    content.objectArray.forEach((line) => {
      let cleanedLine = {};
      Object.entries(line).forEach((prop) => {
        if (!Array.isArray(prop[1]) && typeof prop[1] !== 'function')
          cleanedLine[prop[0]] = prop[1];
      });

      const label = content.labelTemplate.interpolate(cleanedLine);

      let i = dataColumns.findIndex(
        (targetLine) => targetLine[0] === (label || defaultLabel)
      );
      if (i < 0) {
        dataColumns.push([label || defaultLabel]);
        i = dataColumns.length - 1;
      }

      dataColumns[i].push(
        !line[content.valueProperty] ? 1 : line[content.valueProperty]
      );
    });

    const cardId = 'card-c3-' + Math.round(Math.random() * 100000);

    const markup = `
      <header>${content.header || content.title || ''}</header>
      <article id='${cardId}'></article>
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
  },
};

// Initialization

const loadDashboard = (engineConfig) => {
  EngineConfig = engineConfig;

  engine
    .preload()
    .then(() => engine.getConfigFromServer())
    .then((data) => engine.start(data));
};
