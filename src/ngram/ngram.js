
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


var ngramList = null;


let worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = onWorkerMessage;
if (module.hot) {
    // Force the worker to reload regardless
    module.hot.addStatusHandler((status) => {
        switch(status) {
            case 'dispose':
                worker.terminate();
                break;
            case 'apply':
                worker = new Worker(new URL('./worker.js', import.meta.url));
                generateResolve = (ngramList) => {
                    onWorkerReload && onWorkerReload(ngramList);
                }
                worker.onmessage = onWorkerMessage;

                if(textContent) {
                    worker.postMessage({responses:textContent, ...settings});
                }

        }
    });
}



var settings = {
    minNgramLength: 1,
}
var textContent = null;

var updateStatus = null;


/**
 * Status update callback
 * @callback statusUpdateCallback
 * @param {string} status - The status message
 * @param {{responses: number}} stats - The stats object
 * @returns {void}
 */


let generateResolve = null;

/**
 * Worker message handler
 * @param {WorkerMessageEvent} e - The message event
 * @returns {void}
 */
var onWorkerMessage = (e) => {
    let msg = e.data;

    ngramList = null;

    switch(msg.type) {
        case 'update':
            let stats = {...msg.content};
            updateStatus && updateStatus(`Found ${Object.entries(msg.content).map(([k,v])=>`${k}: ${v}`).join(', ')}, generating...`, stats);
            break;
        case 'ngrams':
            let ngrams = msg.content.ngrams;

            // Get the most common phrases and their responses
            ngramList = Object.entries(ngrams).map(([k,v])=>({
                ngram:k, 
                phrase:v.commonPhrase, 
                responses:v.responses,
                count: v.responses.length
            }));
            ngramList = ngramList.sort((a,b)=>b.count - a.count);

            generateResolve && generateResolve(ngramList);

            break;
        case 'categories':
            let categories = msg.content.categories;

            ngramList = Object.entries(categories).map(([k,v])=>({
                ngram:k, 
                phrase:k, 
                count: v,
            }));
            ngramList = ngramList.sort((a,b)=>b.count - a.count);

            generateResolve && generateResolve(ngramList);

            break;
        default:
            console.log('Unknown message type', msg.type);
    }
    
}

const ngram = {

    /**
     * @param {statusUpdateCallback} callback - The callback function
     */
    set onStatusUpdate(callback) {
        updateStatus = callback;
        worker.onmessage = onWorkerMessage;

        return ngram;
    },

    /**
     * @param {string} tc - The text content
     * @returns {Promise<ngramList>} - The ngram list
     */
    generateNgramList: async (tc) => {
        textContent = tc || textContent;

        // TODO Restart worker if it's already running and not responding

        return new Promise((resolve, reject)=>{
            worker.postMessage({responses:textContent, ...settings});

            generateResolve = resolve;
            worker.onmessage = onWorkerMessage;
        });
    },

    /**
     * @returns {Array} - The last-generated ngram list
     * @readonly
     */
    get list() {
        return ngramList;
    },

    applySettings: async (newSettings) => {
        settings = {...settings, ...newSettings};

        if(textContent) {
            return new Promise((resolve, reject)=>{
                worker.postMessage({responses:textContent, ...settings});
    
                generateResolve = resolve;
                worker.onmessage = onWorkerMessage;           
            });
        } else {
            return null;
        }
    }
}

var onWorkerReload = null;

/** 
 * @callback workerReloadCallback
 * @param {ngramList} ngramList - The ngram list
 * @returns {void}
 */

// For development purposes, add an event handler for when the worker is updated
if(module.hot) {
    // Add a setter to ngram for onWorkerReload
    Object.defineProperty(ngram, 'onWorkerReload', {
        set: (callback) => {
            onWorkerReload = callback;

            return ngram;
        }
    });
}

export default ngram;