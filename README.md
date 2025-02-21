# EJS Extended Language Support

Language support for EJS (Embedded JavaScript) templates in TypeScript, TSX, JavaScript, JSON, and CSS files.

## Features

- Syntax highlighting for EJS tags in:
  - TypeScript (`.ts.ejs`)
  - TSX (`.tsx.ejs`)
  - JavaScript (`.js.ejs`)
  - JSON (`.json.ejs`)
  - CSS (`.css.ejs`)
- Support for all EJS syntax:
  - Output tags (`<%=` and `<%-`)
  - Control flow tags (`<%`)
  - Comments (`<%#`)
- Proper language support within EJS tags:
  - JavaScript expressions
  - TypeScript types and syntax
  - JSX/TSX elements
  - JSON structure and validation
  - CSS properties and values
- Nested EJS tag support (EJS within strings, objects, etc.)

## Installation

To install build locally and install it in Cursor or VS Code, run:

```bash
bun run build
cursor --install-extension dannyhw.ejs-extended-language-support
```

## Usage

Files will be automatically recognized by their extensions:

- `.tsx.ejs` - TSX files with EJS
- `.ts.ejs` - TypeScript files with EJS
- `.js.ejs` - JavaScript files with EJS
- `.json.ejs` - JSON files with EJS
- `.css.ejs` - CSS files with EJS

The syntax highlighting will automatically work for these file types.

### File Associations

The extension automatically configures file associations for all supported file types. You don't need to manually set these up.

If for some reason the automatic configuration doesn't work, you can manually add the following to your VS Code settings.json:

```json
"files.associations": {
    "*.tsx.ejs": "tsx-ejs",
    "*.ts.ejs": "ts-ejs",
    "*.js.ejs": "js-ejs",
    "*.json.ejs": "json-ejs",
    "*.css.ejs": "css-ejs"
}
```

## Examples

### JavaScript

```javascript
<%# This is a comment %>
const config = {
  <% if (isDevelopment) { %>
    apiUrl: 'http://localhost:3000',
    debug: true
  <% } else { %>
    apiUrl: '<%= process.env.API_URL %>',
    debug: false
  <% } %>
};

module.exports = config;
```

### TSX/TypeScript

```tsx
<%# This is a comment %>
<% if (condition) { %>
  <div className="<%= className %>">
    <%= content %>
  </div>
<% } %>
```

### JSON

```json
{
  "name": "<%= props.projectName %>",
  <% if (props.type === "library") { %>
    "private": false,
    "publishConfig": {
      "access": "public"
    },
  <% } %>
  "version": "1.0.0"
}
```

### CSS

```css
.container {
  <% if (props.isDarkMode) { %>
    background-color: #1a1a1a;
    color: #ffffff;
  <% } else { %>
    background-color: #ffffff;
    color: #1a1a1a;
  <% } %>
  padding: <%= props.spacing %>px;
}
```

## Development

### Local Testing

For quick development and testing, use the `dev` command which will:

1. Remove any existing .vsix files
2. Build a new extension package
3. Uninstall the current version from Cursor
4. Install the new version

```bash
bun run dev
```

### Making Changes

1. Clone the repository
2. Make your changes to the grammar files in the `syntaxes` directory
3. Test your changes using `bun run dev`
4. Verify syntax highlighting works as expected
5. Submit a pull request

The main files you might want to modify are:

- `syntaxes/tsx-ejs-injection.tmLanguage.json` - TSX grammar
- `syntaxes/ts-ejs-injection.tmLanguage.json` - TypeScript grammar
- `syntaxes/js-ejs-injection.tmLanguage.json` - JavaScript grammar
- `syntaxes/json-ejs-injection.tmLanguage.json` - JSON grammar
- `syntaxes/css-ejs-injection.tmLanguage.json` - CSS grammar

## Contributing

Found a bug? Please open an issue on [GitHub](https://github.com/dannyhw/ejs-langauge-tools).

Want to contribute? Great! Here's how:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Test thoroughly using the development instructions above
5. Submit a pull request

## License

MIT
