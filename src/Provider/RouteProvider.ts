import * as vscode from "vscode";
import { TextDocumentUtils } from "../util/document";
import { QuoteType,QuoteCharMap } from "../util/types";
import { output } from '../constant';
import { existsSync } from "fs";

export default class RouteProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      //Write to output.
      output.appendLine("Route Provider.");
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
      output.append("line:");
      output.appendLine(line);
      if (!line.includes("component:")) {
        return;
      }
      let file = line.substr(
        line.indexOf(split) + 1,
        line.lastIndexOf(split) - line.indexOf(split) - 1
      );
      
      output.append("file:");
      output.appendLine(file);
      const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
      output.append("cwd:");
      output.appendLine(cwd);
  
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
      output.append("definitionFile:");
      output.appendLine(definitionFile);
  
      if (existsSync(definitionFile)) {
        return new vscode.Location(
          vscode.Uri.file(definitionFile),
          new vscode.Position(0, 0)
        );
      }
    }
  }
  
  