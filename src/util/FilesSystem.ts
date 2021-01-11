import { readdirSync ,Dirent } from "fs";
import { join } from "path";
import { config } from "process";
import * as vscode from "vscode";
import { logger } from "../constant";

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

    return components ;


  }

  readDir(
    path: string,
    map: (path: string, filename: string, fileType: vscode.FileType) => void
  ) {
    const files : Dirent[] = readdirSync(path,{withFileTypes: true});
    files.forEach((dir) => {
      map(path , dir.name,  dir.isDirectory() ? vscode.FileType.Directory : vscode.FileType.File )
    } )
  }
}
