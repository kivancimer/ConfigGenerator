# Router Configuration Template Generator

A powerful web-based tool for generating router and network device configurations using Jinja2-style templates. Create dynamic configuration templates with variables, loops, and conditionals, then generate complete configurations through an intuitive form interface.

## 🚀 Features

- **Jinja2-style Template Engine**: Full support for `{{variables}}`, `{% for %}` loops, and `{% if %}` conditionals
- **Automatic Form Generation**: Dynamically creates input forms based on template variables
- **YAML Defaults Section**: Define default values in a dedicated section at the top of templates
- **Real-time Validation**: Warning system for unchanged default values
- **Syntax Highlighting**: Professional highlighting for router configuration commands
- **One-Click Export**: Download configurations as `.cfg` files or copy to clipboard
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 📖 How to Use

### Basic Usage

1. **Enter Your Template**: Paste your Jinja2-style template in the input area
2. **Auto-Parsing**: The template is automatically parsed as you type (no button needed!)
3. **Fill in Values**: Enter values in the generated form fields
4. **Generate Configuration**: Click "Generate Configuration" to create the final output
5. **Export Results**: Use "Copy to Clipboard" or "Download as .cfg" to save your configuration

### Template Syntax

#### Variables
```jinja2
hostname {{hostname}}
interface {{interface_name}}
 ip address {{ip_address}} {{subnet_mask}}
```

#### For Loops
```jinja2
{% for vlan in vlans %}
vlan {{vlan.id}}
 name {{vlan.name}}
{% endfor %}
```

#### Conditionals
```jinja2
{% if enable_ospf %}
router ospf {{ospf_process_id}}
 router-id {{router_id}}
{% endif %}
```

### YAML Defaults Section

Define default values at the beginning of your template:

```jinja2
{% defaults %}
hostname: router-01
interface_name: GigabitEthernet0/1
description: Primary Uplink Interface
ip_address: 192.168.1.1
subnet_mask: 255.255.255.0
admin_state: enable
{% enddefaults %}

! Your template continues here
interface {{interface_name}}
 description {{description}}
 ip address {{ip_address}} {{subnet_mask}}
! {{admin_state}}
```

**Note**: If you don't include a defaults section, the application will automatically create one with all detected variables!

## 🎯 Example Templates

### Basic Interface Configuration
```jinja2
{% defaults %}
hostname: core-router
interface: GigabitEthernet0/1
description: Uplink to Distribution
ip_address: 10.0.0.1
subnet_mask: 255.255.255.252
{% enddefaults %}

hostname {{hostname}}
!
interface {{interface}}
 description {{description}}
 ip address {{ip_address}} {{subnet_mask}}
 no shutdown
```

### VLAN Configuration with Loops
```jinja2
{% defaults %}
vlans: [10, 20, 30, 40]
vlan_names: ['Management', 'Voice', 'Data', 'Guest']
{% enddefaults %}

!
{% for vlan in vlans %}
vlan {{vlan}}
 name {{vlan_names[loop.index0]}}
!
{% endfor %}
```

## ⚙️ Technical Details

### Architecture
- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript (no frameworks)
- **Template Engine**: Custom-built Jinja2-like parser
- **Processing**: 100% client-side (no server required)
- **Storage**: Browser memory only (no data persistence)

### File Structure
```
├── index.html          # Main application interface
├── styles.css          # Responsive styling and UI components
├── template-parser.js  # Template parsing and rendering engine
├── app.js             # Application logic and user interface
├── sample-template.txt # Comprehensive example templates
└── README.md          # This documentation
```

### Browser Compatibility
- Chrome 60+
- Firefox 55+ 
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🔧 Advanced Features

### Default Value Validation
The application includes a safety feature that warns you if you're about to generate a configuration with unchanged default values. This prevents accidental use of inappropriate defaults in production environments.

### Syntax Highlighting
Generated configurations include color-coded highlighting for:
- Router commands (blue)
- Interface names (green)
- Comments (gray)

### Loop Management
Easily add or remove items from loops with intuitive controls. The form dynamically adjusts to handle multiple loop iterations.

## 🚦 Limitations

- **Nested Loops**: Basic support (complex nesting may have limited functionality)
- **Advanced Conditionals**: Simple evaluation (complex expressions may not work)
- **Template Validation**: Basic error checking
- **No Persistence**: Templates and data are not saved between sessions

## 🚀 Getting Started

1. Download or clone the project files
2. Open `index.html` in any modern web browser
3. Start typing your template or use the provided examples
4. No installation or build process required!

## 📝 Sample Templates

Check the `sample-template.txt` file for ready-to-use templates including:
- Basic interface configurations
- VLAN setups with loops
- OSPF routing configurations
- Access control lists (ACLs)
- Complex multi-device scenarios

## 🤝 Contributing

This is an open-source project. Feel free to:
- Report issues or bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Happy Network Configuring!** 🎯

*This tool is designed for network engineers, DevOps professionals, and anyone who needs to generate consistent network device configurations quickly and efficiently.*
