# Privacy policy / 隐私政策

Updated / 更新日期: 2026-10-28

Maintainer / 维护者: Will4096. This is an independent extension, not affiliated with IRCC or the Government of Canada. 本扩展为独立开发的非官方工具，与 IRCC 或加拿大政府无隶属关系。

## English

### What the extension processes
The extension helps you fill the official IRCC Tracker form and view your own application progress. You sign in yourself. If you save a profile, it processes the label, name, UCI, application number, date of birth, country of birth and Tracker role you enter. During a user-initiated check it reads application/applicant statuses, medical-exam and other milestone statuses, pending-action counts, History entries and relevant JSON responses from the selected Tracker tab. A manually entered verification code is used only to submit that verification, not saved as a preference, logged, or intentionally included in an export. The extension does not read your mailbox or handle your sign-in password.

### Storage and retention
Profiles, language/autofill preferences and the latest successful comparison baseline are stored in this extension's local Chrome storage. Query caches and captured responses are stored in Chrome session storage; they are not intended to survive the browser session. Nothing is stored in Chrome Sync. Local storage is not an encrypted vault: anyone with sufficient access to your device/browser profile may access it.

### Transmission and sharing
The extension has no developer-operated backend, analytics, advertising, telemetry, or external AI service. It does not send your application data to the maintainer or third parties. When you choose to fill or verify a query, the information required for that operation is submitted to the official IRCC website through its page. IRCC and any sign-in services you use have their own privacy policies. Chrome, GitHub and other products you use operate independently of this extension.

### Responses and exports
Known authentication fields (for example passwords, OTP fields, authorization headers and token fields) are redacted before newly captured response JSON is stored. This does not make the remaining results anonymous: names, identifiers, dates, application and medical-exam milestone statuses and History can still be personal or sensitive information. An export is created on your device only when you choose Export. Protect it and remove personal information before sharing it. The extension does not upload exports.

### Your controls
Autofill is off by default. You can delete a profile and its associated caches/baseline, or use **Extension options → Settings → Clear local data** to remove all extension profiles, preferences, caches and comparison records and stop active checks. Downloaded export files must be deleted separately. Uninstalling the extension removes its Chrome-managed storage; exports outside that storage remain on disk.

### Purpose and contact
Data is used only for the extension's application-tracking features, not sold, used for advertising, creditworthiness or lending decisions, or transferred for unrelated purposes. For questions, contact the maintainer through this repository's Issues page: https://github.com/Will4096/ircc-response-inspector/issues . Do not post names, UCI/application numbers, birth dates, verification codes, tokens or unredacted exports in a public issue. A future change to data practices will be disclosed with an updated policy.

## 中文

### 处理哪些信息
本扩展用于填写 IRCC Tracker 官方查询表单及查看你自己的申请进度。你自行完成登录。保存申请时，扩展处理你填写的申请名称、姓名、UCI、申请编号、出生日期、出生国家和查询身份。你发起查询后，扩展读取所选 Tracker 标签页的申请/申请人状态、体检等进度状态、待办数量、History 及相关 JSON 响应。手动验证码仅用于提交当前验证，不作为配置保存、不记录日志，也不主动写入导出。扩展不读取邮箱、不处理登录密码。

### 保存位置与期限
申请资料、语言/自动填写偏好及最近一次成功查询的对比基准保存在本机 Chrome 扩展存储。查询缓存和捕获响应使用 Chrome 会话存储，不用于跨浏览器会话长期保存。不使用 Chrome Sync。本地存储不等于加密保险库，具备设备或浏览器资料访问权限的人可能访问这些数据。

### 网络传输与共享
扩展没有开发者服务器、统计分析、广告、遥测或外部 AI 服务，不向维护者或第三方发送申请数据。你选择填写或验证查询时，所需信息通过官方页面提交给 IRCC。IRCC 和你使用的登录服务有各自的隐私政策；Chrome、GitHub 等独立产品的数据处理不由本扩展控制。

### 响应与导出
新捕获的 JSON 响应在保存前会遮盖已知认证字段，如密码、OTP、authorization 和 token 字段。其余结果并未匿名化：姓名、编号、日期、申请/体检进度及 History 仍可能包含个人敏感信息。只有你点击导出时才会生成本地文件，扩展不会上传它。分享前请自行脱敏。

### 数据控制
自动填写默认关闭。删除申请会清理该申请的缓存及对比基准。可在**扩展选项 → 设置 → 清除本地数据**中删除全部申请、偏好、查询缓存和对比记录，并停止活动查询。已下载的导出文件需要单独删除。卸载扩展会移除由 Chrome 管理的扩展存储，不会删除已经导出的文件。

### 用途与联系
数据仅用于本扩展的申请追踪功能，不出售、不用于广告或信用/借贷决策，不为无关用途转移。如有问题，请通过仓库 Issues 联系维护者：https://github.com/Will4096/ircc-response-inspector/issues 。请勿在公开 Issue 中发布姓名、UCI/申请编号、出生日期、验证码、token 或未经脱敏的导出文件。数据处理方式变化时会更新此政策。
