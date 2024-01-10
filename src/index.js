import * as d3 from 'd3';


const app = document.getElementById('app');


function updateStatus(message) {
    app.innerHTML = message;
}

function onWorkerMessage(e) {
    let msg = e.data;
    console.log(msg);
    switch(msg.type) {
        case 'update':
            updateStatus(`Found ${msg.content.sentences} sentences`);
            break;
        default:
            console.log('Unknown message type', msg.type);
    }
    
}


let worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = onWorkerMessage;
if (module.hot) {
    // module.hot.dispose(() => {
    //     worker.terminate();
    // });

    // module.hot.accept('./worker.js', () => {
    //     worker = new Worker(new URL('./worker.js', import.meta.url));
    //     worker.onmessage = onWorkerMessage;
    //     console.log(`Worker reloaded`);
    // });

    // Force the worker to reload regardless
    module.hot.addStatusHandler((status) => {
        switch(status) {
            case 'dispose':
                worker.terminate();
                break;
            case 'apply':
                worker = new Worker(new URL('./worker.js', import.meta.url));
                worker.onmessage = onWorkerMessage;
                console.log(`Worker reloaded`);
        }
    });
}


const reader = new FileReader();
reader.onload = (e) => {
    const text = e.target.result;

    // Send the text to a service worker to process
    worker.postMessage({ text });
};

let file = null;

// When the textfile file input changes, process the file via wink-nlp
const fileInput = document.getElementById('textfile');
fileInput.onchange = (e) => {
    if(file !== e.target.files[0]) {
        file = e.target.files[0];
        // Change app content to show loading message
        app.innerHTML = 'Loading...';

        reader.readAsText(file);
    }
}

document.getElementById('generate').onclick = (e) => {
    if(file) {
        reader.readAsText(file);
    }
}