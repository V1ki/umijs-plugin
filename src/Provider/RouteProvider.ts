import * as vscode from "vscode";
import { join } from "path";
import { TextDocumentUtils } from "../util/document";
import { QuoteType,QuoteCharMap } from "../util/types";
import { logger } from '../constant';
import { existsSync } from "fs";

export default class RouteProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      //Write to output.
      logger.info("Route Provider.");
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
      logger.info(`line:${line}`);
      if (!line.includes("component:")) {
        return;
      }
      let file = line.substr(
        line.indexOf(split) + 1,
        line.lastIndexOf(split) - line.indexOf(split) - 1
      );
      
      logger.info(`file:${file}`);
      const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
      logger.info(`cwd:${cwd}`);
  
      let definitionFile = join(`${cwd}/src/pages/`, file);
      if (file.match(/\/$/)) {
        if (existsSync(`${definitionFile}index.tsx`)) {
          definitionFile = `${definitionFile}index.tsx`;
        } else if (existsSync(`${definitionFile}index.jsx`)) {
          definitionFile = `${definitionFile}index.jsx`;
        }
      } else {
        if (existsSync(`${definitionFile}.tsx`)) {
          definitionFile = `${definitionFile}.tsx`;
        } else if (existsSync(`${definitionFile}.jsx`)) {
          definitionFile = `${definitionFile}.jsx`;
        } else if (existsSync(`${definitionFile}/index.tsx`)) {
          definitionFile = `${definitionFile}/index.tsx`;
        } else if (existsSync(`${definitionFile}/index.jsx`)) {
          definitionFile = `${definitionFile}/index.jsx`;
        }
      }
      logger.info(`definitionFile:${definitionFile}`);
  
      if (existsSync(definitionFile)) {
        return new vscode.Location(
          vscode.Uri.file(definitionFile),
          new vscode.Position(0, 0)
        );
      }
    }
  }
  
  