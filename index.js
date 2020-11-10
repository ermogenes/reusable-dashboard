document.addEventListener('DOMContentLoaded', loadDashboard({
    endpoints: {
        dashboard: './data/dash-01.json',
        configurationMarkup: './partial/_configuration.html',
    },
}));