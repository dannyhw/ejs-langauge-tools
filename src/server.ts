import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  CompletionItem,
  TextDocumentPositionParams,
  CompletionItemKind,
  Hover,
  MarkupKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
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
function getLanguageService(document: TextDocument): {
  service: ts.LanguageService;
  sourceFile: ts.SourceFile;
} {
  const text = document.getText();
  const sourceFile = ts.createSourceFile(
    "temp.tsx",
    text,
    ts.ScriptTarget.Latest,
    true
  );

  const compilerOptions: ts.CompilerOptions = {
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

  const serviceHost: ts.LanguageServiceHost = {
    getScriptFileNames: () => [sourceFile.fileName, "react.d.ts"],
    getScriptVersion: (fileName) =>
      fileName === sourceFile.fileName ? "0" : "1",
    getScriptSnapshot: (fileName) => {
      if (fileName === sourceFile.fileName) {
        return ts.ScriptSnapshot.fromString(text);
      }
      if (fileName.endsWith("react.d.ts")) {
        return ts.ScriptSnapshot.fromString(reactDts);
      }
      if (fs.existsSync(fileName)) {
        return ts.ScriptSnapshot.fromString(
          fs.readFileSync(fileName).toString()
        );
      }
      return undefined;
    },
    getCurrentDirectory: () => process.cwd(),
    getCompilationSettings: () => compilerOptions,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      fileName === sourceFile.fileName ||
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
let lastService: ts.LanguageService | undefined;
let lastSourceFile: ts.SourceFile | undefined;

connection.onCompletion(
  async (
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<CompletionItem[]> => {
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

    const completions = service.getCompletionsAtPosition(
      sourceFile.fileName,
      offset,
      undefined
    );

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
  }
);

connection.onHover(
  async (
    textDocumentPosition: TextDocumentPositionParams
  ): Promise<Hover | null> => {
    const document = documents.get(textDocumentPosition.textDocument.uri);

    if (!document) {
      return null;
    }

    const offset = document.offsetAt(textDocumentPosition.position);
    const { service, sourceFile } = getLanguageService(document);

    const quickInfo = service.getQuickInfoAtPosition(
      sourceFile.fileName,
      offset
    );

    if (!quickInfo) {
      return null;
    }

    const documentation = ts.displayPartsToString(quickInfo.documentation);
    const type = ts.displayPartsToString(quickInfo.displayParts);

    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: [
          "```typescript",
          type,
          "```",
          documentation ? "\n---\n" + documentation : "",
        ].join("\n"),
      },
    };
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  if (!lastService || !lastSourceFile || !item.data) {
    return item;
  }

  const details = lastService.getCompletionEntryDetails(
    lastSourceFile.fileName,
    item.data.offset,
    item.data.name,
    {},
    undefined,
    undefined,
    undefined
  );

  if (details) {
    item.detail = ts.displayPartsToString(details.displayParts);
    item.documentation = ts.displayPartsToString(details.documentation);
  }

  return item;
});

function getCompletionItemKind(kind: ts.ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case ts.ScriptElementKind.keyword:
      return CompletionItemKind.Keyword;
    case ts.ScriptElementKind.scriptElement:
      return CompletionItemKind.Text;
    case ts.ScriptElementKind.moduleElement:
      return CompletionItemKind.Module;
    case ts.ScriptElementKind.classElement:
      return CompletionItemKind.Class;
    case ts.ScriptElementKind.interfaceElement:
      return CompletionItemKind.Interface;
    case ts.ScriptElementKind.typeElement:
      return CompletionItemKind.Class;
    case ts.ScriptElementKind.enumElement:
      return CompletionItemKind.Enum;
    case ts.ScriptElementKind.variableElement:
      return CompletionItemKind.Variable;
    case ts.ScriptElementKind.localVariableElement:
      return CompletionItemKind.Variable;
    case ts.ScriptElementKind.functionElement:
      return CompletionItemKind.Function;
    case ts.ScriptElementKind.memberFunctionElement:
      return CompletionItemKind.Method;
    case ts.ScriptElementKind.memberVariableElement:
      return CompletionItemKind.Field;
    case ts.ScriptElementKind.constructorImplementationElement:
      return CompletionItemKind.Constructor;
    case ts.ScriptElementKind.callSignatureElement:
      return CompletionItemKind.Function;
    case ts.ScriptElementKind.indexSignatureElement:
      return CompletionItemKind.Field;
    case ts.ScriptElementKind.constructSignatureElement:
      return CompletionItemKind.Constructor;
    default:
      return CompletionItemKind.Text;
  }
}

documents.listen(connection);
connection.listen();
