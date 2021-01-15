import * as vscode from "vscode";
import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { TextDocumentUtils } from "../util/document";
import { QuoteType, QuoteCharMap } from "../util/types";
import { sync } from "glob";
import { logger } from "../constant";
import Container from "typedi";
import FileSystem from "../util/FilesSystem";

export default class DvaModelProvider implements vscode.DefinitionProvider {
  provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
    logger.info("Dva Model Provider ");
    console.log(document,position);
    //怎么获取当前调用的是哪个方法
    
    vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',document.uri).then((result) => {

      if(Array.isArray(result)){
        result.forEach(r => {
          const range = r.location.range ;
            console.log(`${r.name} -- (${range.start.line},${range.start.character})  ---(${range.end.line},${range.end.character})` );
        })
      }
    });

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
    // 直接从 之前读取到model 里取.
    let fileSystem = Container.get(FileSystem);
    let filterModels = fileSystem.models.filter( m => m.namespace === namespace);

    if(filterModels.length === 0) {
      return ;
    }
    let fsPath = filterModels[0].fsPath ; 
    // already find file .
    // start find method

    const dvaModelFile = readFileSync(fsPath).toString();
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

    if (existsSync(fsPath)) {
      return new vscode.Location(
        vscode.Uri.file(fsPath),
        new vscode.Position(lineIndex, 0)
      );
    }
  }
}
