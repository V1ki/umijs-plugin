# umijs-plugin README

本插件是基于umijs的[plugin-model-vscode](https://github.com/umijs/plugin-model-vscode) 开发.

目前已经解决官方插件库model 无法正常跳转的问题. 同时加入了自己的部分特性!

- [x] `route` 中点击 `component` 跳转到对应文件.
- [x] 点击 `dva`中 `dispatch` 的 `type` 可以跳转到对应model的对应方法
- [x] 点击 `useModel` 中的 `namespace` 可以跳转到对应model .
- [x] `route` 中 `component` 增加代码补全.


接下来会增加的:
- [ ] 增加 `dva` 的 `namespace` 以及 `方法名`的代码补全
- [ ] 创建 `dva` 的model.
