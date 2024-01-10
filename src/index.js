import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';

import * as d3 from 'd3';

// Create a new instance of wink-nlp
// Load the default English language model
const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;

const app = document.getElementById('app');

const reader = new FileReader();
reader.onload = (e) => {
    const text = e.target.result;
    const doc = nlp.readDoc(text);
    
    const sentences = doc.sentences().out('array');

    const out = {
    sentences,

    };
    console.log(out);

    // Change app content to show results
    app.innerHTML = `Loaded ${sentences.length} sentences`;
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