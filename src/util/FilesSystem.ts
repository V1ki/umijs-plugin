import { readdirSync, Dirent, readFileSync } from "fs";
import { join } from "path";
import * as vscode from "vscode";
import { logger } from "../constant";
import * as babelParser from "@babel/parser";
import { Container, Service } from "typedi";

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
  isBlockStatement,
} from "@babel/types";

declare type DvaModel = {
  namespace: string;
  effects: string[];
  states: string[];
  fsPath: string;
};

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

@Service()
export default class FileSystem {
  pages: any[] = [];
  models: DvaModel[] = [];

  constructor() {}

  // 读取 src/pages 里中的内容,默认忽略 components 文件夹
  loadPages() {
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

    this.pages = components;
  }

  //   获取整体配置
  getConfig(filename: string) {
    // if (vscode.workspace.workspaceFolders) {
    // const folders = Array.from(vscode.workspace.workspaceFolders);

    // const workspaceConfigurations = folders.map((f) =>
    //   vscode.workspace.getConfiguration("umi_pro", f.uri)
    // );
    // const index = folders.findIndex((o) =>
    //   filename.startsWith(o.uri.fsPath)
    // );

    // const userConfig = workspaceConfigurations[index];

    const config: IUmiProConfig = {
      quotes: QuoteType.single,
      // routerConfigPath: userConfig.get<string>("router_config_path"),
      routerExcludePath:
        // userConfig.get<string[]>("router_exclude_path") ||
        [],
      saveOnGenerateEffectsCommandTimeout:
        // userConfig.get<number>("saveOnGenerateEffectsCommandTimeout") ||
        500,
      autoGenerateSagaEffectsCommands:
        // userConfig.get<boolean>("autoGenerateSagaEffectsCommands") ||
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
      locale:
        // userConfig.get<string>("locale") ||
        "zh-CN",
    };
    // const userQuotesConfig = userConfig.get<QuoteType>("quotes");
    // if (
    //   userQuotesConfig &&
    //   Object.values(QuoteType).includes(userQuotesConfig)
    // ) {
    //   config.quotes = userQuotesConfig;
    // }
    // const parserOptions = userConfig.get<IUmiProConfig["parserOptions"]>(
    //   "parser_options"
    // );
    // if (parserOptions && !isEqual(parserOptions, {})) {
    //   config.parserOptions = parserOptions;
    // }
    return config;
    // }
    // return null ;
  }

  loadModels() {
    // load global
    // find src models

    const cwd = vscode.workspace.workspaceFolders![0].uri.fsPath;
    const modelRoot = join(cwd, "src", "models");
    const models: DvaModel[] = [];

    const globalMapper: (
      path: string,
      filename: string,
      fileType: vscode.FileType
    ) => void = async (path, name, type) => {
      if (type === vscode.FileType.Directory) {
        // components 文件夹默认忽略
        this.readDir(join(path, name), globalMapper);
      } else if (type === vscode.FileType.File) {
        if (name.match(/.(j|t)s$/)) {
          const fsPath = join(path, name);

          const code = readFileSync(fsPath).toString();
          // if (code.indexOf("namespace") === -1) {
          //   return;
          // }
          logger.log(` -- filename: ${fsPath}`);

          const config = this.getConfig(fsPath);
          if (!config) {
            return;
          }
          const parserOptions = config.parserOptions;
          const dvaModel = this.compile(fsPath, code, parserOptions);
          if (dvaModel) {
            models.push(dvaModel);
          }
        }
      }
    };
    this.readDir(modelRoot, globalMapper);

    const pagesRoot = join(cwd, "src", "pages");
    const localMapper: (
      path: string,
      filename: string,
      fileType: vscode.FileType
    ) => void = async (path, name, type) => {
      if (type === vscode.FileType.Directory) {
        // components 文件夹默认忽略
        this.readDir(join(path, name), localMapper);
      } else if (type === vscode.FileType.File) {
        if (name.match(/^model.(j|t)s$/)) {
          const fsPath = join(path, name);

          const code = readFileSync(fsPath).toString();
          // if (code.indexOf("namespace") === -1) {
          //   return;
          // }
          logger.log(` -- fsPath: ${fsPath}`);

          const config = this.getConfig(fsPath);
          if (!config) {
            return;
          }
          const parserOptions = config.parserOptions;
          const dvaModel = this.compile(fsPath, code, parserOptions);
          if (dvaModel) {
            models.push(dvaModel);
          }
        }
      }
    };

    this.readDir(pagesRoot, localMapper);
    console.log(models);
    this.models = models;
  }

  /**
   * 编译指定的code ,然后 生成对应的dvamodel 数据
   * @param fsPath model 对应的文件路径
   * @param code model 的文件内容
   * @param parserOptions 编译选项
   */
  compile(
    fsPath: string,
    code: string,
    parserOptions: babelParser.ParserOptions
  ) {
    const ast = babelParser.parse(code, parserOptions);
    let dvaModel: DvaModel | null = null;
    let modelObjects: ObjectExpression[] = [];
    for (const node of ast.program.body) {
      let model: Node = node;
      if (isExportDefaultDeclaration(model)) {
        model = model.declaration;
        console.log(model);
      }
      // 变量定义
      if (isVariableDeclaration(model)) {
        console.log("model.declarations", model.declarations);
        let namespace: string | null = null;
        let methods: string[] = [];
        let states: string[] = [];
        model.declarations.forEach((m) => {
          if (isObjectExpression(m.init)) {
            /**
             * effects相关的mapper
             * @param key 一般为方法名称.
             * @param val 
             */
            const effectsMapper: (key: string, value: Node) => void = (
              key,
              val
            ) => {
              if (isBlockStatement(val)) {
                methods.push(key);
              }
            };
            const statesMapper: (key: string, value: Node) => void = (
              key,
              val
            ) => {
              console.log(`key:${key} -- value type:${val.type}`);

              states.push(key);
            };

            const modelMapper: (key: string, value: Node) => void = (
              key,
              val
            ) => {
              console.log(`key:${key} -- value type:${val.type}`);
              if (isObjectExpression(val)) {
                if (key === "effects") {
                  this.readObjectExpress(val, effectsMapper);
                } else if (key === "state") {
                  this.readObjectExpress(val, statesMapper);
                }
              } else if (isStringLiteral(val)) {
                console.log(`key:${key} -- value:${val.value}`);
                if (key === "namespace") {
                  namespace = val.value;
                }
              }
            };
            this.readObjectExpress(m.init, modelMapper);
          }
        });
        if (namespace) {
          dvaModel = {
            namespace: namespace,
            states: states,
            effects: methods,
            fsPath: fsPath,
          };
        }
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

    console.log(" dvaModel : ", dvaModel);
    return dvaModel;
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
