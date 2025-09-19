class TemplateGeneratorApp {
    constructor() {
        this.parser = new TemplateParser();
        this.templateData = {};
        this.defaultValues = {};
        this.usingDefaults = new Set(); // Track which variables are still using defaults
        this.currentTemplate = '';
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.templateInput = document.getElementById('templateInput');
        this.formContainer = document.getElementById('formContainer');
        this.generateButton = document.getElementById('generateConfig');
        this.configOutput = document.getElementById('configOutput');
        this.copyButton = document.getElementById('copyConfig');
        this.downloadButton = document.getElementById('downloadConfig');
        this.clearButton = document.getElementById('clearAll');
    }

    bindEvents() {
        this.generateButton.addEventListener('click', () => this.generateConfiguration());
        this.copyButton.addEventListener('click', () => this.copyToClipboard());
        this.downloadButton.addEventListener('click', () => this.downloadConfiguration());
        this.clearButton.addEventListener('click', () => this.clearAll());
        
        // Auto-parse on template change with debounce
        this.templateInput.addEventListener('input', this._debounce(() => {
            this._autoParseTemplate();
        }, 500));
    }

    _debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    _autoParseTemplate() {
        const template = this.templateInput.value.trim();
        
        if (!template) {
            this.formContainer.innerHTML = '<p class="placeholder">Enter a template to generate form fields</p>';
            this.generateButton.disabled = true;
            this.copyButton.disabled = true;
            this.downloadButton.disabled = true;
            this.currentTemplate = '';
            this.defaultValues = {};
            this.usingDefaults.clear();
            return;
        }

        this.currentTemplate = template;
        const parsed = this.parser.parse(template);
        
        // Store default values from defaults section
        this.defaultValues = parsed.defaults || {};
        this.usingDefaults.clear();
        
        // If no defaults section exists, insert empty YAML table with all variables
        if (Object.keys(this.defaultValues).length === 0 && parsed.variables.length > 0) {
            this._insertEmptyDefaultsSection(parsed.variables);
            return; // Return early, the input event will trigger again
        }
        
        this.templateData = this._initializeDataStructure(parsed);
        this._generateForm(parsed);
        
        this.generateButton.disabled = false;
    }

    _insertEmptyDefaultsSection(variables) {
        // Create empty YAML defaults section with all variables
        const simpleVars = variables.filter(v => !v.includes('.'));
        let defaultsContent = '{% defaults %}\n';
        
        simpleVars.forEach(variable => {
            defaultsContent += `${variable}: \n`;
        });
        
        defaultsContent += '{% enddefaults %}\n\n';
        
        // Insert at the beginning of the template
        const newTemplate = defaultsContent + this.currentTemplate;
        this.templateInput.value = newTemplate;
        
        // Trigger parsing again
        setTimeout(() => {
            this._autoParseTemplate();
        }, 100);
    }

    _initializeDataStructure(parsed) {
        const data = {};
        
        // Initialize simple variables with defaults
        parsed.variables.forEach(variable => {
            if (!variable.includes('.')) {
                // Use default value if available, otherwise empty string
                data[variable] = this.defaultValues[variable] || '';
                
                // Track if using default
                if (this.defaultValues[variable]) {
                    this.usingDefaults.add(variable);
                }
            }
        });

        // Initialize collections for loops
        parsed.loops.forEach(loop => {
            if (!data[loop.collection]) {
                data[loop.collection] = [this._createLoopItem(loop)];
            }
        });

        return data;
    }

    _createLoopItem(loop) {
        const item = {};
        // We'll populate this with the loop variable structure later
        return item;
    }

    _generateForm(parsed) {
        this.formContainer.innerHTML = '';
        
        if (parsed.variables.length === 0 && parsed.loops.length === 0) {
            this.formContainer.innerHTML = '<p class="placeholder">No variables found in template</p>';
            return;
        }

        // Create form for simple variables
        if (parsed.variables.length > 0) {
            const simpleVars = parsed.variables.filter(v => !v.includes('.'));
            if (simpleVars.length > 0) {
                this._createVariableGroup('Configuration Variables', simpleVars);
            }
        }

        // Create forms for loops
        parsed.loops.forEach(loop => {
            this._createLoopForm(loop);
        });
    }

    _createVariableGroup(title, variables) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'variable-group';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = title;
        groupDiv.appendChild(titleEl);

        variables.forEach(variable => {
            const formRow = document.createElement('div');
            formRow.className = 'form-row';
            
            const label = document.createElement('label');
            label.textContent = variable;
            label.htmlFor = variable;
            
            const input = document.createElement('input');
            input.type = 'text';
            input.id = variable;
            input.name = variable;
            input.placeholder = `Enter ${variable}`;
            input.value = this.templateData[variable] || '';
            
            input.addEventListener('input', (e) => {
                this.templateData[variable] = e.target.value;
                
                // Remove from defaults if user modifies the value
                if (this.usingDefaults.has(variable)) {
                    this.usingDefaults.delete(variable);
                }
            });

            formRow.appendChild(label);
            formRow.appendChild(input);
            groupDiv.appendChild(formRow);
        });

        this.formContainer.appendChild(groupDiv);
    }

    _createLoopForm(loop) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'variable-group';
        
        const titleEl = document.createElement('h3');
        titleEl.textContent = `${loop.collection} (Loop Items)`;
        groupDiv.appendChild(titleEl);

        const loopControls = document.createElement('div');
        loopControls.className = 'loop-controls';
        
        const addButton = document.createElement('button');
        addButton.className = 'add-item-btn';
        addButton.textContent = 'Add Item';
        addButton.addEventListener('click', () => this._addLoopItem(loop, groupDiv));
        
        loopControls.appendChild(addButton);
        groupDiv.appendChild(loopControls);

        // Create initial items
        this.templateData[loop.collection].forEach((item, index) => {
            this._createLoopItemForm(loop, item, index, groupDiv);
        });

        this.formContainer.appendChild(groupDiv);
    }

    _createLoopItemForm(loop, item, index, parent) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'loop-item';
        
        const itemHeader = document.createElement('div');
        itemHeader.style.display = 'flex';
        itemHeader.style.justifyContent = 'space-between';
        itemHeader.style.alignItems = 'center';
        itemHeader.style.marginBottom = '10px';
        
        const itemTitle = document.createElement('strong');
        itemTitle.textContent = `${loop.collection}[${index}]`;
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-item-btn';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => this._removeLoopItem(loop, index, itemDiv));
        
        itemHeader.appendChild(itemTitle);
        itemHeader.appendChild(removeButton);
        itemDiv.appendChild(itemHeader);

        // Create input for loop variable (simplified)
        const inputRow = document.createElement('div');
        inputRow.className = 'form-row';
        
        const label = document.createElement('label');
        label.textContent = loop.variable;
        label.htmlFor = `${loop.collection}_${index}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `${loop.collection}_${index}`;
        input.name = `${loop.collection}_${index}`;
        input.placeholder = `Enter ${loop.variable}`;
        input.value = item[loop.variable] || '';
        
        input.addEventListener('input', (e) => {
            this.templateData[loop.collection][index][loop.variable] = e.target.value;
        });

        inputRow.appendChild(label);
        inputRow.appendChild(input);
        itemDiv.appendChild(inputRow);

        parent.insertBefore(itemDiv, parent.querySelector('.loop-controls'));
    }

    _addLoopItem(loop, parent) {
        const newItem = this._createLoopItem(loop);
        this.templateData[loop.collection].push(newItem);
        const index = this.templateData[loop.collection].length - 1;
        this._createLoopItemForm(loop, newItem, index, parent);
    }

    _removeLoopItem(loop, index, itemElement) {
        this.templateData[loop.collection].splice(index, 1);
        itemElement.remove();
        
        // Re-render all items to update indices
        const group = itemElement.parentElement;
        const controls = group.querySelector('.loop-controls');
        group.innerHTML = '';
        group.appendChild(controls);
        
        this.templateData[loop.collection].forEach((item, newIndex) => {
            this._createLoopItemForm(loop, item, newIndex, group);
        });
    }

    generateConfiguration() {
        if (!this.currentTemplate) {
            alert('Please parse a template first');
            return;
        }

        // Check for default values and show warning if any are found
        if (this.usingDefaults.size > 0) {
            this._showDefaultValuesWarning();
            return;
        }

        this._renderConfiguration();
    }

    _renderConfiguration() {
        try {
            const output = this.parser.render(this.currentTemplate, this.templateData);
            this.configOutput.textContent = output;
            this.copyButton.disabled = false;
            this.downloadButton.disabled = false;
            
            // Add basic syntax highlighting for router config
            this._applySyntaxHighlighting();
            
        } catch (error) {
            console.error('Error generating configuration:', error);
            alert('Error generating configuration. Please check the console for details.');
        }
    }

    _showDefaultValuesWarning() {
        const warningModal = document.createElement('div');
        warningModal.className = 'modal-overlay';
        warningModal.innerHTML = `
            <div class="modal-content">
                <h3>Warning: Using Default Values</h3>
                <p>The following variables are still using their default values:</p>
                <ul>
                    ${Array.from(this.usingDefaults).map(variable => 
                        `<li><strong>${variable}</strong>: ${this.defaultValues[variable]}</li>`
                    ).join('')}
                </ul>
                <p>Are you sure you want to proceed with these defaults?</p>
                <div class="modal-actions">
                    <button id="proceedWithDefaults" class="btn-warning">Proceed Anyway</button>
                    <button id="cancelDefaults" class="btn-secondary">Cancel and Edit</button>
                </div>
            </div>
        `;

        document.body.appendChild(warningModal);

        // Add event listeners
        document.getElementById('proceedWithDefaults').addEventListener('click', () => {
            document.body.removeChild(warningModal);
            this._renderConfiguration();
        });

        document.getElementById('cancelDefaults').addEventListener('click', () => {
            document.body.removeChild(warningModal);
        });

        // Close modal on overlay click
        warningModal.addEventListener('click', (e) => {
            if (e.target === warningModal) {
                document.body.removeChild(warningModal);
            }
        });
    }

    downloadConfiguration() {
        const configText = this.configOutput.textContent;
        
        if (!configText) {
            alert('No configuration to download. Please generate a configuration first.');
            return;
        }

        // Create a filename based on hostname or use default
        let filename = 'router-config.cfg';
        const hostnameMatch = configText.match(/hostname\s+(\S+)/);
        if (hostnameMatch && hostnameMatch[1]) {
            filename = `${hostnameMatch[1]}.cfg`;
        }

        // Create blob and download link
        const blob = new Blob([configText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }

    _applySyntaxHighlighting() {
        let html = this.configOutput.textContent;
        
        // Highlight comments first (to avoid interfering with other patterns)
        html = html.replace(/!.*$/gm, '<span class="router-comment">$&</span>');
        
        // Highlight interface names
        html = html.replace(/(interface\s+)([^\s\n]+)/gi, (match, p1, p2) => {
            return `${p1}<span class="router-interface">${p2}</span>`;
        });
        
        // Basic highlighting for common router commands (only at start of line or after whitespace)
        const keywords = [
            'vlan', 'ip', 'address', 'description', 
            'hostname', 'enable', 'password', 'router', 'ospf',
            'bgp', 'eigrp', 'access-list', 'nat', 'route'
        ];
        
        keywords.forEach(keyword => {
            // Only match keywords at the beginning of a line or after whitespace
            // This prevents matching keywords that are part of parameter values
            const regex = new RegExp(`(^|\\s)${keyword}\\b`, 'gi');
            html = html.replace(regex, (match, preceding) => {
                // Only replace if not already inside a span and if it's a command, not a parameter value
                if (!match.startsWith('<span') && this._isCommandContext(match, preceding)) {
                    return `${preceding}<span class="router-keyword">${keyword}</span>`;
                }
                return match;
            });
        });
        
        this.configOutput.innerHTML = html;
    }

    _isCommandContext(match, preceding) {
        // Check if this is likely a command context rather than a parameter value
        // Commands are typically at the start of a line or after minimal indentation
        const trimmedPreceding = preceding.trim();
        return trimmedPreceding === '' || /^\s{0,4}$/.test(preceding);
    }

    copyToClipboard() {
        const text = this.configOutput.textContent;
        
        navigator.clipboard.writeText(text).then(() => {
            const originalText = this.copyButton.textContent;
            this.copyButton.textContent = 'Copied!';
            
            setTimeout(() => {
                this.copyButton.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard');
        });
    }

    clearAll() {
        this.templateInput.value = '';
        this.formContainer.innerHTML = '<p class="placeholder">Enter a template to generate form fields</p>';
        this.configOutput.textContent = '';
        this.generateButton.disabled = true;
        this.copyButton.disabled = true;
        this.downloadButton.disabled = true;
        this.templateData = {};
        this.currentTemplate = '';
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TemplateGeneratorApp();
});
