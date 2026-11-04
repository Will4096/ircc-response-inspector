# IRCC Response Inspector

> 4.2.0：统一侧边栏工作区、可选 Gmail / Windows 163 邮箱辅助、可取消的验证码倒计时，以及分申请人的 History 更新时间。参见[安装与授权说明](MAIL-SETUP.md)。

[简体中文](README.md) · [English](README.en.md)

![扩展图标](icons/icon-128.png)

**非官方 Chrome 扩展 · 本机处理 · MIT 开源**

将 IRCC Tracker 的申请进度、分申请人 History、Security 原始状态和上次查询对比整理到一个界面。无需自己打开开发者工具抓包或翻找 JSON；用户自行登录；手动输入验证码始终可用，也可按需开启邮箱辅助及独立的自动验证。

本工具与 IRCC、加拿大政府无隶属关系，不预测审批结果，也不猜译未公开状态代码。

## 主要功能

- 多份申请资料分别保存，选择 profile 后辅助填写官方表单。
- 分申请人查看生物识别、体检、资格审核、背景调查、待办与完整 History。
- 原样展示 Security 状态代码，保留历史条目。
- 与同一 profile 上次完整成功查询对比，标记变化和新增 History；失败查询不会覆盖基准。
- 默认中文，可切换英文；中文保留 Surname / Last name、Given name 等原网站字段名。
- 支持密码加密备份与导入；不包含邮箱凭据和验证码。可删除单份资料或清除本地数据。

## 安装

1. 前往 [Releases](https://github.com/Will4096/ircc-response-inspector/releases)，下载带版本号的安装 ZIP；不要选自动生成的 Source code 压缩包。
2. 解压安装包，打开 Chrome 的 **chrome://extensions** 页面。
3. 开启“开发者模式”，点击“加载已解压的扩展程序”。
4. 选择包含 **manifest.json** 的解压目录，可将扩展固定到工具栏。

这是 GitHub 分发的解压安装版，不代表已通过 Chrome 应用商店审核。已有安装更新文件后需重新加载扩展，并刷新 Tracker。[downloads](downloads) 目录保留安装包镜像。

## 使用

1. 打开 Tracker，自行完成登录。
2. 通过“管理申请”保存资料，确认当前申请，再辅助填写。
3. 核对已填写的资料；5 秒倒计时可立即提交或取消。手动输入验证码，或在设置中连接邮箱后使用辅助取码；自动验证需单独开启。
4. 查看进度，展开各申请人的 History，需要时创建加密备份。

语言可在主面板顶部或扩展选项的“设置”中切换。偏好保存在本机，已打开的扩展页面会同步更新。

## 隐私与权限

没有开发者服务器、广告、遥测或外部 AI。申请资料、偏好和比较基准保存在本机 Chrome 存储，查询缓存使用会话存储，不使用 Chrome Sync。查询所需信息仍通过 IRCC 官方页面提交。

调试权限用于可靠填写表单及读取所选 Tracker 标签页的响应。Chrome 可能显示调试提示；查询结束、失败、超时或离开 Tracker 后断开。查询时请勿同时打开该标签页的 DevTools。

资料、History 和导出仍可能包含个人敏感信息，本地保存不等于加密。删除申请可清理其缓存及基准；“清除本地数据”可清除全部扩展数据。已下载的导出文件需单独删除。

[隐私政策](PRIVACY.md) · [安全说明](SECURITY.md) · [发布说明](PUBLISHING.md)

## 开发与验证

当前版本：4.2.0。无第三方运行时依赖。使用 Node.js 22 或更高版本：

~~~sh
node tests.mjs
node comparison-tests.mjs
node i18n-tests.mjs
node privacy-tests.mjs
node scripts/build-release.mjs
~~~

构建使用运行文件白名单，生成安装 ZIP 及 SHA-256 校验文件。自动测试使用合成数据，不包含真实账号或验证码。官方页面可能变化，真实登录流程仍需用户实测。

## 问题反馈

请在 [Issues](https://github.com/Will4096/ircc-response-inspector/issues) 中提供扩展版本、浏览器版本及复现步骤。不要公开姓名、UCI、申请编号、出生日期、验证码、cookie、token、真实截图或未脱敏的导出。

## 许可证

采用 [MIT 许可证](LICENSE)，版权所有者为 Will4096。可按许可条款使用、修改和分发，须保留版权和许可声明。
