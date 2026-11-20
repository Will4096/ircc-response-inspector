# Privacy policy / 隐私政策

Updated / 更新日期: 2026-11-17

Maintainer / 维护者: Will4096. Independent, unofficial software; no affiliation with or endorsement by IRCC or the Government of Canada. 独立开发的非官方工具，与 IRCC 或加拿大政府无隶属或背书关系。

## English

### Data and optional access
The extension helps organize your own or lawfully authorized IRCC Tracker queries. You sign in yourself. Profiles contain the label, name, UCI, application number, birth date, birth country and role you enter. A query processes statuses, medical-exam milestones, pending actions, History and relevant JSON responses. Codes are used for the current verification only, not saved as preferences or logged. Optional permission for gc.auth.canada.ca and clegc-gckey.gc.ca allows URL metadata and a script that checks h1 headings for explicit session-expired messages. It does not inspect sign-in forms or passwords or persist authentication URLs or request parameters.

### Storage and retention
Profiles, preferences and the latest successful comparison baseline (including applicant details and History) stay in local Chrome extension storage until replaced or deleted. Captured responses, query caches and bounded diagnostic events use Chrome session storage. Nothing uses Chrome Sync. Limited continuation metadata, including mailbox address, application identifier, submission time, state and request-salted attempted-code digests, uses local storage. It expires 24 hours after the original submission and is removed at the next worker start or mailbox operation; this is not a promise of timed deletion while the browser is closed. Completed requests cannot resume. Deleting a profile, disconnecting email or clearing browser data removes the associated continuation records. Local browser storage is not an encrypted vault.

### Transmission
There is no developer-operated backend, analytics, advertising, telemetry or external AI service receiving application data. Queries submit necessary information to IRCC through its official page. Optional mailbox access communicates directly with Google or 163, under their own policies. Chrome, GitHub and sign-in services operate independently. Do not interpret local processing as an absence of network communication.

### Optional email and automation
Email assistance and code auto-verification are separate options, both off by default. Gmail gmail.readonly permission authorizes mailbox-wide read access. The program checks up to ten recent candidate headers, filters sender, receipt time, recipient and recognizable subject, then reads candidate bodies for final matching; a body may still be rejected after reading. Unrecognized subjects are not read; use manual entry if a template is unsupported. The recognized shared IRCC account-confirmation template may also be used by Tracker. Sender matching is not a guarantee of sender authenticity or proof that two simultaneous tasks in one mailbox are the same request. Review the target application; manual entry remains available. Auto-verification uses a visible cancellable five-second countdown, with immediate verification and pause; failed or ambiguous candidates are not automatically retried. The observation window is ten minutes; neither this nor the continuation limit represents official code validity.

Provider, mailbox and OAuth Client ID are saved locally. Gmail access tokens stay in worker memory. The Windows 163 helper stores its app password with current-user Windows DPAPI and contacts only imap.163.com over verified TLS. Bodies and codes stay in memory, are not logged or exported, and attachments are not processed. The helper runs for one operation and exits. When 163 assistance is enabled and native communication permission already exists, opening a visible workspace may launch a status-only compatibility check. Healthy results are cached for five minutes, failures for one minute; concurrent views share a probe. Status checks do not decrypt credentials or contact the mailbox. Version, protocol, availability and check time are kept in Chrome session storage. Hidden or closed views do not start periodic checks, and embedded settings do not launch a separate check. Candidate confirmation pauses fetching; in-flight work may finish after cancellation. Fixed-vocabulary helper diagnostics contain UTC timestamps, stages and counts, with two bounded rotating files of about 64 KiB each; they remain until separately removed or the helper is uninstalled.

### Google API Limited Use
https://developers.google.com/terms/api-services-user-data-policy

The use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including its Limited Use requirements. Google data is used only for the user-requested verification assistance, not advertising, sale, credit decisions, unrelated purposes or model training. This statement is not a claim of Google verification, approval or endorsement. Gmail production verification or a documented exception must be established for the intended deployment.

### Exports and deletion
Known authentication fields and URL query strings/fragments are removed from newly retained/exported responses. This is not anonymization: names, identifiers, dates, medical-exam milestones, History and Security values can remain sensitive. Check and redact before sharing. Profile transfer always requires password encryption and contains profiles only. Latest raw responses can be exported as plain JSON or password-encrypted files. Encryption is not anonymization; forgotten passwords cannot be recovered. Exports are created locally, not uploaded by the extension.

Clear browser data removes extension profiles, preferences, continuation, caches and comparisons and stops checks. When available, the helper also removes its current and known legacy credential files; otherwise run its uninstaller. Diagnostics, the Windows helper and downloaded files are not removed by browser-data clearing. Uninstalling the extension does not uninstall the helper. Revoke Gmail access or the 163 app password at the provider separately. Uninstalling the helper removes its known credential and diagnostic files, not your exported downloads.

### Contact and changes
Maintainer profile: https://github.com/Will4096 . Ordinary reports: https://github.com/Will4096/ircc-response-inspector/issues . Public reports must contain only versions, steps and synthetic/redacted examples. For a sensitive issue, use GitHub private vulnerability reporting if available: https://github.com/Will4096/ircc-response-inspector/security/advisories/new . If unavailable, request a private contact method without posting sensitive details. No private support inbox or response-time commitment is currently offered. Do not send credentials, codes or raw personal records. Material changes to data practices require an updated policy and appropriate notice. This policy does not limit non-excludable legal rights.

## 中文

### 信息与可选权限
本扩展辅助整理本人或已获合法授权的 IRCC Tracker 查询。登录由你自行完成。申请资料包括自行填写的名称、姓名、UCI、申请编号、出生日期、出生国家和查询身份。查询处理状态、体检等节点、待办、History 及相关 JSON 响应。验证码仅用于当前验证，不作为偏好保存或记录日志。获得 gc.auth.canada.ca 与 clegc-gckey.gc.ca 的可选权限后，可使用地址元数据，并执行脚本检查 h1 标题是否明确提示会话失效；不读取登录表单或密码，不持久保存认证地址或请求参数。

### 保存位置与期限
申请资料、偏好及最近一次成功查询的对比基准（包括申请人资料及 History）保存在本机 Chrome 扩展存储，直至替换或删除。捕获响应、查询缓存及有限诊断事件使用 Chrome 会话存储。不使用 Chrome Sync。有限续接元数据，包括邮箱、申请标识、原始提交时间、状态和带请求随机标识的已尝试码摘要，使用本地持久存储。原始提交满 24 小时后失效，在下一次后台启动或邮箱操作时清理，不承诺浏览器关闭时定时删除。已完成请求不能续接。删除申请、移除邮箱连接或清除浏览器数据会删除对应续接记录。本地浏览器存储不是加密保险库。

### 网络传输
没有接收申请数据的开发者服务器、统计分析、广告、遥测或外部 AI 服务。查询所需信息经官方页面提交给 IRCC。可选邮箱辅助直接访问 Google 或 163，适用其各自政策。Chrome、GitHub 和登录服务独立运行。本地处理不等于不发生网络通信。

### 可选邮箱与自动操作
邮箱辅助与验证码自动验证分别控制，默认均关闭。Gmail 的 gmail.readonly 授权范围为整个邮箱。程序检查最多十封近期候选邮件头，筛选发件人、收信时间、收件人及可识别主题，再读取候选正文进行最终匹配；读取后仍可能排除该候选。不识别的主题不读取正文，模板不支持时可手动输入。已识别的 IRCC 通用账号确认模板也可能用于 Tracker。发件域匹配不保证发件人真实性，也不能证明同一邮箱内两个同时进行的任务属于同一次请求。请核对目标申请，手动输入始终可用。自动验证显示可取消的五秒倒计时，支持立即验证及暂停；失败或存在歧义的候选不会自动重试。十分钟观察窗口及续接期限均不代表官方验证码有效期。

邮箱类型、地址及 OAuth Client ID 保存在本机；Gmail 访问令牌仅在后台内存。Windows 163 程序使用当前用户的 DPAPI 保存客户端授权码，仅以校验证书的 TLS 连接 imap.163.com。正文和验证码仅在内存处理，不保存、不记录日志、不导出，不处理附件。本机程序按单次操作启动后退出。163 辅助已开启且已有本机通信权限时，打开可见工作区会按需进行仅状态的兼容检查；正常结果缓存五分钟，失败缓存一分钟，并发视图共用检查。状态检查不解密凭据、不连接邮箱；版本、协议、可用状态和检查时间保存在 Chrome 会话存储。隐藏或关闭的视图不触发定时检查，嵌入的设置页不另行启动检查；候选等待确认时暂停取码，取消后的在途请求可能完成后才退出。程序诊断仅包含 UTC 时间、固定阶段和计数，最多两个约 64 KiB 的轮转文件，保留至另行删除或卸载程序。

### Google API 限制使用
https://developers.google.com/terms/api-services-user-data-policy

本扩展对 Google API 信息的使用和转移遵守 Google API Services User Data Policy，包括 Limited Use 要求。Google 数据仅用于用户请求的验证码辅助，不用于广告、出售、信用决策、无关用途或模型训练。此声明不代表已获 Google 审核、批准或背书。实际部署前须确认适用的 Gmail 生产审核或有记录的例外依据。

### 导出与删除
新保存及导出的响应会移除已知认证字段和 URL 查询参数、片段，但没有匿名化。姓名、编号、日期、体检节点、History 和 Security 原始值仍可能敏感，分享前须检查脱敏。申请资料转移始终使用密码加密且只包含 profile；最新原始响应可导出明文 JSON 或密码加密文件。加密不等于匿名化，密码遗失无法恢复。扩展在本机生成导出，不上传文件。

清除浏览器数据会删除申请、偏好、续接、缓存和对比记录并停止查询。本机程序可用时也删除当前及已知旧版凭据，否则请运行卸载脚本。浏览器数据清理不会删除诊断日志、本机程序或已下载文件。卸载扩展不会卸载 Windows 程序；须另行在服务端撤销 Gmail 授权或 163 客户端授权码。卸载本机程序会清理其已知凭据及诊断文件，不会删除已导出的下载文件。

### 联系与变更
维护者主页：https://github.com/Will4096 。普通反馈：https://github.com/Will4096/ircc-response-inspector/issues 。公开反馈仅提供版本、步骤和合成或脱敏示例。敏感问题优先使用可用的 GitHub 私密漏洞报告：https://github.com/Will4096/ircc-response-inspector/security/advisories/new 。入口不可用时，请只请求私密联系方式，不公开细节。目前不提供专用私密支持邮箱或回复时限承诺。不要发送凭据、验证码或原始个人记录。数据处理方式发生重大变化时，应更新政策并适当通知。本政策不限制依法不得排除的用户权利。
