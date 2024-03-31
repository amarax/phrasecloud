import * as d3 from 'd3';
import cloud from 'd3-cloud';

import './styles.css';

import ngram from './ngram/ngram.js';

import DataSource from './dataSource.js';

const status = document.getElementById('status');


var dataSource = new DataSource();

function updateStatus(message, s) {
    status.innerHTML = message;

    if(s) {
        stats = s;
    }
}

var stats = {}

var ngramSelection = {
    _selected: null,
    get selected() {
        return this._selected;
    },
    set selected(value) {
        this._selected = value;

        // Apply the selected class to the text element
        d3.select('#cloud')
            .select('g')
            .selectAll('text')
            .classed('selected', d=>d?.key === value);

        let responses = [];
        if(value) {
            // Get the ngram from the ngramList
            let ng = ngram.list.find(n=>n.ngram === value);

            // Get responses for this ngram
            responses = ng.responses;

            d3.select('#responseCount')
                .text(`Item count: ${ng.count}`)

            // Scroll to top of responses
            document.getElementById('responses').scrollTop = 0;

            // If the side panel is hidden, show it
            if(!document.getElementById('responses').parentElement.classList.contains('expanded')) {
                document.getElementById('responses').parentElement.classList.add('expanded');
            }
        }

        // Sanitise the markup, with the exception of the <span> tags
        function sanitise(markup) {
            // Replace all < and > with &lt; and &gt; unless they are part of an exception match
            return markup.replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/&lt;span class="match"&gt;(.*?)&lt;\/span&gt;/g, m=>m.replace(/&lt;span class="match"&gt;/g, '<span class="match">').replace(/&lt;\/span&gt;/g, '</span>'));
        }

        d3.select('#responseCount')
            .classed('hidden', !value);

        d3.select('#responseList')
            .selectAll('li')
            .data(responses?.map(r=>sanitise(r.markup)) || [])
            .join('li')
                .html(d=>d)


        d3.select('#responsesEmpty')
            .classed('hidden', value);

    }
}

// var cloudFont = {family:'Manrope', weight:'800'};
var cloudFont = {family:'sans-serif', weight:'bold'}; // Use this to maintain full compatibility for SVG export


var maxPhrases = 100;
async function layout(ngrams) {
    if(!ngrams) return;

    // Remove non-printing ngrams
    ngrams = ngrams.filter(n=>n.ngram.trim().length > 0);

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
        // return Math.sqrt(d.count/maxResponses);
        // return Math.sqrt( (d.count/maxResponses)/(d.phrase.length) );
        return d.count/maxResponses;
    }
    let maxApproxPhraseWidth = Math.max(...ngrams.map(n=>n.phrase.length*size(n)));

    // Make the font size fit in the SVG
    // Fit roughly 8 large rows
    // And make sure the longest phrase fits (character count * 0.6 is a rough estimate of the width of the text for English)
    let cloudRect = document.getElementById('cloud').getBoundingClientRect();
    let maxFontSize = Math.min(cloudRect.height / Math.min(6, ngrams.length), cloudRect.width / (maxApproxPhraseWidth*.6));

    let layout = cloud()
        .size([cloudRect.width, cloudRect.height])
        .words(ngrams.map(function(d) {
            let w = {text: d.phrase, key:d.ngram, size:maxFontSize * size(d), count:d.count};
            if(d.responses) w.responses = d.responses;
            return w;
        }))
        .padding(1)
        
        .font(cloudFont.family)
        // .fontWeight(cloudFont.weight)
        .rotate(()=>0)
        .fontSize(function(d) { return d.size; })
        .on("end", words=>{
            draw(words, layout);
            updateStatus(`Done! (Responses: ${Object.entries(stats).map(([k,v])=>`${k}: ${v}`).join(', ')}, Phrases: ${ngram.list.length})`, stats);
        });

    cloudFont.weight && layout.fontWeight(cloudFont.weight);
    layout.start();
}


function createDataColors() {
    let hueRange = 90;
    let hueOffset = 0;
    let chroma = 0.4;
    let lightness = 30;

    // Splitmix32 PRNG
    function splitmix32(a) {
        return function() {
          a |= 0; a = a + 0x9e3779b9 | 0;
          var t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
              t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
          return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
        }
    }

    // Hash function
    function cyrb128(str) {
        let h1 = 1779033703, h2 = 3144134277,
            h3 = 1013904242, h4 = 2773480762;
        for (let i = 0, k; i < str.length; i++) {
            k = str.charCodeAt(i);
            h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
            h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
            h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
            h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
        }
        h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
        h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
        h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
        h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
        h1 ^= (h2 ^ h3 ^ h4), h2 ^= h1, h3 ^= h1, h4 ^= h1;
        return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
    }

    function color(d) {
        if(!d?.key) return null;

        // Generate a random colour that's based on the text as a seed
        // Use the LCH model so that colours are perceptually similar in brightness
        let seed = cyrb128(d.key);
        let h = splitmix32(seed[2])();
        // let h = seed[0]/Math.pow(2,32);
        
        let hue = h * hueRange + hueOffset + 0.5*hueRange;

        // Check if the device is wide color gamut
        if(window.matchMedia('(color-gamut: p3)').matches) {
            return `oklch(${lightness}% ${chroma} ${hue})`;
        }

        // Otherwise, use sRGB
        return d3.hcl(hue, chroma, lightness);
    }

    function redrawColorsOnly() {
        d3.select('#cloud')
            .select('g.cloud')
            .selectAll('text')
            .attr('fill', color);
    }

    function setHueRange(value) {
        hueRange = value;
        redrawColorsOnly();
    }

    function setHueOffset(value) {
        hueOffset = value;
        redrawColorsOnly();
    }

    function setChroma(value) {
        chroma = value;
        redrawColorsOnly();
    }

    function setLightness(value) {
        lightness = value;
        redrawColorsOnly();
    }

    return {
        setHueRange,
        setHueOffset,
        setChroma,
        setLightness,
        redrawColorsOnly,
    };
}

const dataColors = createDataColors();

// Update dataColors when sliders change
const hueRangeSlider = document.getElementById('hueRange');
const hueOffsetSlider = document.getElementById('hueOffset');
const chromaSlider = document.getElementById('chroma');
const lightnessSlider = document.getElementById('lightness');

const updateDataColors = () => {
    const hueRange = parseFloat(hueRangeSlider.value);
    const hueOffset = parseFloat(hueOffsetSlider.value);
    const chroma = parseFloat(chromaSlider.value);
    const lightness =parseFloat(lightnessSlider.value);

    // Update data colors with the modified lightness value
    dataColors.setHueRange(hueRange);
    dataColors.setHueOffset(hueOffset);
    dataColors.setChroma(chroma);
    dataColors.setLightness(lightness);
};

hueRangeSlider.oninput = updateDataColors;
hueOffsetSlider.oninput = updateDataColors;
chromaSlider.oninput = updateDataColors;
lightnessSlider.oninput = updateDataColors;

updateDataColors();



function draw(words, layout) {
    console.log("Drawing words", words.length);

    // Remove the loading message in the SVG
    d3.select('#cloud').select('.loading')?.remove();

    d3.select("#cloud")
        .select("g.cloud")
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
                        .style("transform", function(d) {
                            return `translate(${d.x}px, ${d.y}px)`
                        })
                        .attr("text-anchor", "middle")
                        .text(function(d) { return d.text; })
                        .on('mousedown', function(e, d) {
                            ngramSelection.selected = d.key;
                        })

                        .style("opacity", 0)
                        .transition()
                        .duration(500)
                        .style("opacity", null)
                },
                function(update) {
                    update.text(d=>d.text)
                        .style("transform", function(d) {
                            return `translate(${d.x}px, ${d.y}px)`;
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

    let wordsBySizes = words.map(w=>({size:w.size, count:w.count})).sort((a,b)=>a.count-b.count);

    let percentiles = [25, 50, 75];

    let legendData = [];

    // If there are less than 5 unique counts
    let uniqueCounts = new Set(wordsBySizes.map(w=>w.count));
    uniqueCounts = [...uniqueCounts.values()].sort((a,b)=>a-b);
    switch(uniqueCounts.length) {
        case 1:
        case 2:
        case 3:
            legendData = uniqueCounts.map(c=>{
                let index = wordsBySizes.findIndex(w=>w.count === c);
                return {size: wordsBySizes[index].size, count: wordsBySizes[index].count};
            });
            break;
        case 4:
            percentiles = [0, 50, 100];
            // Deliberately don't break here
        default:
            legendData = percentiles.map(p=>{
                let countIndex = Math.round((uniqueCounts.length-1) * p/100);
                let index = wordsBySizes.findIndex(w=>w.count === uniqueCounts[countIndex]);
                return {size: wordsBySizes[index].size, count: wordsBySizes[index].count};
            });
            break;
    }

    let offset = 0;
    legendData.forEach(d=>{d.offset = offset; offset += d.size;})

    let legend = d3.select('#cloud').select('g.legend');
    legend.selectAll('text')
        .data(legendData, d=>d.count)
        .join(
            enter => {
                enter.append('text')
            .text(d=>`${d.count} responses`)
            .style("transform", function(d) {
                return `translate(${10}px, ${layout.size()[1] - d.offset - 10}px)`;
            })
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'baseline')
                    .style('font-family', cloudFont.family)
                    .style('font-weight', cloudFont.weight)
                    .style('font-size', d=>d.size + 'px')

                    .style("opacity", 0)
                    .transition()
                        .duration(500)
                        .style("opacity", null)
            },
            update => {
                update
                    .text(d=>`${d.count} responses`)
                    .style("transform", function(d) {
                        return `translate(${10}px, ${layout.size()[1] - d.offset - 10}px)`;
                    })
            .style('font-size', d=>d.size + 'px')
            },
            exit => {
                exit.style("opacity", 1)
                    .transition()
                        .duration(300)
                        .style("opacity", 0)
                        .remove();
            }
        )

    dataColors.redrawColorsOnly();
}

// Clicking an empty space in the SVG deselects the ngram
document.getElementById('cloud').onclick = (e) => {
    if(e.target === document.getElementById('cloud')) {
        ngramSelection.selected = null;
    }
}


// When the viewport resizes, resize the cloud a short time after the last resize event 
// to ensure the cloud is sized correctly and doesn't jump around while resizing
const cloudElement = document.querySelector('svg#cloud');

const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(() => {
            layout(ngram.list);
        }, 100);
    }
});

resizeObserver.observe(cloudElement);

const defaultTableColumnIndex = 0;

var columnHeaders = null;
function updateColumnHeaders(headers) {
    let disabled = headers == null ? true : null;

    d3.select(columnSelectionElements.select)
        .attr('disabled', disabled)
        .selectAll('option')
        .data(headers || ['Not a table'])
        .join('option')
            .attr('value', headers ? (d,i)=>i : null)
            .text(d=>d)

    columnSelectionElements.prev.disabled = disabled;
    columnSelectionElements.next.disabled = disabled;

    if(headers)
        columnSelectionElements.select.value = defaultTableColumnIndex;
}

var _columnIndex = defaultTableColumnIndex

var dataSourceSettings = {
    set columnIndex(value) {
        _columnIndex = Math.max(0, Math.min(value, columnHeaders.length - 1));
        
        ngram.generateNgramList(dataSource.source.data.map((row)=>row[_columnIndex]))
            .then((ngrams)=>{
                if(ngrams.length === 0) {
                    displayCloudMessage('No repeating phrases found.');
                } else {
                    layout(ngrams);
                }
            });

        if(columnSelectionElements.select.value != _columnIndex)
            columnSelectionElements.select.value = _columnIndex;
    },
    get columnIndex() {
        return _columnIndex;
    }


}


const columnSelectionElements = {
    select: document.getElementById('columnSelect'),
    prev: document.getElementById('prevColumn'),
    next: document.getElementById('nextColumn'),
}

columnSelectionElements.select.onchange = async (e) => {
    dataSourceSettings.columnIndex = parseInt(e.target.value);
}

// Increment and decrement column index
columnSelectionElements.prev.onclick = (e) => {
    dataSourceSettings.columnIndex--;
}
columnSelectionElements.next.onclick = (e) => {
    dataSourceSettings.columnIndex++;
}




async function loadTableData(source) {
    let tableData = source.data;

    columnHeaders = tableData.shift();
    updateColumnHeaders(columnHeaders);

    // Loop through the columns until we find one that has ngrams in it
    let responses = null;
    for(let i = 0; i < columnHeaders.length; i++) {
        let data = tableData.map((row) => row[i]);
        let ngrams = await ngram.generateNgramList(data)
        ngrams = ngrams.filter(n=>n.ngram.trim().length > 0);
        if(ngrams.length > 0) {
            responses = data;
            _columnIndex = i;

            break;
        }
    }
    
    // If there are no ngrams, use the first column
    if(!responses) {
        _columnIndex = defaultTableColumnIndex;
    }

    document.getElementById('columnSelect').value = dataSourceSettings.columnIndex;
}

dataSource.addEventListener('change', async (source) => {
    columnHeaders = null;
    if(source.loading) {
        status.innerHTML = 'Loading...';

        if(source.file) {
            displayCloudMessage('Loading file...');
        } else {
            displayCloudMessage('Processing text...');
        }

        updateColumnHeaders();
        return;
    }

    if(![...fileInput.files].includes(source.file)) {
        fileInput.value = null;
    }

    if(source.data) {
        if(source.type === 'table') {
            await loadTableData(source);


        } else {
            updateColumnHeaders();

            await ngram.generateNgramList(source.data);
        }

        if(ngram.list.length === 0) {
            displayCloudMessage('No repeating phrases found in the data.');
        } else {
            await layout(ngram.list);
        }
    }
});


// When the textfile file input changes, process the file via wink-nlp
const fileInput = document.getElementById('textfile');
fileInput.onchange = (e) => {
    dataSource.source = e.target.files[0];
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
    // Reset selection
    ngramSelection.selected = null;

    // Replace the cloud with a loading message
    d3.select('#cloud')
    .select('g.cloud')
    .selectAll('text')
    .remove();

    d3.select('#cloud')
    .select('g.cloud')
        .attr('transform', null)
    .append('text')
        .classed('loading', true)
        .attr('x', '50%')
        .attr('y', '50%')
        .attr('text-anchor', 'middle')
        .text(message);

    // Remove the legend
    d3.select('#cloud')
        .select('g.legend')
        .selectAll('text')
        .remove();
}


import dropZone from './dropZone.js';
let drop = dropZone(document.getRootNode())
    .isallowed(e=>isText(e) || isTextFile(e))
    .ondrop(e=>{
        if(isText(e)) {
            dataSource.source = e.dataTransfer.getData('text/plain');
        } else if(isTextFile(e)) {
            fileInput.value = null;
            dataSource.source = e.dataTransfer.items[0]?.getAsFile() || e.dataTransfer.files[0];
        }
    });


const ngramLengthSlider = document.getElementById('ngramLength');
const ngramLengthDisplay = document.getElementById('ngramLengthDisplay');

async function updateNgramLength(e) {
    ngramLengthDisplay.textContent = e.target.value;
    await ngram.applySettings({ minNgramLength: e.target.value });

    if(ngram.list)
        await layout(ngram.list);
}

ngramLengthSlider.oninput = updateNgramLength;
updateNgramLength({target:ngramLengthSlider});

import chroma from "chroma-js"
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

    // If the legend is not shown, remove it from the SVG
    if(!document.getElementById('showLegend').checked) {
        const legendRegex = /<g class="legend hidden"([^>]*)>([\s\S]+?)<\/g>/;
        source = source.replace(legendRegex, '');
    } else {
        // Bake the colour of the legend into the text elements
        // Get the colour of the legend from the CSS and bake it into the SVG
        const legendRegex = /<g class="legend"([^>]*)>([\s\S]+?)<\/g>/;
        const legendTextRegex = /<text([^>]*)>([\s\S]+?)<\/text>/g;
        const legendTextFill = `fill="${getComputedStyle(document.querySelector('#cloud g.legend text')).fill}"`;
        source = source.replace(
            legendRegex,
            (match, g, text)=>{
                return match.replace(
                    legendTextRegex,
                    (match, attrs, text)=>{
                        return `<text${attrs} ${legendTextFill}>${text}</text>`
                    }
                );
            }
        );
    }


    // Convert all oklch colours to RGB using chroma.js
    const colorRegex = /oklch\(([\s\S]+?)% ([\s\S]+?) ([\s\S]+?)\)/g;
    source = source.replace(colorRegex, (match, l, c, h)=>{
        let rgb = chroma.oklch(l/100, c, h).rgb();
        return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
    });


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
import { unique } from 'webpack-merge';

ngram.onStatusUpdate = updateStatus;

fetch(defaultText)
    .then(r => r.text())
    .then(t => {
        dataSource.source = t;
    });



if(module.hot) {
    ngram.onWorkerReload = (ngrams) => {
        layout(ngram.list);
    }
}



// Handle pasting text or files into the app
document.addEventListener('paste', async (e)=>{
    if(e.clipboardData.types.includes('Files')) {
        // Get the file from the clipboard
        let f = e.clipboardData.items[0]?.getAsFile() || e.clipboardData.files[0];
        
        // Only if the file is text or csv
        if(f.type === 'text/plain' || f.type === 'text/csv') {
            // Load the file
            dataSource.source = f;
            return;
        }
    } 
    
    if(e.clipboardData.types.includes('text/plain')) {
        // Detect if the text from the clipboard comes from a spreadsheet
        // If it does, it will be tab separated
        // Check if the text is a valid tab-separated table
        let text = e.clipboardData.getData('text/plain');

        dataSource.source = text;
    }
});


// Toogle show/hide legend
document.getElementById('showLegend').onclick = (e) => {
    let show = e.target.checked;
    d3.select('#cloud').select('g.legend').classed('hidden', !show);
}