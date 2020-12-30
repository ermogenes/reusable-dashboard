# Reusable Dashboard

Componente que cria um dashboard configurável.

Veja uma apresentação do componente no YouTube:

[![](http://i3.ytimg.com/vi/4g0_TtZB8-E/hqdefault.jpg)](https://youtu.be/4g0_TtZB8-E)

## Requisitos iniciais

- Reutilizável em qualquer aplicação.
- Dependências referenciadas via CDN, sem necessidade de inclusão de qualquer passo no build (o que, porém, exclui a possibilidade de uso de bundlers/package managers e imports).
- Configurável, com interface integrada, e consumo de API para obter configurações e salvá-las.
- Dados dos cards obtidos através de APIs configuráveis, REST/JSON ou GraphQL.
- Extensível, permitindo novas configurações e novos tipos de gráficos.

## Passo-a-passo para utilização

Baixe ou clone o conteúdo do repositório. Copie `/components` para dentro de seu projeto. Na sua página/view crie uma `div` com o id `dashboard`. Referencie os estilos, as dependências e os scripts do componente.

Chame o método `loadDashboard` passando as opções desejadas e garantindo que o faça somente após a conclusão do carregamento do DOM (`DOMContentLoaded`).

Você precisará de endpoints para leitura e gravação das configurações, e dos endpoints a serem consumidos. Você pode utilizar URLs de arquivos JSON estáticos, ou APIs REST (ou GraphQL nos cards).

Abaixo, maiores detalhes sobre alguns pontos de atenção.

### Marcação

A página que exibirá o componente deve possuir uma `div` com o identificador `dashboard`. Nele será renderizado o componente.

```html
<div id="dashboard"></div>
```

Serão necessárias também referências aos seguintes componentes:

- SheetJS Community Edition (no exemplo, via CDN);
- c3 (no exemplo, via CDN);
- monaco (no exemplo, incorporado à aplicação que usará o dashboard);

Exemplo:

```html
<!-- SheetJS Community Edition, via cdn -->
<script type="text/javascript" src="//unpkg.com/xlsx/dist/shim.min.js"></script>
<script
  type="text/javascript"
  src="//unpkg.com/xlsx/dist/xlsx.full.min.js"
></script>

<!-- c3, via cdn -->
<link
  rel="stylesheet"
  href="https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.20/c3.min.css"
  integrity="sha512-cznfNokevSG7QPA5dZepud8taylLdvgr0lDqw/FEZIhluFsSwyvS81CMnRdrNSKwbsmc43LtRd2/WMQV+Z85AQ=="
  crossorigin="anonymous"
/>
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/d3/5.16.0/d3.min.js"
  integrity="sha512-FHsFVKQ/T1KWJDGSbrUhTJyS1ph3eRrxI228ND0EGaEp6v4a/vGwPWd3Dtd/+9cI7ccofZvl/wulICEurHN1pg=="
  crossorigin="anonymous"
></script>
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/c3/0.7.20/c3.min.js"
  integrity="sha512-+IpCthlNahOuERYUSnKFjzjdKXIbJ/7Dd6xvUp+7bEw0Jp2dg6tluyxLs+zq9BMzZgrLv8886T4cBSqnKiVgUw=="
  crossorigin="anonymous"
></script>

<!-- monaco styles, embedded -->
<link
  rel="stylesheet"
  href="./components/monaco/min/vs/editor/editor.main.css"
/>

<!-- monaco config -->
<script>
  var require = {
    paths: { vs: './components/monaco/min/vs' },
    // 'vs/nls': { availableLanguages: { '*': "pt-br" }} // need to translate
  };
</script>

<!-- monaco scripts, embedded -->
<script src="./components/monaco/min/vs/loader.js"></script>
<script src="./components/monaco/min/vs/editor/editor.main.nls.js"></script>
<script src="./components/monaco/min/vs/editor/editor.main.nls.pt-br.js"></script>
<script src="./components/monaco/min/vs/editor/editor.main.js"></script>
```

Essas referências podem ser substituídas por outras estratégias, como usar o gerenciador de pacotes disponível.

Os leiautes também foram testados com a aplicação do Bootstrap 4 com o tema padrão. Caso ele não já não esteja disponível e se deseje incluir via CDN:

```html
<!-- bootstrap 4, optional -->
<link
  rel="stylesheet"
  href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
  integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm"
  crossorigin="anonymous"
/>
<script
  src="https://code.jquery.com/jquery-3.5.1.slim.min.js"
  integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj"
  crossorigin="anonymous"
></script>
<script
  src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js"
  integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx"
  crossorigin="anonymous"
></script>
```

### Estilos

É necessário referenciar os estilos do componente.

```html
<link rel="stylesheet" href="./components/dashboard/dashboard.css" />
```

Os estilos podem ser alterados livremente. Foram criados majoritariamente usando flexbox, e sem (muita) configuração de tipografia e cores.

### Scripts

É necessário referenciar o componente:

```html
<script src="./components/dashboard/index.js"></script>
```

E iniciá-lo após a conclusão do carregamento do DOM chamando a função `loadDashboard`. Por exemplo:

```js
const engineConfig = {
  // config here
};
document.addEventListener('DOMContentLoaded', loadDashboard(engineConfig));
```

- `endpoints.configurationMarkup` deve possuir as informações para fetch do conteúdo HTML do form de configuração.
- `endpoints.dashboard` deve possuir as informações para fetch das configurações do dashboard.
- `endpoints.persist` deve possuir as informações para fetch de persistência das configurações.

- `url` contém a url a ser acessada (obrigatório);
- `method` contém o método a ser utilizado (opcional);

Objeto `engineConfig` típico:

```js
endpoints: {
    configurationMarkup: {
        url: './partial/_configuration.html',
        method: 'GET',
    },
    dashboard: {
        url: 'http://server:port/yourApp/dashboardActionURL',
        method: 'GET',
    },
    persist: {
        url: 'http://server:port/yourApp/persistActionURL',
        method: 'POST',
    }
}
```

🍌 _Todas as APIs consumidas devem estar na mesma origem, ou permitir CORS._

As opções atuais podem ser obtidas através do objeto global `EngineConfig`.

## Contrato JSON da Configuração

Os endpoints de leitura e gravação da configuração deverão retornar um objeto JSON com seguinte estrutura:

- `header` string com o cabeçalho do dashboard;
- `footer` string com o rodapé do dashboard;
- `cards` array de objetos dos cards do dashboard:
  - `order` number com a ordenação desejada entre todos os cards, seguindo as regras da propriedade `order` do flexbox;
  - `title` string com o título do card;
  - `baseSize` string com a medida aproximada do card, seguindo as regras da propriedade `flex-basis` do flexbox;
  - `footer` string com o rodapé do card;
  - `input` array com os parâmetros de entrada:
    - `label` string com o rótulo da chave (usado somente na tela de configuração);
    - `type` string com o tipo da chave:
      - `text` chave com conteúdo de texto.
    - `name` string com o nome da chave;
    - `value` string com o valor da chave.
  - `ingestion` objeto com as informações para obtenção dos dados das APIs a serem consumidas:
    - `endpoint` objeto com dados do endpoint:
      - `urlTemplate` string com o URL do endpoint (absoluto ou relativo, arquivo ou API);
      - `method` string com o método a ser utilizado no fetch;
      - `bodyType` string com o tipo do corpo da requisição:
        - `none` para APIs que não recebam nenhuma entrada no corpo da requisição;
        - `json` para APIs que recebam JSON, com substituição dos parâmetros de entrada;
        - `graphql` para APIs com suporte a GraphQL, e envio de parâmetros de entrada como `variables`.
      - `bodyTemplate` string com o template JSON ou template de `query` GraphQL.
  - `visualization` objeto com informações sobre a saída desejada.
    - `type` string com o tipo da visualização:
      - `text` para card de texto;
      - `pie` para card de gráficos de setores/pizza/torta;
      - `bar` para card de gráficos de barras verticais (funcionalidade experimental);
    - `text` objeto com as configurações para cads de texto:
      - `template` string com o template para exibição do texto, com substituição dos parâmetros de entrada.
    - `pie` objeto com as configurações para cads de gráficos de setores:
      - `objectArray` string com o nome da propriedade que contém o array de objetos (vazio caso seja a raiz);
      - `labelTemplate` string com template dos rótulos dos setores, que será utilizada para agrupar os valores;
      - `valueProperty` string com o nome da propriedade que contém os valores dos setores, que será utilizada para soma das ocorrências (vazio realiza contagem em vez de soma).
    - `bar` objeto com as configurações para cads de gráficos de barras verticais (funcionalidade experimental):
      - `objectArray` string com o nome da propriedade que contém o array de objetos (vazio caso seja a raiz);
      - `labelTemplate` string com template dos rótulos dos setores, que será utilizada para agrupar os valores;
      - `valueProperty` string com o nome da propriedade que contém os valores dos setores, que será utilizada para soma das ocorrências (vazio realiza contagem em vez de soma).      
  - `report` objeto com informações sobre a disponibilização de relatório:
    - `allowDownload` boolean indicando a liberação do link de download;
    - `format` string com o formato do arquivo para download:
      - `csv` para _CSV - Comma-Separated Values_;
      - `txt` para _TXT - Tab-Separated Values_;
      - `html` para _HTML - HTML tables_;
      - `ods` para _ODS - OpenDocument Spreadsheet_;
      - `xlsx` para _XLSX - Excel 2007+ XML Formats (XLSX/XLSM)_;
      - `xlsb` para _XLSB - Excel 2007+ Binary Format (XLSB BIFF12)_;
      - `xls` para _XLS - Excel 97-2004 (XLS BIFF8)_;
    - `objectArray` string com o nome da propriedade que contém o array de objetos (vazio caso seja a raiz);

As configurações podem ser obtidas/alteradas no objeto global `DashboardConfig`.

## Configuração

_Ações do dashboard_:

- `Refresh` regarrega todos os cards a partir da configuração atual.
- `Configure/Dashboard` alterna entre visualização de cards e formulário de configuração.

_Ações do formulário de configuração_:

- `Reload from server` recarrega as configurações a partir do endpoint inicial;
- `Send to server` envia as configurações atuais para o endpoint de persistência;
- `Export` salva as configurações atuais em um arquivo JSON e realiza o seu download;
- `Import` carrega as configurações a partir de um arquivo JSON enviado via upload.

_Ações diversas_:

- `New` salva as alterações na configuração atual (mas não envia ao endpoint de persistência);
- `Clone` cria uma cópia do objeto selecionado;
- `Delete` exclui o objeto selecionado na configuração atual (mas não envia ao endpoint de persistência).
