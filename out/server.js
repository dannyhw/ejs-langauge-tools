"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const ts = __importStar(require("typescript"));
const fs = __importStar(require("fs"));
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
connection.onInitialize((params) => {
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: ["."],
            },
            hoverProvider: true,
        },
    };
    return result;
});
// Helper function to create/get language service
function getLanguageService(document) {
    const text = document.getText();
    const sourceFile = ts.createSourceFile("temp.tsx", text, ts.ScriptTarget.Latest, true);
    const compilerOptions = {
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        jsxFactory: "React.createElement",
        jsxFragmentFactory: "React.Fragment",
        allowJs: true,
        checkJs: true,
        noEmit: true,
        lib: ["dom", "dom.iterable", "esnext"],
        types: ["react", "react-dom"],
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
    };
    // Create virtual react.d.ts file for JSX support
    const reactDts = `
    declare module "react" {
      namespace JSX {
        interface Element {}
        interface IntrinsicElements {
          [elemName: string]: any;
        }
        interface ElementChildrenAttribute {
          children: {};
        }
      }
      export = React;
      export as namespace React;
      
      interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
        type: T;
        props: P;
        key: Key | null;
      }
      
      type JSXElementConstructor<P> = ((props: P) => ReactElement | null);
      type Key = string | number;
      
      declare namespace React {
        function createElement(type: any, props?: any, ...children: any[]): ReactElement;
        function Fragment(props: { children?: any }): ReactElement;
      }
    }
  `;
    const serviceHost = {
        getScriptFileNames: () => [sourceFile.fileName, "react.d.ts"],
        getScriptVersion: (fileName) => fileName === sourceFile.fileName ? "0" : "1",
        getScriptSnapshot: (fileName) => {
            if (fileName === sourceFile.fileName) {
                return ts.ScriptSnapshot.fromString(text);
            }
            if (fileName.endsWith("react.d.ts")) {
                return ts.ScriptSnapshot.fromString(reactDts);
            }
            if (fs.existsSync(fileName)) {
                return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
            }
            return undefined;
        },
        getCurrentDirectory: () => process.cwd(),
        getCompilationSettings: () => compilerOptions,
        getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
        fileExists: (fileName) => fileName === sourceFile.fileName ||
            fileName.endsWith("react.d.ts") ||
            fs.existsSync(fileName),
        readFile: (fileName) => {
            if (fileName === sourceFile.fileName) {
                return text;
            }
            if (fileName.endsWith("react.d.ts")) {
                return reactDts;
            }
            if (fs.existsSync(fileName)) {
                return fs.readFileSync(fileName).toString();
            }
            return undefined;
        },
        readDirectory: ts.sys.readDirectory,
        directoryExists: ts.sys.directoryExists,
        getDirectories: ts.sys.getDirectories,
        // Add support for resolving modules
        resolveModuleNames: (moduleNames, containingFile) => {
            return moduleNames.map((moduleName) => {
                if (moduleName === "react") {
                    return {
                        resolvedFileName: "react.d.ts",
                        extension: ".d.ts",
                        isExternalLibraryImport: true,
                        packageId: {
                            name: "react",
                            subModuleName: "",
                            version: "latest",
                        },
                    };
                }
                return undefined;
            });
        },
    };
    return {
        service: ts.createLanguageService(serviceHost, ts.createDocumentRegistry()),
        sourceFile,
    };
}
// Store the language service and source file for reuse
let lastService;
let lastSourceFile;
connection.onCompletion(async (textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return [];
    }
    const position = textDocumentPosition.position;
    const offset = document.offsetAt(position);
    const { service, sourceFile } = getLanguageService(document);
    // Store for completion resolve
    lastService = service;
    lastSourceFile = sourceFile;
    const completions = service.getCompletionsAtPosition(sourceFile.fileName, offset, undefined);
    if (!completions) {
        return [];
    }
    return completions.entries.map((entry) => ({
        label: entry.name,
        kind: getCompletionItemKind(entry.kind),
        data: {
            name: entry.name,
            source: entry.source,
            sortText: entry.sortText,
            offset: offset,
        },
    }));
});
connection.onHover(async (textDocumentPosition) => {
    const document = documents.get(textDocumentPosition.textDocument.uri);
    if (!document) {
        return null;
    }
    const offset = document.offsetAt(textDocumentPosition.position);
    const { service, sourceFile } = getLanguageService(document);
    const quickInfo = service.getQuickInfoAtPosition(sourceFile.fileName, offset);
    if (!quickInfo) {
        return null;
    }
    const documentation = ts.displayPartsToString(quickInfo.documentation);
    const type = ts.displayPartsToString(quickInfo.displayParts);
    return {
        contents: {
            kind: node_1.MarkupKind.Markdown,
            value: [
                "```typescript",
                type,
                "```",
                documentation ? "\n---\n" + documentation : "",
            ].join("\n"),
        },
    };
});
connection.onCompletionResolve((item) => {
    if (!lastService || !lastSourceFile || !item.data) {
        return item;
    }
    const details = lastService.getCompletionEntryDetails(lastSourceFile.fileName, item.data.offset, item.data.name, {}, undefined, undefined, undefined);
    if (details) {
        item.detail = ts.displayPartsToString(details.displayParts);
        item.documentation = ts.displayPartsToString(details.documentation);
    }
    return item;
});
function getCompletionItemKind(kind) {
    switch (kind) {
        case ts.ScriptElementKind.keyword:
            return node_1.CompletionItemKind.Keyword;
        case ts.ScriptElementKind.scriptElement:
            return node_1.CompletionItemKind.Text;
        case ts.ScriptElementKind.moduleElement:
            return node_1.CompletionItemKind.Module;
        case ts.ScriptElementKind.classElement:
            return node_1.CompletionItemKind.Class;
        case ts.ScriptElementKind.interfaceElement:
            return node_1.CompletionItemKind.Interface;
        case ts.ScriptElementKind.typeElement:
            return node_1.CompletionItemKind.Class;
        case ts.ScriptElementKind.enumElement:
            return node_1.CompletionItemKind.Enum;
        case ts.ScriptElementKind.variableElement:
            return node_1.CompletionItemKind.Variable;
        case ts.ScriptElementKind.localVariableElement:
            return node_1.CompletionItemKind.Variable;
        case ts.ScriptElementKind.functionElement:
            return node_1.CompletionItemKind.Function;
        case ts.ScriptElementKind.memberFunctionElement:
            return node_1.CompletionItemKind.Method;
        case ts.ScriptElementKind.memberVariableElement:
            return node_1.CompletionItemKind.Field;
        case ts.ScriptElementKind.constructorImplementationElement:
            return node_1.CompletionItemKind.Constructor;
        case ts.ScriptElementKind.callSignatureElement:
            return node_1.CompletionItemKind.Function;
        case ts.ScriptElementKind.indexSignatureElement:
            return node_1.CompletionItemKind.Field;
        case ts.ScriptElementKind.constructSignatureElement:
            return node_1.CompletionItemKind.Constructor;
        default:
            return node_1.CompletionItemKind.Text;
    }
}
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map