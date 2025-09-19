class TemplateParser {
    constructor() {
        this.variables = new Set();
        this.defaultsSection = {}; // Stores defaults from YAML section
        this.loops = [];
        this.conditionals = [];
        this.templateStructure = [];
    }

    parse(template) {
        this.variables.clear();
        this.defaultsSection = {};
        this.loops = [];
        this.conditionals = [];
        this.templateStructure = [];

        // Parse defaults section first and get template without defaults
        const templateWithoutDefaults = this._parseDefaultsSection(template);
        
        // Parse variables and control structures from remaining template
        this._parseTemplate(templateWithoutDefaults);
        
        return {
            variables: Array.from(this.variables),
            defaults: this.defaultsSection,
            loops: this.loops,
            conditionals: this.conditionals,
            structure: this.templateStructure
        };
    }

    _parseDefaultsSection(template) {
        const defaultsStart = template.indexOf('{% defaults %}');
        if (defaultsStart === -1) return template;
        
        const defaultsEnd = template.indexOf('{% enddefaults %}', defaultsStart);
        if (defaultsEnd === -1) return template;
        
        // Extract defaults content
        const defaultsContent = template.substring(defaultsStart + 14, defaultsEnd).trim();
        
        // Parse YAML-style key-value pairs
        const lines = defaultsContent.split('\n');
        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const colonIndex = trimmedLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = trimmedLine.substring(0, colonIndex).trim();
                    let value = trimmedLine.substring(colonIndex + 1).trim();
                    
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length - 1);
                    }
                    
                    this.defaultsSection[key] = value;
                }
            }
        });
        
        // Return template without defaults section for further parsing
        return template.substring(0, defaultsStart) + template.substring(defaultsEnd + 16);
    }

    _parseTemplate(template) {
        let currentPos = 0;
        const len = template.length;

        while (currentPos < len) {
            // Look for variable patterns: {{variable}}
            const varStart = template.indexOf('{{', currentPos);
            if (varStart === -1) {
                // No more variables, add remaining text
                if (currentPos < len) {
                    this.templateStructure.push({
                        type: 'text',
                        content: template.substring(currentPos)
                    });
                }
                break;
            }

            // Add text before variable
            if (currentPos < varStart) {
                this.templateStructure.push({
                    type: 'text',
                    content: template.substring(currentPos, varStart)
                });
            }

            const varEnd = template.indexOf('}}', varStart + 2);
            if (varEnd === -1) {
                // Malformed variable, treat as text
                this.templateStructure.push({
                    type: 'text',
                    content: template.substring(varStart)
                });
                break;
            }

            const variableContent = template.substring(varStart + 2, varEnd).trim();
            
            // Check if it's a control structure
            if (variableContent.startsWith('%')) {
                this._parseControlStructure(variableContent, varStart, varEnd);
            } else {
                // Regular variable
                this.variables.add(variableContent);
                this.templateStructure.push({
                    type: 'variable',
                    name: variableContent,
                    position: varStart
                });
            }

            currentPos = varEnd + 2;
        }
    }

    _parseControlStructure(content, start, end) {
        const controlContent = content.substring(1).trim();
        
        if (controlContent.startsWith('for ')) {
            this._parseForLoop(controlContent, start, end);
        } else if (controlContent.startsWith('if ')) {
            this._parseIfStatement(controlContent, start, end);
        } else if (controlContent.startsWith('endif') || controlContent.startsWith('endfor')) {
            this._parseEndBlock(controlContent, start, end);
        }
    }

    _parseForLoop(content, start, end) {
        const forPattern = /for\s+(\w+)\s+in\s+(\w+)/;
        const match = content.match(forPattern);
        
        if (match) {
            const loopVar = match[1];
            const collection = match[2];
            
            this.loops.push({
                type: 'for',
                variable: loopVar,
                collection: collection,
                start: start,
                end: end
            });

            this.templateStructure.push({
                type: 'for_start',
                loopVar: loopVar,
                collection: collection,
                position: start
            });
        }
    }

    _parseIfStatement(content, start, end) {
        const ifPattern = /if\s+(.+)/;
        const match = content.match(ifPattern);
        
        if (match) {
            const condition = match[1].trim();
            
            this.conditionals.push({
                type: 'if',
                condition: condition,
                start: start,
                end: end
            });

            this.templateStructure.push({
                type: 'if_start',
                condition: condition,
                position: start
            });
        }
    }

    _parseEndBlock(content, start, end) {
        if (content.startsWith('endfor')) {
            this.templateStructure.push({
                type: 'for_end',
                position: start
            });
        } else if (content.startsWith('endif')) {
            this.templateStructure.push({
                type: 'if_end',
                position: start
            });
        }
    }

    // Method to render template with provided data
    render(template, data) {
        let output = template;
        
        // Replace variables
        for (const variable of this.variables) {
            const value = this._getValueFromPath(data, variable) || '';
            output = output.replace(new RegExp(`{{${variable}}}`, 'g'), value);
        }

        // Handle loops (simplified implementation)
        const loopRegex = /{% for (\w+) in (\w+) %}(.*?){% endfor %}/gs;
        output = output.replace(loopRegex, (match, loopVar, collection, loopContent) => {
            const items = this._getValueFromPath(data, collection) || [];
            let loopOutput = '';
            
            for (const item of items) {
                let itemContent = loopContent;
                // Replace variables within loop content
                const varRegex = /{{(\w+(?:\.\w+)*)}}/g;
                itemContent = itemContent.replace(varRegex, (varMatch, varPath) => {
                    if (varPath.startsWith(loopVar + '.')) {
                        const prop = varPath.substring(loopVar.length + 1);
                        return item[prop] || '';
                    }
                    return this._getValueFromPath(data, varPath) || '';
                });
                loopOutput += itemContent;
            }
            
            return loopOutput;
        });

        // Handle conditionals (simplified implementation)
        const ifRegex = /{% if (.+?) %}(.*?){% endif %}/gs;
        output = output.replace(ifRegex, (match, condition, ifContent) => {
            // Simple condition evaluation
            const conditionResult = this._evaluateCondition(condition, data);
            return conditionResult ? ifContent : '';
        });

        return output;
    }

    _getValueFromPath(data, path) {
        const parts = path.split('.');
        let value = data;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    _evaluateCondition(condition, data) {
        // Simple condition evaluation for basic cases
        try {
            // Replace variables in condition with their values
            let evalCondition = condition;
            const varRegex = /(\w+(?:\.\w+)*)/g;
            
            evalCondition = evalCondition.replace(varRegex, (match, varPath) => {
                const value = this._getValueFromPath(data, varPath);
                return value !== undefined ? JSON.stringify(value) : 'undefined';
            });

            // Simple evaluation (note: this is a simplified approach)
            // In production, you'd want a more robust solution
            return eval(evalCondition);
        } catch (error) {
            console.warn('Condition evaluation failed:', error);
            return false;
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TemplateParser;
}
