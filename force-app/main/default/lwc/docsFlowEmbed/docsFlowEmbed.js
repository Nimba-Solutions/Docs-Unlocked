import { LightningElement, api, track } from 'lwc';

export default class DocsFlowEmbed extends LightningElement {
    @api flowApiName = '';
    @api containerId = '';
    @track flowInputVariables = [];
    @track isVisible = false;
    @track containerStyle = '';
    
    _statusCallback = null;
    _containerElement = null;

    /**
     * Set the input variables for the flow
     * @param {Array} inputs - Array of {name, type, value} objects
     */
    @api
    setInputVariables(inputs) {
        if (!inputs || !Array.isArray(inputs)) {
            this.flowInputVariables = [];
            return;
        }
        
        // Convert to lightning-flow input format
        this.flowInputVariables = inputs.map(input => ({
            name: input.name,
            type: input.type,
            value: input.value
        }));
    }

    /**
     * Show the flow embedded at the specified container element
     * @param {HTMLElement} containerElement - The DOM element to position the flow over
     * @param {Function} statusCallback - Callback for flow status changes
     */
    @api
    show(containerElement, statusCallback) {
        this._containerElement = containerElement;
        this._statusCallback = statusCallback;
        
        if (containerElement) {
            this.positionOverContainer(containerElement);
        }
        
        this.isVisible = true;
        
        if (statusCallback) {
            statusCallback({ status: 'STARTED', flowName: this.flowApiName });
        }
    }

    /**
     * Hide the flow
     */
    @api
    hide() {
        this.isVisible = false;
        this._containerElement = null;
    }

    /**
     * Position the flow container over the target element
     */
    positionOverContainer(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        // Calculate absolute position
        const top = rect.top + scrollTop;
        const left = rect.left + scrollLeft;
        const width = Math.max(rect.width, 400); // Minimum width of 400px
        
        this.containerStyle = `
            position: absolute;
            top: ${top}px;
            left: ${left}px;
            width: ${width}px;
            min-height: 300px;
            z-index: 1000;
        `;
    }

    /**
     * Handle flow status changes
     */
    handleStatusChange(event) {
        const status = event.detail.status;
        const errorMessage = event.detail.errorMessage || '';
        const guid = event.detail.guid || '';
        console.log('[DocsFlowEmbed] Flow status changed: ' + status + (errorMessage ? ' - Error: ' + errorMessage : '') + (guid ? ' - GUID: ' + guid : ''));
        
        if (this._statusCallback) {
            this._statusCallback({
                status: status,
                flowName: this.flowApiName,
                outputVariables: event.detail.outputVariables,
                errorMessage: errorMessage
            });
        }
        
        // Auto-hide on completion if desired
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            // Keep visible to show completion, user can close manually
        }
    }

    /**
     * Handle close button click
     */
    handleClose() {
        this.hide();
        
        if (this._statusCallback) {
            this._statusCallback({
                status: 'CLOSED',
                flowName: this.flowApiName
            });
        }
    }

    /**
     * Update position on window resize
     */
    connectedCallback() {
        this._resizeHandler = () => {
            if (this.isVisible && this._containerElement) {
                this.positionOverContainer(this._containerElement);
            }
        };
        window.addEventListener('resize', this._resizeHandler);
    }

    disconnectedCallback() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
    }
}
