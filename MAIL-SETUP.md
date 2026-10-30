# 邮箱验证码辅助 · 开发预览

[简体中文](MAIL-SETUP.md) · [English](MAIL-SETUP.en.md)

分支 `feature/mail-verification-windows`，不合入 main、不发布正式 Release。默认关闭；手动输入始终可用。自动取码不等于自动提交：用户核对目标申请、验证码、用途和邮件时间，点击“验证并查询”才提交。

## 开启位置

加载本分支目录作为开发中的扩展。打开header「设置」（或 Chrome 扩展选项）→ 邮箱验证码辅助。选择 Gmail 或 163、填写接收验证码的邮箱。一次绑定一个邮箱；多 profile 共用邮箱时，同一时间仅保留一次待验证请求。每次必须由本扩展观察到 Tracker 申请查询表单提交，不能在已经打开的验证码页上猜测请求时间。开启后重新提交一次查询表单；不要复用旧验证码。

## Gmail

1. 在 Google Cloud 配置启用 Gmail API 的 OAuth 客户端。本预览使用浏览器 OAuth token 流，使用允许所示 HTTPS redirect URI 的 Web application 客户端；此处的客户端类型和 redirect 配置必须与 Google 项目一致，不要填 client secret。
2. 将设置页面显示的 `https://<扩展ID>.chromiumapp.org/gmail` 配置为重定向 URI，填写 Client ID。
3. 点击“授权 Gmail”，授予可选权限，选择对应邮箱。扩展核对返回邮箱地址，随后开启辅助。

`gmail.readonly` 允许读取整个邮箱，不是只授权 IRCC 邮件；程序仅按需筛选。访问令牌仅保留在后台内存，后台重启或授权过期后需要重新授权；不保存 refresh token。该预览不承诺长时间免授权。公共发布前必须准备生产 OAuth 项目、核对 Google 当前平台配置及完成适用的验证；仓库没有真实 OAuth 凭据，尚未做真实账号联调。

## 163 / Windows

扩展不能自行运行 EXE 或 PowerShell。用户首次运行下列安装命令，脚本会自动安装和注册本机程序；之后无需每次启动辅助程序。支持 Windows、Chrome，使用 Windows PowerShell 5.1。源码不含第三方 Python 依赖。

在本分支源码根目录运行（把 ID 换为设置页面显示的实际扩展 ID）：

```powershell
powershell.exe -NoProfile -File .\windows\install.ps1 -ExtensionId <扩展ID> -InstallPython
```

如果电脑没有 Python，`-InstallPython` 使用官方 winget 包安装当前用户的 Python 3.13；已有 Python 则复用。安装操作由用户明确运行，不修改系统执行策略、不需要管理员权限。若组织策略禁止脚本，应按组织要求处理，不绕过策略。

安装到 `%LOCALAPPDATA%\IRCCMailHelper`，只注册 `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.will4096.ircc_mail`，只允许指定扩展 ID 调用。无常驻服务、计划任务或本地网络端口。扩展 ID 改变后需重新运行安装。

在 163 设置中开启 IMAP，生成客户端授权码。回扩展设置填写授权码（不是网页登录密码），点击“连接 163 并开启”。首次连接验证成功后由 Windows DPAPI 按当前用户加密保存。只读选中 INBOX，使用 BODY.PEEK，不标记已读、不删除或发送邮件。

卸载辅助程序与其授权：

```powershell
powershell.exe -NoProfile -File .\windows\uninstall.ps1
```

也可先点击“断开并清除邮箱授权”清理本机凭据。仅卸载 Chrome 扩展不会删除独立本机程序或 DPAPI 文件；不再使用时到 163 撤销授权码。

## 匹配与限制

- 只在观察到的本次请求后、当前 profile 的 Tracker 验证页检查邮件；离开页面、换 profile、关闭功能后停止。
- 发件域、收件人、Tracker 用途、验证码上下文及服务器收信时间均需匹配。发件地址本身不是身份真实性保证；需要用户核对。
- Portal 创建账号等邮件排除；一封邮件有多个六位数字时不猜测。多封候选由用户明确选择。HTML 邮件仅在内存中转为纯文本；未知语言/模板等无法可靠解析时保留手动流程。
- 轮询约每 10 秒，观察窗口 3 分钟；这是停止等待的产品设置，不是 IRCC 验证码有效期。无确定时间的邮件不自动采用。
- 验证码和正文仅驻留内存，不进配置、日志、导出。忽略/提交的候选不再提供，重试须换码。会话保存请求元数据及带随机请求标识的验证码摘要，用于后台重启后排重；不保存验证码明文。
- 不访问邮箱网页，不使用页面内部 API，不绕过浏览器工具或服务的访问拒绝。开发验收使用虚构邮件，不连接用户邮箱。

## 合入门槛

需完成 Windows 真机安装/卸载、Google OAuth 真实授权及撤销、163 IMAP 实际连接、不同邮件模板及账号/多 profile 并发联调。再验证旧邮件、Portal 邮件、多数字、重复码、失败换码、切换 profile、会话过期、忽略、关闭后手动输入等场景。此前保持开发分支，不视为成熟功能。
