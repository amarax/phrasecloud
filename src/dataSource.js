import { csvParseRows, tsvParseRows } from "d3";
import ngram from "./ngram/ngram";

/**
 * @typedef {Object} Source
 * @property {string[]} data - The data to process for ngrams
 * @property {File} file - The file object, if any
 * @property {boolean} loading - Whether the source is loading
 * @property {'table'|'text'|null} type - The type of data
 */
var _source = {
    data: null,
    file: null,
    type: null,

    loading: false,
};

const EmptySource = {
    data: null,
    file: null,
    type: null,

    loading: false,
};

const reader = new FileReader();
reader.onload = async (e) => {
    _source.loading = false;

    if(_source.file.type === 'text/csv') {
        _source.data = csvParseRows( e.target.result ).filter((row) => row.length > 0 && row.some((c) => c.length > 0));
        _source.type = 'table';
    } else {
        _source.data = e.target.result.split('\n').filter(r=>r.length > 0);
        _source.type = 'text';
    }
    changed();

}

/**
 * @callback eventCallback
 * @param {Source} source - The data source
 * @returns {void}
 */

var _events = {
    /**
     * @type {eventCallback[]}
     */
    change: [],
}

function changed() {
    _events.change.forEach((cb)=>cb(_source));
}



/**
 * @typedef {Object} DataSource
 * @property {Source} source - The data source
 * @property {number} csvColumnIndex - The selected CSV column index
 */
function construct() {
    return {
        set source(source) {
            _source = {...EmptySource};

            if(source instanceof File) {
                _source.loading = true;
                _source.file = source;
                reader.readAsText(_source.file);
            } else if(source instanceof Array && source.every(r=>r instanceof Array)) {
                _source.type = 'table';
                _source.loading = false;
                _source.data = source.filter((row) => row.length > 0 && row.some((c) => c.length > 0));
            } else if(typeof source === 'string') {
                let table = tsvParseRows(source)
                    .filter((row) => row.length > 0 && row.some((c) => c.length > 0));
                let isSpreadsheet = table[0].length > 1 && table.every(r=>r.length === table[0].length);
                if(isSpreadsheet) {
                    _source.type = 'table';
                    _source.data = table;
                } else {
                    _source.data = source.split('\n').filter(r=>r.length > 0);
                    _source.type = 'text';
                }
                _source.loading = false;
            }
            changed();
        },

        get source() {
            return _source;
        },

        set tableColumnIndex(index) {
            if(tableData && index !== _source.columnIndex) {
                _source.columnIndex = index;
                _source.data = tableData.map((row) => row[index]);
                _source.ngrams = null;
            }
            changed();
        },

        /**
         * Adds an event listener
         * @param {'change'} event - The event name
         * @param {eventCallback} callback - The callback
         */
        addEventListener: (event, callback) => {
            if(!_events[event]) return;
                
            _events[event].push(callback);
        },
        removeEventListener: (event, callback) => {
            if(!_events[event]) return;
                
            _events[event] = _events[event].filter((cb) => cb !== callback);
        },
    }
}

export default construct;