import { readdirSync, Dirent, readFileSync } from "fs";
import { join } from "path";
import { config } from "process";
import * as vscode from "vscode";
import { logger } from "../constant";
import * as babelParser from "@babel/parser";
import { isEqual } from "lodash";

import {
  isExportDefaultDeclaration,
  isObjectExpression,
  ObjectExpression,
  Node,
  isObjectProperty,
  isStringLiteral,
  isObjectMethod,
  isCallExpression,
  isVariableDeclaration,
  isIdentifier,
  is,
} from "@babel/types";

export enum QuoteType {
  double = "double",
  single = "single",
  backtick = "backtick",
}

export interface IUmiProConfig {
  quotes: QuoteType;
  routerConfigPath?: string;
  parserOptions: babelParser.ParserOptions;
  routerExcludePath: string[];
  saveOnGenerateEffectsCommandTimeout: number;
  autoGenerateSagaEffectsCommands: boolean;
  locale: string;
}

export default class FileSystem {
  constructor() {}

  loadPages(): string[] {
    // list pages
    const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    let components: string[] = [];
    const rootPage = join(cwd, "src", "pages");

    const readerMapper: (
      path: string,
      filename: string,
      fileType: vscode.FileType
    ) => void = async (path, name, type) => {
      if (type === vscode.FileType.Directory) {
        // components 文件夹默认忽略
        if (["components"].indexOf(name) !== -1) {
          return;
        }
        this.readDir(join(path, name), readerMapper);
      } else if (type === vscode.FileType.File && name.match(/.(j|t)sx$/)) {
        const filename = join(path, name);
        const component = filename
          .replace(rootPage, ".")
          .replace(/(index)?.(j|t)sx$/, "");
        // logger.info(`filename:${filename} -- ${component}`);
        components.push(component);
      }
    };
    this.readDir(rootPage, readerMapper);

    logger.info(`components:${components} `);

    return components;
  }

  loadModels() {
    // load global
    // find src models

    const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const rootPage = join(cwd, "src", "models");

    const readerMapper: (
      path: string,
      filename: string,
      fileType: vscode.FileType
    ) => void = async (path, name, type) => {
      if (type === vscode.FileType.Directory) {
        // components 文件夹默认忽略
        if (["components"].indexOf(name) !== -1) {
          return;
        }
        this.readDir(join(path, name), readerMapper);
      } else if (type === vscode.FileType.File && name.match(/.(j|t)s$/)) {
        const filename = join(path, name);

        const code = readFileSync(filename).toString();
        if (code.indexOf("namespace") === -1) {
          return;
        }
        logger.log(` -- filename: ${filename}`);

        if (vscode.workspace.workspaceFolders) {
          const folders = Array.from(vscode.workspace.workspaceFolders);

          const workspaceConfigurations = folders.map((f) =>
            vscode.workspace.getConfiguration("umi_pro", f.uri)
          );
          const index = folders.findIndex((o) =>
            filename.startsWith(o.uri.fsPath)
          );

          const userConfig = workspaceConfigurations[index];

          const config: IUmiProConfig = {
            quotes: QuoteType.single,
            routerConfigPath: userConfig.get<string>("router_config_path"),
            routerExcludePath:
              userConfig.get<string[]>("router_exclude_path") || [],
            saveOnGenerateEffectsCommandTimeout:
              userConfig.get<number>("saveOnGenerateEffectsCommandTimeout") ||
              500,
            autoGenerateSagaEffectsCommands:
              userConfig.get<boolean>("autoGenerateSagaEffectsCommands") ||
              false,
            parserOptions: {
              sourceType: "module",
              plugins: [
                "typescript",
                "classProperties",
                "dynamicImport",
                "jsx",
                [
                  "decorators",
                  {
                    decoratorsBeforeExport: true,
                  },
                ],
              ],
            },
            locale: userConfig.get<string>("locale") || "zh-CN",
          };
          const userQuotesConfig = userConfig.get<QuoteType>("quotes");
          if (
            userQuotesConfig &&
            Object.values(QuoteType).includes(userQuotesConfig)
          ) {
            config.quotes = userQuotesConfig;
          }
          const parserOptions = userConfig.get<IUmiProConfig["parserOptions"]>(
            "parser_options"
          );
          if (parserOptions && !isEqual(parserOptions, {})) {
            config.parserOptions = parserOptions;
          }

          const ast = babelParser.parse(code, config.parserOptions);
          let modelObjects: ObjectExpression[] = [];
          for (const node of ast.program.body) {
            let model: Node = node;
            if (isExportDefaultDeclaration(model)) {
              model = model.declaration;
              console.log(model);
            }
            if (isVariableDeclaration(model)) {
              console.log("model.declarations", model.declarations);
              model.declarations.forEach((m) => {
                if (isObjectExpression(m.init)) {
                  const objMapper: (key: string, value: Node) => void = (
                    key,
                    val
                  ) => {
                    console.log(`key:${key} -- value:${val.type}`);
                    if (isObjectExpression(val)) {
                      this.readObjectExpress(val, objMapper);
                    } else if (isStringLiteral(val)) {
                      console.log(`key:${key} -- value:${val.value}`);
                    }
                  };
                  this.readObjectExpress(m.init, objMapper);
                }
              });
            }
            if (isObjectExpression(model)) {
              modelObjects.push(model);
            }
            if (isCallExpression(model)) {
              const args = model.arguments.filter((o): o is ObjectExpression =>
                isObjectExpression(o)
              );
              modelObjects.push(...args);
            }
          }
        }
      }
    };
    this.readDir(rootPage, readerMapper);
  }

  readObjectExpress(
    obj: ObjectExpression,
    map: (key: string, value: Node) => void
  ) {
    obj.properties.forEach((p) => {

      if (isObjectMethod(p)) {
        // object 方法
        if (!isIdentifier(p.key)) {
          return;
        }
        map(p.key.name, p.body);
        return;
      }

      if (!isObjectProperty(p)) {
        return;
      }
      if (!isIdentifier(p.key)) {
        return;
      }
      map(p.key.name, p.value);
    });
  }

  readDir(
    path: string,
    map: (path: string, filename: string, fileType: vscode.FileType) => void
  ) {
    const files: Dirent[] = readdirSync(path, { withFileTypes: true });
    files.forEach((dir) => {
      map(
        path,
        dir.name,
        dir.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File
      );
    });
  }
}
