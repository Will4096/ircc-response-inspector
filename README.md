# IRCC Response Inspector

![Icon](icons/icon-128.png)

**Unofficial Chrome extension · 本机处理 · Chinese / English**

An independent tool for viewing your own IRCC Tracker progress, per-applicant History, raw Security status codes and changes since your previous successful check. Not affiliated with IRCC or the Government of Canada. It does not predict decisions or interpret undocumented status codes.

独立开发的 IRCC Tracker 查询辅助扩展，可查看分申请人进度、History、Security 原始状态及较上次成功查询的变化。与 IRCC、加拿大政府无隶属关系，不预测审批结果，不猜译未公开状态代码。

## Install / 安装

1. Download the runtime ZIP from this repository's downloads folder and extract it. / 从 downloads 目录下载运行 ZIP 并解压。
2. Open chrome://extensions and enable Developer mode. / 打开 chrome://extensions，开启开发者模式。
3. Choose Load unpacked and select the extracted folder containing manifest.json. / 点击“加载已解压的扩展程序”，选择包含 manifest.json 的解压目录。
4. Pin the extension if desired. / 可将扩展固定到工具栏。

This is a GitHub-distributed unpacked extension, not a Chrome Web Store approval. / 此处提供 GitHub 分发的解压安装版，不代表已经通过 Chrome 应用商店审核。

## Use / 使用

- Open Tracker and sign in yourself. / 自行打开 Tracker 并完成登录。
- Use Manage applications to save a profile; confirm the selected profile before filling. Surname / Last name, Given name and other official field names are retained in Chinese. / 通过“管理申请”保存资料，填写前核对所选申请；中文保留原网站字段名。
- Review the form, then submit it on the website. Manually copy the email verification code and choose Verify and check. The extension does not access your mailbox. / 核对资料后在网站提交，手动粘贴邮箱验证码并点击“验证并查询”；扩展不读取邮箱。
- Check each person's progress and expand History. Export only when you need a local JSON copy. / 按申请人查看进度和 History，需要时导出本地 JSON。
- Complete successful checks are compared per profile. Failed or interrupted checks do not replace the baseline. / 完整成功查询按 profile 对比，失败或中断不会覆盖基准。

Chinese is the default. Switch in the popup header or Extension options → Settings. Preferences are local and synchronized across open extension pages. / 默认中文，可在顶部或扩展选项 → 设置中切换英文。

## Privacy and permissions / 隐私与权限

No developer backend, telemetry, ads or external AI. Profiles and comparison baselines use local Chrome storage; query caches use session storage. Required form data is sent only through the official IRCC page. Results and exported files can still contain sensitive personal information.

没有开发者服务器、遥测、广告或外部 AI。申请资料及比较基准保存在本机，查询缓存使用会话存储。查询所需信息通过 IRCC 官方页面提交。结果和导出仍可能包含个人敏感信息。

The debugger permission supports reliable form input and reading the selected Tracker tab's responses. Chrome may show a debugging banner. The extension stops on completion, error, timeout or navigation away. Do not open DevTools on that tab during a check.

调试权限用于可靠填写表单及读取所选 Tracker 标签页响应。Chrome 可能显示调试提示，操作结束、失败、超时或离开 Tracker 后会断开；查询时不要同时打开该标签页的 DevTools。

Read [Privacy policy / 隐私政策](PRIVACY.md), [Security / 安全说明](SECURITY.md) and [Publishing / 发布说明](PUBLISHING.md). Delete a profile and its data from options, or use Clear local data to clear all extension data. Downloaded exports must be deleted separately.

## Development / 开发

Version: 3.4.0. No third-party runtime dependencies. With Node.js 22 or later:

~~~sh
node tests.mjs
node comparison-tests.mjs
node i18n-tests.mjs
node privacy-tests.mjs
node scripts/build-release.mjs
~~~

The build uses an explicit runtime-file allowlist and writes a ZIP with a SHA-256 checksum. Automated tests use synthetic data; no real account or verification code is shipped. The official site's changing forms and authenticated flow still need live testing by the user.

构建使用文件白名单并生成 SHA-256 校验值。自动测试只使用合成数据，发布内容不包含真实账号或验证码。官方页面可能变化，真实登录查询仍需用户实测。

## Feedback / 反馈

Use this repository's Issues page. Include the extension/browser version and reproduction steps. Do not post UCI, application numbers, birth dates, verification codes, cookies, tokens, real screenshots or unredacted exports.

请在 Issues 中提供版本和复现步骤，不要发布编号、出生日期、验证码、cookie、token、真实截图或未脱敏导出。

## License / 许可

No open-source license has been selected by the owner. / 仓库所有者尚未选定开源许可证。
