// UI-only localization. Profile names, IRCC payloads, History values and codes
// are never rewritten. The language preference is stored locally.
globalThis.I18n=(()=>{
  let language='zh',ready;
  const listeners=new Set();
  const english={
    'IRCC 扩展设置':'IRCC Extension Settings',
    '扩展设置（含邮箱验证码）':'Extension settings (including email codes)',
    '本地数据已清除。请运行 Windows 卸载脚本清除残留邮箱授权。':'Local data cleared. Run the Windows uninstaller to remove remaining mailbox authorization.',
    '申请资料和查询记录保存在本机，不上传给开发者。通过 IRCC 官网查询；可选邮箱辅助仅在开启后访问所选邮箱服务。':'Application details and query records stay on this device and are not uploaded to the developer. Queries use the official IRCC site; optional email assistance contacts the selected mail provider only when enabled.',
    '邮箱验证码辅助（预览）':'Email code assistance (preview)',
    '默认关闭。开启后按需读取匹配的验证邮件，确认后才提交；手动输入始终可用。':'Off by default. Reads matching messages when needed. Submission requires confirmation; manual entry remains available.',
    '启用邮箱辅助':'Enable email assistance','邮箱类型':'Email provider','接收验证码的邮箱':'Verification email address',
    'Gmail 需要配置 Google OAuth 客户端；只读授权可访问邮箱，不限于 IRCC 邮件。':'Gmail requires a Google OAuth client. Read-only authorization grants mailbox access, not just IRCC messages.',
    '授权 Gmail':'Authorize Gmail','首次使用请运行 Windows 本机安装脚本，再填写 163 客户端授权码（不是登录密码）。':'Run the Windows helper installer first, then enter your 163 app password (not your sign-in password).',
    '安装与授权说明':'Installation and authorization guide','163 客户端授权码':'163 app password','连接 163 并开启':'Connect 163 and enable','检查本机程序':'Check local helper',
    '邮箱辅助不保存邮件正文或验证码，也不上传给开发者。163 授权码由 Windows 本机程序加密保存。':'Email assistance does not save message bodies or codes or upload them to the developer. The Windows helper encrypts the 163 app password locally.',
    '保存邮箱设置':'Save email settings','断开并清除邮箱授权':'Disconnect and clear mailbox authorization',
    '非 IRCC 官方扩展，与加拿大政府无隶属关系。':'Unofficial extension. Not affiliated with IRCC or the Government of Canada.',
    '隐私政策':'Privacy policy','清除本地数据':'Clear local data','本地数据已清除。':'Local data cleared.',
    '清除所有本地申请资料、查询缓存及对比记录？已导出的文件不会删除。':'Clear all locally stored application profiles, query caches and comparison records? Exported files will not be deleted.',
    '请从扩展设置操作。':'Use the extension settings for this action.','查询页面已离开 Tracker，已停止。':'Stopped because the tab left Tracker.',
    '打开 Tracker':'Open Tracker','管理申请':'Manage applications','添加或编辑申请信息，用于自动填写 Tracker':'Add or edit application information for Tracker autofill',
    '添加或编辑申请信息，用于自动填写 Tracker。':'Add or edit application information for Tracker autofill.',
    '设置':'Settings','语言':'Language','界面语言':'Display language','选择申请':'Select application','申请进度':'Application progress',
    '邮箱验证码':'Email verification code','验证并查询':'Verify and check','查询进度':'Check progress','刷新进度':'Refresh progress','填入 Tracker':'Fill in Tracker','填写申请资料':'Fill application details','填写中…':'Filling…',
    '申请人':'Applicant','生物识别':'Biometrics','体检':'Medical exam','资格审核':'Eligibility','背景调查':'Background check','待办':'Pending actions','详情':'Details',
    '读取申请人…':'Loading applicants…','暂无结果':'No results yet','未开始':'Not started','已完成':'Completed','进行中':'In progress','不适用':'Not applicable','未返回':'Not returned','未读取':'Not loaded','无记录':'No records','有记录':'Records available',
    '主申请人':'Principal applicant','家属申请人':'Dependant','历史记录':'History','无历史记录':'No history','历史记录尚未读取':'History not loaded yet','原始响应':'Raw responses','记录':'Record','新增':'New','有更新':'Updated',
    '状态代码':'Status code (actStatus)','类型代码':'Type code (actType)','创建时间':'Created (dateCreated)','载入时间':'Loaded (dateLoaded)','时间':'Date','类别':'Category','标题':'Title','内容':'Content',
    '导出结果':'Export results','未完成':'Incomplete','已开始新的操作':'A new operation has started','已停止':'Stopped','查询完成':'Check complete','查询未完成':'Check incomplete','部分结果':'Partial results','资料已填写':'Details filled','正在填写':'Filling details','读取中':'Loading','等待查询':'Waiting','读取历史记录':'Loading History',
    '读取 ':'Loading ',' · 历史记录':' · History','查询时间 ':'Checked at ',' 人':' people',' 条':' entries',' 条响应':' responses',' 的详情':' — details',
    'History · Security · 原始状态代码':'History · Security · Raw status codes',
    '打开 Tracker 后登录':'Open Tracker and sign in','请在 Tracker 完成登录':'Complete sign-in on Tracker','选择申请后填写资料':'Select an application and fill the details','确认申请信息后提交':'Review the application details, then submit','输入邮箱验证码':'Enter the email verification code',
    '查询完成后，将与上次成功查询对比。':'Results will be compared with the last successful check once complete.',
    '本次查询未完成，未更新比较基准。':'This check is incomplete. The comparison baseline has not changed.',
    '首次记录，已建立下次对比基准':'First record saved for future comparisons','较上次查询有新变化':'Changes since the last check','较上次查询无变化':'No changes since the last check','部分数据无法比较':'Some data could not be compared','暂时无法比较':'Comparison unavailable',
    '尚无对比记录，下次完整查询后可比较':'No comparison yet. Available after the next complete check.','对比上次成功查询：':'Compared with the last successful check: ',
    'History 新增 ':'History: +','，移除或改写 ':', removed or modified ','比较基准未能保存，下次查询可能仍与较早结果比较。':'The baseline could not be saved. The next check may compare against an older result.',
    '申请状态':'Application status','待办数量':'Pending action count','Security 原始状态':'Security raw status','新增或无法匹配的申请人':'New or unmatched applicant','申请':'Application',
    '查询诊断 · ':'Diagnostics · ','申请数据 ':'Application data: ',' 条 · 重复 ':' responses · duplicates: ','前 ':'First ',' 条响应已覆盖 ':' responses cover ',' 人资料':' applicants',' · 含申请数据':' · includes application data',
    '隐私声明：':'Privacy: ',
    '申请资料、查询结果及对比记录仅保存在本机。本扩展不向开发者或第三方上传数据；查询所需信息仅提交至 IRCC 官方网站。':'Application details, query results and comparison records are stored only on this device. This extension does not upload data to the developer or third parties; information needed for a query is submitted only to the official IRCC website.',
    '自动填写所选申请':'Autofill the selected application','新增申请':'Add application','申请名称':'Application label','查询身份':'Tracker role','姓氏（Surname / Last name）':'Surname / Last name','名字（Given name / First name）':'Given name / First name',
    '无 Given name（完整姓名已填入姓氏栏）':'No Given name (full name entered in Surname)','申请编号（Application number）':'Application number','出生日期（Date of birth）':'Date of birth','出生国家（Country of birth，Tracker 英文名称）':'Country of birth (English name used by Tracker)',
    '保存申请':'Save application','删除申请':'Delete application','例如：本人省提名申请':'For example: My provincial nominee application','8 或 10 位数字，不含横线':'8 or 10 digits, without hyphens','例如 China 或 China (Hong Kong SAR)':'For example: China or China (Hong Kong SAR)',
    'Principal applicant（主申请人）':'Principal applicant','Sponsor（担保人）':'Sponsor','Representative（代表）':'Representative','Designated Individual（指定人士）':'Designated Individual',
    'IRCC 管理申请':'IRCC — Manage applications','已保存':'Saved','请填写申请资料。':'Enter the application details.','申请资料已保存。':'Application details saved.','申请资料已删除。':'Application details deleted.','确定删除此申请资料？':'Delete this application profile?',
    '请填写名字，或勾选“无 Given name”。':'Enter a Given name, or select “No Given name”.','勾选“无 Given name”时，请清空名字栏。':'Clear the Given name field when “No Given name” is selected.','出生日期不能在未来。':'Date of birth cannot be in the future.',
    '无法保存语言设置，请重试。':'Could not save the language preference. Please try again.',
    '请输入六位数字验证码。':'Enter the six-digit verification code.','请先打开 Tracker。':'Open Tracker first.','请先添加并选择申请资料。':'Add and select an application profile first.','请先完成登录和邮箱验证。':'Complete sign-in and email verification first.',
    '查询超时，已保留获取的结果。':'The check timed out. Results already received have been kept.','验证码不正确或已过期，请输入有效验证码。':'The verification code is incorrect or expired. Enter a valid code.',
    'Tracker 当前申请与所选申请不一致，请打开 Tracker 重新查询。':'The Tracker application does not match the selected profile. Open Tracker and check again.','当前详情页与申请人不匹配，请重新查询。':'The details page does not match the applicant. Please check again.',
    '身份选择页尚未加载完成。':'The role selection page is still loading.','正在填写申请资料。':'Filling application details.','当前页面无需填写申请资料。':'This page does not need application details.',
    '申请表尚未加载完成，请刷新页面后重试。':'The application form has not loaded. Refresh the page and try again.','填写中断，请刷新页面后重试。':'Autofill was interrupted. Refresh the page and try again.','填写失败。':'Autofill failed.',
    '请确认申请信息，点击 Submit 后继续。':'Review the application details, then click Submit to continue.','正在验证，请稍候。':'Verifying. Please wait.','请先打开 Tracker 邮箱验证码页面。':'Open the Tracker email verification page first.',
    '验证码输入框尚未加载完成。':'The verification code field has not loaded.','未提交验证码，请检查页面。':'The code was not submitted. Please check the page.','验证未完成，请检查验证码后重试。':'Verification is incomplete. Check the code and try again.',
    '验证已提交，正在查询申请进度。':'Verification submitted. Checking application progress.','验证未完成，请检查页面后重试。':'Verification is incomplete. Check the page and try again.','查询已中断，请重新查询。':'The check was interrupted. Please try again.','结果已清空':'Results cleared',
    '当前页面已变更，验证码未提交。':'The page has changed. The code was not submitted.','验证页面尚未加载完成，请刷新页面后重试。':'The verification page has not loaded. Refresh and try again.','暂时无法提交验证码，请稍后重试。':'The code cannot be submitted yet. Try again shortly.','验证页面尚未就绪，请稍后重试。':'The verification page is not ready. Try again shortly.',
    '查询连接已断开，请重新查询。':'The query connection was lost. Please check again.','上次读取已中断':'The previous check was interrupted','历史尚未完整读取':'History has not been fully loaded','未记录页面':'Page not recorded','网络错误':'Network error',
    '页面已变化，未填写。':'The page has changed. No details were filled.','表单尚未就绪。':'The form is not ready.','无法识别无 Given name 选项，未填写。':'The No Given name option could not be identified. No details were filled.',
    '操作提示':'Notice','刷新页面':'Refresh page','收起提示':'Dismiss','请刷新 Tracker 页面后继续。':'Refresh Tracker to continue.','扩展已更新':'Extension updated','补全申请信息':'Complete application details','确认申请信息':'Review application details',
    '未找到申请人详情，请刷新页面后重试。':'Applicant details were not found. Refresh and try again.','历史记录加载未完成，请重新查询。':'History has not finished loading. Please check again.','申请表加载未完成，请刷新页面后重试。':'The application form has not finished loading. Refresh and try again.'
  };
  const chinese={'生物识别':'生物识别 (Biometrics)','体检':'体检 (Medical exam)','资格审核':'资格审核 (Eligibility)','背景调查':'背景调查 (Background check)','历史记录':'历史记录 (History)','主申请人':'主申请人 (Principal applicant)','家属申请人':'家属申请人 (Dependant)'};
  function t(source){return language==='en'?(english[source] ?? source):(chinese[source] ?? source);}
  function message(value){
    const text=String(value ?? '');
    if(language!=='en')return t(text);
    if(Object.hasOwn(english,text))return english[text];
    const patterns=[
      [/^正在编辑：(.*)$/s,m=>'Editing: '+m[1]],
      [/^未再返回的申请人：(.*)$/s,m=>'Applicant no longer returned: '+m[1]],
      [/^(.*)：History 来源变化，本次未比较历史条目。$/s,m=>m[1]+': History source changed; history entries were not compared.'],
      [/^无法启动：(.*)$/s,m=>'Could not start: '+message(m[1])],
      [/^请求未完成：(.*)$/s,m=>'Request incomplete: '+message(m[1])],
      [/^登录或授权已失效（HTTP (\d+)），已自动停止。请回到 Tracker 检查。$/,m=>'Sign-in or authorization expired (HTTP '+m[1]+'). Stopped automatically. Check Tracker.'],
      [/^请手动选择：(.*)。确认申请信息后点击 Submit 继续。$/s,m=>'Select manually: '+m[1]+'. Review the application details, then click Submit to continue.'],
      [/^申请人 (\d+)$/,m=>'Applicant '+m[1]]
    ];
    for(const [pattern,format] of patterns){const match=text.match(pattern);if(match)return format(match);}
    return text;
  }
  function apply(){
    if(typeof document==='undefined')return;
    if(document.documentElement)document.documentElement.lang=language==='en'?'en':'zh-CN';
    for(const node of document.querySelectorAll?.('[data-i18n]') || [])node.textContent=t(node.getAttribute('data-i18n'));
    for(const [attribute,data] of [['title','data-i18n-title'],['placeholder','data-i18n-placeholder'],['aria-label','data-i18n-label']])for(const node of document.querySelectorAll?.('['+data+']') || [])node.setAttribute(attribute,t(node.getAttribute(data)));
    for(const node of document.querySelectorAll?.('[data-language]') || []){node.value=language;node.onchange=()=>setLanguage(node.value).catch(()=>{node.value=language;const status=document.getElementById('languageStatus');if(status)status.textContent=t('无法保存语言设置，请重试。');});}
  }
  function change(value){const next=value==='en'?'en':'zh';if(next===language){apply();return;}language=next;apply();for(const listener of listeners)listener();}
  async function init(){if(!ready)ready=(async()=>{const data=await chrome.storage.local.get('uiLanguage');change(data.uiLanguage);})();apply();return ready;}
  async function setLanguage(value){const next=value==='en'?'en':'zh';await chrome.storage.local.set({uiLanguage:next});change(next);}
  chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local' && changes.uiLanguage)change(changes.uiLanguage.newValue);});
  return {t,message,apply,init,setLanguage,onChange:listener=>listeners.add(listener),get language(){return language;},date:value=>new Date(value).toLocaleString(language==='en'?'en-CA':'zh-CN')};
})();
