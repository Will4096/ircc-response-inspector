# Security / 安全反馈

No developer-operated data backend, analytics or telemetry. Personal records are processed locally, with communication to official IRCC and optional mailbox services. Local storage is not an encrypted vault. Debugger access is powerful and restricted to the selected Tracker operation. Do not install unknown modified copies.

Ordinary reports: https://github.com/Will4096/ircc-response-inspector/issues . Include versions, steps and synthetic/redacted examples only. Never post credentials, codes, cookies, raw personal exports or browser profiles. For vulnerabilities use https://github.com/Will4096/ircc-response-inspector/security/advisories/new if available. Otherwise request a private contact method without disclosing exploit or personal details. The maintainer must verify repository-side availability before inviting sensitive submissions; no dedicated private support inbox or response deadline is currently promised.

邮箱辅助和自动验证默认分别关闭；已包含在项目中，不局限于旧功能分支。Gmail 只读权限覆盖整个邮箱；程序先检查有限邮件头，再读取候选正文，读取后仍可能排除。Windows helper 使用 DPAPI、只读 IMAP 和校验证书的 TLS，按单次操作启动退出。浏览器数据清理与卸载 helper 是独立操作，详见隐私政策。

公开反馈仅提供版本、操作步骤和合成或脱敏示例。敏感问题优先使用上面的可用私密入口；不可用时只请求私下联系方式，不公开漏洞细节或个人资料。不要提交 OAuth token、client secret、授权码、正文或验证码。已知认证字段脱敏不是匿名化；分享前还需检查姓名、编号、日期、History 等。加密不能代替脱敏。

See [Privacy](PRIVACY.md), [email setup](MAIL-SETUP.en.md) and [release gates](PUBLISHING.md). Provider review, service terms and real-provider integration remain separate from offline security tests.
