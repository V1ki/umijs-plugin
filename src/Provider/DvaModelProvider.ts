import * as vscode from "vscode";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { TextDocumentUtils } from "../util/document";
import { QuoteType, QuoteCharMap } from "../util/types";
import { sync } from "glob";
import { output } from "../constant";

export default class DvaModelProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
    output.appendLine("Dva Model Provider");
    const documentUtil = new TextDocumentUtils(document);
    let range = documentUtil.getQuoteRange(position, QuoteType.single);
    let split = QuoteCharMap[QuoteType.single];
    if (!range) {
      range = documentUtil.getQuoteRange(position, QuoteType.double);
      split =   QuoteCharMap[QuoteType.double];
      if (!range) {
        range = documentUtil.getQuoteRange(position, QuoteType.backtick);
        split = QuoteCharMap[QuoteType.backtick];
      }
      if (!range) {
        return;
      }
    }

    const line = document.lineAt(range.start.line).text;
    if (!line.includes("type:")) {
      return;
    }

    // get type .
    let type = line.substr(
      line.indexOf(split) + 1,
      line.lastIndexOf(split) - line.indexOf(split) - 1
    );

    if (!type || type.indexOf("/") === -1) {
      return;
    }
    // get namespace
    let [namespace, method] = type.split("/");
    if (!namespace) {
      return;
    }

    const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;

    let umiDvaPath: string = "";
    try {
      umiDvaPath = sync(`!(node_modules)/**/.umi/plugin-dva/dva.ts`, {
        cwd,
      })[0];
    } catch (e) {
      umiDvaPath = "";
    }
    if (!umiDvaPath) {
      return;
    }
    // get absolute path;
    umiDvaPath = join(cwd, umiDvaPath);

    const umiDvaFile = readFileSync(umiDvaPath).toString();

    const namespaceStart = umiDvaFile.indexOf(`namespace: '${namespace}'`);
    const namespaceEnd = umiDvaFile.indexOf("}", namespaceStart);

    const appModelStr = umiDvaFile.slice(namespaceStart, namespaceEnd);
    const [_, importName] = appModelStr.split("...");
    if (!importName) {
      return;
    }

    const keyStr = `import ${importName.trim()} from`;
    const importPathStart = umiDvaFile.indexOf(keyStr) + keyStr.length;
    const importPathEnd = umiDvaFile.indexOf(`import`, importPathStart);
    const uriRaw = umiDvaFile.slice(importPathStart, importPathEnd + 1).trim();
    const end =
      uriRaw.lastIndexOf('"') === -1
        ? uriRaw.lastIndexOf("'")
        : uriRaw.lastIndexOf('"');
    const uri = uriRaw.slice(1, end);

    let definitionFile = "";
    if (existsSync(`${uri}`)) {
      definitionFile = `${uri}`;
    } else if (existsSync(`${uri}.ts`)) {
      definitionFile = `${uri}.ts`;
    } else if (existsSync(`${uri}.tsx`)) {
      definitionFile = `${uri}.tsx`;
    } else if (existsSync(`${uri}.js`)) {
      definitionFile = `${uri}.js`;
    } else if (existsSync(`${uri}.jsx`)) {
      definitionFile = `${uri}.jsx`;
    }

    // already find file .
    // start find method

    const dvaModelFile = readFileSync(definitionFile).toString();
    const lines = dvaModelFile.split("\n");
    const methodKeyStr = `*${method}(`;
    let lineIndex = 0;
    lines.forEach((lineStr, idx) => {
      if (lineStr.indexOf(methodKeyStr) !== -1) {
        lineIndex = idx;
        return;
      }
    });
    const methodStart = dvaModelFile.indexOf(methodKeyStr);

    if (existsSync(definitionFile)) {
      return new vscode.Location(
        vscode.Uri.file(definitionFile),
        new vscode.Position(lineIndex, 0)
      );
    }
  }
}
