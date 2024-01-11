import * as d3 from 'd3';
import cloud from 'd3-cloud';

import './styles.css';

const status = document.getElementById('status');


function updateStatus(message) {
    status.innerHTML = message;
}

/**
 * @typedef {import('./worker.js').ngrams} ngrams
 */

/**
 * Worker Message Event Object
 * @typedef {Object} WorkerMessageEvent
 * @property {Object} data - The message data
 * @property {string} data.type - The type of message
 * @property {Object} data.content - The message content
 * @property {string} data.content.responses - The number of responses
 * @property {ngrams} data.content.ngrams - The ngrams
 */

/**
 * Worker message handler
 * @param {WorkerMessageEvent} e - The message event
 * @returns {void}
 */
function onWorkerMessage(e) {
    let msg = e.data;
    switch(msg.type) {
        case 'update':
            updateStatus(`Found ${Object.entries(msg.content).map(([k,v])=>`${k}: ${v}`).join(', ')}`);
            break;
        case 'ngrams':
            console.log("Drawing cloud...");
            let ngrams = msg.content.ngrams;

            // Get the most common phrases and their responses
            let ngramList = Object.entries(ngrams).map(([k,v])=>({
                ngram:k, 
                phrase:v.commonPhrase, 
                responses:v.responses
            }));
            ngramList = ngramList.sort((a,b)=>b.responses.length - a.responses.length);

            ngramList = ngramList.slice(0,100);

            layout(ngramList);

            break;
        default:
            console.log('Unknown message type', msg.type);
    }
    
}


function layout(ngramList) {
    // Get the ngram with most responses
    let maxResponses = Math.max(...ngramList.map(n=>n.responses.length));

    let cloudSize = 720;
    let maxFontSize = cloudSize / 6;

    let layout = cloud()
        .size([cloudSize*16/9, cloudSize])
        .words(ngramList.map(function(d) {
            return {text: d.phrase, key:d.ngram, size: d.responses.length * maxFontSize/(maxResponses), responses:d.responses};
        }))
        .padding(4)
        
        .font("Impact")
        .rotate(()=>0)
        .fontSize(function(d) { return d.size; })
        .on("end", words=>(draw(words, layout)));

    layout.start();
}

function draw(words, layout) {
    // Clear the svg
    d3.select("#cloud")
      .select("g")
        .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
      .selectAll("text")
        .data(words, d=>d.key)
        .join(
            function(enter) {
                enter.append("text")
                    .attr("data-key", d=>d.key)
                    .style("font-size", function(d) { return d.size + "px"; })
                    .style("font-family", "Impact")
                    .attr("text-anchor", "middle")
                    .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .text(function(d) { return d.text; })
                    .on('mouseover', function(e, d) {
                        // Get responses for this ngram
                        let responses = d.responses.map(r=>`<li>${r.markup}</li>`);
            
                        let rect = d3.select(this).node().getBoundingClientRect();
                        let topleft = [rect.x, rect.y+rect.height]
                        d3.select('#responses')
                            .html(`Count: ${responses?.length}<br /><ul>${responses?.join('')}</ul>`)
                            .classed('hidden', false)
                            .style('top', `${topleft[1]}px`)
                            .style('left', `${topleft[0]}px`);
            
                    })
                    .on('mouseout', function(d) {
                        d3.select('#responses').classed('hidden', true);
                    })
            },
            function(update) {
                update.text(d=>d.text)
                    .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .style("font-size", function(d) { return d.size + "px"; })
            },
            function(exit) {
                exit.remove();
            }
        )
}


// When the viewport resizes, resize the cloud
window.onresize = function(event) {
    let cloud = document.getElementById('cloud');
}


let worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = onWorkerMessage;
console.log(`Worker loaded`);
if (module.hot) {
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
    let csv = d3.csvParseRows( e.target.result );
    let responses = csv.map(row=>row[0]);

    // Send the text to a service worker to process
    worker.postMessage({ responses });
};

let file = null;

// When the textfile file input changes, process the file via wink-nlp
const fileInput = document.getElementById('textfile');
fileInput.onchange = (e) => {
    if(file !== e.target.files[0]) {
        file = e.target.files[0];
        // Change app content to show loading message
        status.innerHTML = 'Loading...';

        reader.readAsText(file);
    }
}

document.getElementById('generate').onclick = (e) => {
    worker.postMessage({ generate: true });
}

function isText(e) {
    if(e.dataTransfer.types.includes('text/plain') || e.dataTransfer.types.includes('text/csv')) {
        return true;
    }
    return false;
}

function isTextFile(e) {
    if(e.dataTransfer.types.includes('Files')) {
        // Check if it's a text or csv file
        const file = e.dataTransfer.items[0] || e.dataTransfer.files[0];
        if(file.type === 'text/plain' || file.type === 'text/csv') {
            return true;
        }
    }
    return false;
}

import dropZone from './dropZone.js';
let drop = dropZone(document.getRootNode())
    .isallowed(e=>isText(e) || isTextFile(e))
    .ondrop(e=>{
        if(isText(e)) {
            let text = e.dataTransfer.getData('text/plain');
            let responses = text.split('\n').filter(r=>r.length > 0);
            worker.postMessage({ responses });
        } else if(isTextFile(e)) {
            let file = e.dataTransfer.items[0]?.getAsFile() || e.dataTransfer.files[0];
            
            reader.readAsText(file);
        }
        console.log("Processing text...");
    });


const ngramLengthSlider = document.getElementById('ngramLength');
const ngramLengthDisplay = document.getElementById('ngramLengthDisplay');

function updateNgramLength(e) {
    ngramLengthDisplay.textContent = e.target.value;
    worker.postMessage({ minNgramLength: e.target.value });
}

ngramLengthSlider.oninput = updateNgramLength;
updateNgramLength({target:ngramLengthSlider});
