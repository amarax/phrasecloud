import * as wink from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';



const nlp = wink( model );
const its = nlp.its;
const as = nlp.as;



self.onmessage = (e) => {
    const responses = e.data.responses.map(r=>nlp.readDoc(r).sentences());
    

    self.postMessage({type:'update', content:{responses:responses.length}});

    let tokenizedResponses = responses.map(sentences => {
        
        // Remove punctuation and stop words
        let tokens = [];
        
        sentences.each(sentence=>{
            tokens.push( sentence.tokens().filter( token => {
                return token.out(its.type) === 'word' && !token.out(its.stopWordFlag);
            }) );
        });

        return tokens;
    });

    // Identify common ngrams, starting from token length 5 down to 1
    let ngrams = {};
    for(let i=5; i>0; i--) {
        tokenizedResponses.forEach((tokens, responseIndex)=>{
            tokens.forEach((t,sentenceIndex)=>{
                let normalizedSentence = t.out(its.normal);

                // Get all ngrams of length i
                for(let j=0; j<normalizedSentence.length-i; j++) {
                    let ngram = normalizedSentence.slice(j,j+i).join(' ');

                    // If the ngram is a subset of another existing ngram, check if this instance is indeed the superset ngram
                    // If so, skip this ngram
                    // let superset = Object.keys(ngrams).find(k=>k.includes(ngram));
                    // if(superset) {
                    // // if(superset && normalizedSentence.join(' ').includes(superset)) {
                    //     continue;
                    // }

                    if(ngrams[ngram]) {
                        ngrams[ngram].push( e.data.responses[responseIndex] );
                    } else {
                        ngrams[ngram] = [ e.data.responses[responseIndex] ];
                    }
                }
            });
        });

        // Remove all ngrams that only occur once
        Object.entries(ngrams).forEach(([k,v])=>{
            if(v===1) {
                delete ngrams[k];
            }
        });

        // Send ngrams to the main thread
        self.postMessage({type:'ngrams', content:{ngrams}});
    }
};