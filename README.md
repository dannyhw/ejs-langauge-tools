# EJS Language Support

Language support for EJS (Embedded JavaScript) templates in TypeScript, TSX, JSON, and CSS files.

## Features

- Syntax highlighting for EJS tags in:
  - TypeScript (`.ts.ejs`)
  - TSX (`.tsx.ejs`)
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

Install through VS Code extensions. Search for `EJS Language Support`

```
ext install dannyhw.ejs-language-support
```

## Usage

Files will be automatically recognized by their extensions:

- `.tsx.ejs` - TSX files with EJS
- `.ts.ejs` - TypeScript files with EJS
- `.json.ejs` - JSON files with EJS
- `.css.ejs` - CSS files with EJS

The syntax highlighting will automatically work for these file types.

## Examples

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

## Contributing

Found a bug? Please open an issue on [GitHub](https://github.com/dannyhw/ejs-langauge-tools).

## License

MIT
