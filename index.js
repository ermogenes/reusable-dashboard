document.addEventListener('DOMContentLoaded', loadDashboard({
    endpoints: {
        dashboard: './data/dash-01.json',
        configurationMarkup: './partial/_configuration.html',
        persist: 'http://localhost:5502/yourApp/persistActionURL',
        persistUseCors: true,
    },
}));