To setup the extension, run the following commands:

```
bun run build
cursor --install-extension tsx-ejs-language-1.0.0.vsix
```

Then, add the following to your `settings.json`:

```
"files.associations": {
  "*.tsx.ejs": "tsx-ejs",
}
```
