import * as d3 from 'd3';
import cloud from 'd3-cloud';

import './styles.css';

import ngram from './ngram.js';

const status = document.getElementById('status');


function updateStatus(message, s) {
    status.innerHTML = message;

    if(s) {
        stats = s;
    }
}

var ngramList = null;
var stats = {}

// var cloudFont = {family:'Manrope', weight:'800'};
var cloudFont = {family:'sans-serif', weight:'bold'}; // Use this to maintain full compatibility for SVG export


var maxPhrases = 100;
async function layout(ngrams) {
    // If ngrams is empty, display a message
    if(ngrams.length === 0) {
        displayCloudMessage('No repeating phrases found.');
        return;
    }

    
    // Make sure the cloudFont is loaded
    // Note that this DOES NOT work when a font is not used in the document yet
    let font = `${cloudFont.weight ? cloudFont.weight + " " : ''}1em "${cloudFont.family}"`
    if(!document.fonts.check(font)) {
        await document.fonts.load(font);
    }

    ngrams = ngrams.slice(0,maxPhrases);

    // Get the ngram with most responses
    let maxResponses = Math.max(...ngrams.map(n=>n.count));
    let maxPhraseLength = Math.max(...ngrams.map(n=>n.phrase.length));

    function size(d) {
        return Math.sqrt(d.count/maxResponses);
        // return d.count/maxResponses;
    }
    let maxApproxPhraseWidth = Math.max(...ngrams.map(n=>n.phrase.length*size(n)));

    // Make the font size fit in the SVG
    // Fit roughly 8 large rows
    // And make sure the longest phrase fits (character count * 0.6 is a rough estimate of the width of the text for English)
    let cloudRect = document.getElementById('cloud').getBoundingClientRect();
    let maxFontSize = Math.min(cloudRect.height / Math.min(8, ngrams.length), cloudRect.width / (maxApproxPhraseWidth*.6));
    
    let layout = cloud()
        .size([cloudRect.width, cloudRect.height])
        .words(ngrams.map(function(d) {
            let w = {text: d.phrase, key:d.ngram, size:maxFontSize * size(d), count:d.count};
            if(d.responses) w.responses = d.responses;
            return w;
        }))
        .padding(4)
        
        .font(cloudFont.family)
        // .fontWeight(cloudFont.weight)
        .rotate(()=>0)
        .fontSize(function(d) { return d.size; })
        .on("end", words=>{
            draw(words, layout);
            updateStatus(`Done! (Responses: ${Object.entries(stats).map(([k,v])=>`${k}: ${v}`).join(', ')}, Phrases: ${ngramList.length})`, stats);
        });

    cloudFont.weight && layout.fontWeight(cloudFont.weight);
    layout.start();
}

function draw(words, layout) {
    console.log("Drawing words", words.length);

    // Remove the loading message in the SVG
    d3.select('#cloud').select('.loading')?.remove();

    // Hide the responses box
    d3.select('#responses').classed('hidden', true);

    d3.select("#cloud")
        .select("g")
            .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
            .style("font-family", cloudFont.family)
            .style("font-weight", cloudFont.weight)
        .selectAll("text")
            .data(words, d=>d.key)
            .join(
                function(enter) {
                    enter.append("text")
                        .attr("data-key", d=>d.key)
                        .style("font-size", function(d) { return d.size + "px"; })
                        .attr("text-anchor", "middle")
                        .attr("transform", function(d) {
                            return "translate(" + [d.x, d.y] + ")";
                        })
                        .text(function(d) { return d.text; })
                        .on('mouseover', function(e, d) {
                            // Only do this if the transition is completed
                            if(d3.select(this).style('opacity') < 1) return;

                            // Get responses for this ngram
                            let responses = d.responses?.map(r=>`<li>${r.markup}</li>`) || [];
                
                            let rect = d3.select(this).node().getBoundingClientRect();
                            let pos = [rect.x, rect.y+rect.height]
                            let posAnchors = ['left','top'];

                            let responsesWidth = document.getElementById('responses').computedStyleMap().get('width').value;
                            let responsesMaxHeight = document.getElementById('responses').computedStyleMap().get('max-height').value;

                            // Nudge the box to the left if it's too close to the right edge
                            let margin = 32;
                            if(pos[0] + responsesWidth + margin > window.innerWidth) {
                                pos[0] = window.innerWidth - rect.x - rect.width;
                                posAnchors[0] = 'right';
                            }

                            // Place the box above the text if it's too close to the bottom edge
                            if(pos[1] + responsesMaxHeight + margin > window.innerHeight) {
                                pos[1] = window.innerHeight - rect.y;
                                posAnchors[1] = 'bottom';
                            }

                            d3.select('#responses')
                                .html(`Count: ${d.count}<br /><ul>${responses?.join('')}</ul>`)
                                .classed('hidden', false)
                                .style('left', null)
                                .style('top', null)
                                .style('right', null)
                                .style('bottom', null)
                                .style(posAnchors[1], `${pos[1]}px`)
                                .style(posAnchors[0], `${pos[0]}px`)

                            // Scroll to top of responses
                            document.getElementById('responses').scrollTop = 0;
                        })
                        .on('mouseout', function(d) {
                            d3.select('#responses').classed('hidden', true);
                        })

                        .style("opacity", 0)
                        .transition()
                        .duration(500)
                        .style("opacity", null)
                },
                function(update) {
                    update.text(d=>d.text)
                        .attr("transform", function(d) {
                            return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                        })
                        .style("font-size", function(d) { return d.size + "px"; })
                },
                function(exit) {
                    exit
                        .on('mouseover', null)
                        .on('mouseout', null)
                        .style("opacity", 1)
                        .transition()
                        .duration(300)
                        .style("opacity", 0)
                        .remove();
                }
            )

}


// When clicking outside the SVG, hide the responses box
document.addEventListener('click', (e)=>{
    // If the ancestor of the clicked element is the SVG or the responses box, don't hide the responses
    if(!e.composedPath().includes(document.getElementById('cloud')) && !e.composedPath().includes(document.getElementById('responses')))
    {
        d3.select('#responses').classed('hidden', true);
    }
});


// When the viewport resizes, resize the cloud a short time after the last resize event 
// to ensure the cloud is sized correctly and doesn't jump around while resizing
window.onresize = function(event) {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
        layout(ngramList);
    }, 100);
}

const reader = new FileReader();
const defaultColumn = 0;
reader.onload = async (e) => {
    let csv = d3.csvParseRows( e.target.result );

    if(file?.type === 'text/csv') {
        // Take the first row and populate columSelect with the column names
        let columns = csv[0];
        d3.select('#columnSelect')
            .attr('disabled', null)
            .selectAll('option')
            .data(columns)
            .join('option')
                .attr('value', (d,i)=>i)
                .text(d=>d)

        // Select the first column
        document.getElementById('columnSelect').value = defaultColumn;

        // During the first load, we will cycle through the columns from defaultColumn until we find one that has data
        // This is because the first column is often a timestamp or ID column
        for(let column = defaultColumn; column < columns.length; column++) {
            let responses = csv.map(row=>row[column]);
            responses.shift(); // Remove the first row (column names)

            responses = responses.filter(r=>r.length > 0);

            ngramList = await ngram.generateNgramList(responses);
            if(ngramList.length > 0) {
                // Set the column select to the column that has data
                document.getElementById('columnSelect').value = column;
                break;
            }
        }

        if(ngramList.length === 0) {
            document.getElementById('columnSelect').value = defaultColumn;

            displayCloudMessage('No repeating phrases found in this file.');
        } else {
            await layout(ngramList);
        }

    } else {
        disableColumnSelect();

        postResponses(reader.result);
    }

};

function disableColumnSelect() {
    // Disable the column select
    d3.select('#columnSelect')
    .attr('disabled', true)
    .selectAll('option')
    .data(['Not a CSV file'])
    .join('option')
        .text(d=>console.log(d)||d)
}

async function postResponses(inputText) {

    let responses = null;
    if(file?.type === 'text/csv') {
        let column = document.getElementById('columnSelect').value;
        let csv = d3.csvParseRows( inputText );
        responses = csv.map(row=>row[column]);
        
        // Remove the first row (column names)
        responses.shift();

        responses = responses.filter(r=>r.length > 0);
    } else {
        responses = inputText.split('\n').filter(r=>r.length > 0);
    }

    if(responses) {
        ngramList = await ngram.generateNgramList(responses);
        await layout(ngramList);
    }
}

// When the column select changes, process the file via wink-nlp
const columnSelect = document.getElementById('columnSelect');
columnSelect.onchange = (e) => {
    if(!file || file.type !== 'text/csv') return;

    postResponses(reader.result);
}


let file = null;

// When the textfile file input changes, process the file via wink-nlp
const fileInput = document.getElementById('textfile');
fileInput.onchange = (e) => {
    if(file !== e.target.files[0]) {
        file = e.target.files[0];
        // Change app content to show loading message
        status.innerHTML = 'Loading...';

        if(file) {
            loadFile(file);
        }
    }
}

document.getElementById('generate').onclick = async (e) => {
    let ngrams = await ngram.generateNgramList();
    await layout(ngrams);
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


function displayCloudMessage(message) {
    // Hide the responses box
    d3.select('#responses').classed('hidden', true);

    // Replace the cloud with a loading message
    d3.select('#cloud')
    .select('g')
    .selectAll('text')
    .remove();

    d3.select('#cloud')
    .select('g')
        .attr('transform', null)
    .append('text')
        .classed('loading', true)
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .text(message);
}


function loadFile(file) {
    if(file) {
        displayCloudMessage('Loading file...');        

        reader.readAsText(file);
    }
}


import dropZone from './dropZone.js';
let drop = dropZone(document.getRootNode())
    .isallowed(e=>isText(e) || isTextFile(e))
    .ondrop(e=>{
        if(isText(e)) {
            file = null;
            // Reset the file input
            fileInput.value = null;

            disableColumnSelect();

            let text = e.dataTransfer.getData('text/plain');
            postResponses(text);

            displayCloudMessage('Processing text...');
        } else if(isTextFile(e)) {
            file = e.dataTransfer.items[0]?.getAsFile() || e.dataTransfer.files[0];

            fileInput.value = null;

            loadFile(file)
        }
        console.log("Processing text...");
    });


const ngramLengthSlider = document.getElementById('ngramLength');
const ngramLengthDisplay = document.getElementById('ngramLengthDisplay');

async function updateNgramLength(e) {
    ngramLengthDisplay.textContent = e.target.value;
    ngramList = await ngram.updateSettings({ minNgramLength: e.target.value });

    if(ngramList)
        await layout(ngramList);
}

ngramLengthSlider.oninput = updateNgramLength;
updateNgramLength({target:ngramLengthSlider});


const downloadButton = document.getElementById('download');

downloadButton.onclick = function() {
    const svg = document.getElementById('cloud');
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);

    // Bake the width and height into pixels
    const width = svg.getBoundingClientRect().width;
    const height = svg.getBoundingClientRect().height;
    const widthRegex = /<svg([^>]*)width="(\d+\S*)"/;
    const heightRegex = /<svg([^>]*)height="(\d+\S*)"/;
    const widthReplace = `<svg$1width="${Math.ceil(width)}px"`;
    const heightReplace = `<svg$1height="${Math.ceil(height)}px"`;
    source = source.replace(widthRegex, widthReplace);
    source = source.replace(heightRegex, heightReplace);


    // Include the font in the SVG
    if(cloudFont.family !== 'sans-serif') {
        const fontDeclaration = `<style type="text/css">@import url('https://fonts.googleapis.com/css2?family=${cloudFont.family}${cloudFont.weight?`:wght@${cloudFont.weight}`:""}');</style>`;
        source = source.replace(/<svg([^>]*)>/, `<svg$1>${fontDeclaration}`);
    }

    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'phrase cloud.svg';
    link.click();

    // Cleanup
    link.remove();
    URL.revokeObjectURL(url);
};


import defaultText from './default.txt';

ngram.onStatusUpdate = updateStatus;

fetch(defaultText)
    .then(r => r.text())
    .then(t => {
        postResponses(t);
    });



if(module.hot) {
    ngram.onWorkerReload = (ngrams) => {
        ngramList = ngrams;
        layout(ngramList);
    }
}