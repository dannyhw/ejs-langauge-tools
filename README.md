# EJS Language Support

Provides language support for EJS templates with TypeScript, TSX, and JSON files.

## Setup

To setup the extension, run the following commands:

```bun run build
cursor --install-extension ejs-language-support-1.0.0.vsix
```

Then, add the following to your `settings.json`:

```json
"files.associations": {
  "*.tsx.ejs": "tsx-ejs",
  "*.ts.ejs": "ts-ejs",
  "*.json.ejs": "json-ejs"
}
```

## Supported File Extensions

- `.tsx.ejs` - For React TypeScript files with EJS templates
- `.ts.ejs` - For TypeScript files with EJS templates
- `.json.ejs` - For JSON files with EJS templates

## Development

To rebuild and reinstall the extension during development:

```bash
bun run dev
```

This will remove the old .vsix file, build a new one, uninstall the current version from Cursor, and install the new version.
