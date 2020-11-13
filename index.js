document.addEventListener(
  'DOMContentLoaded',
  loadDashboard({
    endpoints: {
      configurationMarkup: {
        url: './components/dashboard/partial/_configuration.html',
      },
      dashboard: {
        url: './data/dash-01.json',
        method: 'GET',
      },
      persist: {
        url: 'http://localhost:5502/yourApp/persistActionURL',
      },
    },
  })
);
