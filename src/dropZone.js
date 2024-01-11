/** 
 * Callback for the `drop` event.
 * @callback dropZone~ondrop
 * @param {event} e - The drop event.
 * @returns {dropZone} - The dropZone object
 */

/** 
 * Callback for the `isallowed` event.
 * @callback dropZone~isallowed
 * @param {event} e - The dragover event.
 * @returns {boolean} - Whether the drop is allowed.
 */

/**
 * @typedef {Object} dropZone
 * @property {function(dropZone~ondrop): dropZone} ondrop - Sets the callback for the `drop` event.
 * @property {function(dropZone~isallowed): dropZone} isallowed - Sets the callback for the `isallowed` event.
 */


/**
 * Creates a drop zone with event listeners for drag and drop functionality.
 * @param {HTMLElement} element - The HTML element representing the drop zone.
 * @returns {dropZone}
 */
function dropZone(element) {
    // Get the visual elements, which is identified as the .label child
    const label = element.querySelector('.label');

    function hide() {
        label.classList.add('hidden');
    }

    function show() {
        label.classList.remove('hidden');
    }

    // Add event listeners
    element.addEventListener('dragover', (e) => {
        e.preventDefault();

        if(!typeof isallowed === 'function' || isallowed(e)) {
            show();
        }
    });

    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        hide();
    });

    element.addEventListener('drop', (e) => {
        e.preventDefault();
        hide();

        if(typeof ondrop === 'function') {
            ondrop(e);
        }
    });

    hide();

    var ondrop = null;
    var isallowed = null;

    var returnObj = {
        ondrop: function(callback) {
            ondrop = callback;
            return returnObj;
        },
        isallowed: function(callback) {
            isallowed = callback;
            return returnObj;
        }
    }

    return returnObj;
}

export default dropZone;