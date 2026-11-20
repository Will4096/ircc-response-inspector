// Product state decisions, separate from capture/verification logic.
var UIModel={
  query(stage,data,hasProfile){
    const state={step:1,title:'开始查询',help:'选择申请后，打开 Tracker 完成登录。',label:'待开始',open:false,fill:false,verify:false,capture:false,stop:false,add:!hasProfile,openText:'打开 Tracker'};
    if(!hasProfile)return {...state,step:0,title:'先添加一份申请资料',help:'保存 Tracker 查询需要的信息，之后可重复使用。',label:'首次使用'};
    if(stage==='profileSwitch')return {...state,title:'已切换申请，请重新开始 Tracker 查询',help:'当前官网页面仍属于上一份申请。重新登录并提交当前申请后才能继续。',label:'需要重新查询',open:true,openText:'重新开始登录'};
    if(stage==='access')return {...state,title:'先关联当前 Tracker 登录页',help:'Chrome 尚未允许识别认证页地址。允许后将关联原标签页，不读取登录表单。',label:'需要页面授权',open:true,newTab:true,openText:'识别当前登录页'};
    if(stage==='expired')return {...state,title:'登录会话已失效',help:'官网提示当前登录已失效，请重新开始登录。申请资料和查询记录会保留。',label:'需要重新登录',open:true,openText:'重新开始登录'};
    if(stage==='login')return {...state,title:'请在官网完成登录',help:'在 Tracker 官网选择登录方式并完成登录。若页面提示会话失效，可重新开始登录。',label:'待登录',open:true,relogin:true,openText:'前往登录页'};
    if(stage==='form'&&data.autoSubmit)return {...state,step:2,title:'资料已填写',help:'倒计时结束后提交查询；取消后可在官网手动提交。',label:'等待提交'};
    if(stage==='form'&&['submitted','submitting'].includes(data.status))return {...state,step:2,title:'查询已提交，等待官网响应',help:'进入验证码页后继续。若官网仍有校验提示，请在原页面处理。',label:'已提交',open:true,openText:'查看官网提示'};
    if(data.active)return {...state,step:data.status==='filling'?2:4,title:data.status==='filling'?'正在填写申请资料':'正在验证或读取申请进度',help:'请保留 Tracker 页面，完成后会显示本次结果和变化。',label:'处理中',stop:true};
    if(stage==='verification')return {...state,step:3,title:data.status==='failed'?'验证未完成，请换码重试':'完成邮箱验证',help:'核对本次验证码后提交，随后继续查询。',label:'等待验证码',verify:true};
    if(stage==='role' || stage==='form'){const ready=['ready','countdown'].includes(data.status);return {...state,step:2,title:ready?'资料已填写，请手动提交':'填写申请资料',help:ready?'自动提交已暂停，请在官网点击 Submit。':'资料填完后会倒计时 5 秒，随后自动提交。',label:'等待你操作',fill:!ready,open:ready,openText:stage==='form'?'定位官网 Submit':'继续核对申请'};}
    if(stage==='results')return {...state,step:4,title:data.status==='failed'?'本次查询未完成':data.status==='stopped'?'查询已停止':data.status==='completed'?'查询完成':'可以查询申请进度',help:data.status==='completed'?'先看本次变化，再展开申请人详情。':'可以重新查询；未完成的结果不会更新对比基准。',label:data.status==='completed'?'已完成':'可查询',capture:true};
    return {...state,help:'登录由你在 IRCC 官方页面完成，扩展不会代为登录。',open:true};
  },
  helper(connection={}){
    if(connection.error==='mail.version')return {state:'upgrade',action:'升级本机程序',help:'当前版本不兼容。请升级后重新检查，邮箱授权码无需重新填写。'};
    if(connection.error==='mail.windows')return {state:'unsupported',action:'安装 / 升级本机程序',help:'本机程序仅支持 Windows。',disabled:true};
    if(connection.helperReady===true)return {state:'ready',action:'安装 / 升级本机程序',help:'本机程序已就绪，取码时按需启动。需要更新或修复时可重新安装。'};
    if(connection.helperReady===false)return {state:'unavailable',action:connection.helperFailure==='not-found'?'安装本机程序':'安装 / 修复本机程序',help:'尚未连接本机程序。安装或修复后，点击检查确认连接。'};
    return {state:'unknown',action:'安装 / 升级本机程序',help:'已有安装可先检查；首次使用或需要升级，可直接下载安装。'};
  },
  mail(config,connection={},draft={}){
    if(!draft.enabled)return {state:'off',label:'未开启',help:'默认关闭。连接后先筛选邮件头，再读取候选正文；手动输入始终可用。'};
    if(draft.provider==='163'&&connection.error==='mail.version')return {state:'error',label:'需要升级',help:'本机程序版本不兼容，请点击“升级本机程序”。'};
    if(draft.provider==='163'&&connection.helperReady===false)return {state:'error',label:'本机程序未连接',help:'检查 Windows 本机程序，或继续手动输入验证码。'};
    if(draft.hasPassword || !config.enabled || draft.email!==config.email || draft.provider!==config.provider || draft.clientId!==config.clientId)return {state:'setup',label:'待配置',help:'完成连接后生效，当前仍可手动输入验证码。'};
    if(connection.error==='mail.auth')return {state:'reauth',label:'需要重新授权',help:'Gmail 授权暂不可用，请重新连接；手动输入不受影响。'};
    if(connection.error)return {state:'error',label:'连接需要检查',help:'上次连接失败，请重新验证，或手动输入验证码。'};
    if(config.provider==='gmail')return connection.authReady?{state:'connected',label:'已连接',help:'仅等待验证码时检查候选邮件。自动验证单独开启，倒计时期间可暂停。'}:{state:'reauth',label:'需要重新授权',help:'Gmail 授权暂不可用，请重新连接；手动输入不受影响。'};
    if(connection.helperReady===false)return {state:'error',label:'本机程序未连接',help:'检查 Windows 本机程序，或继续手动输入验证码。'};
    if(!connection.configured || !connection.verifiedAt)return {state:'setup',label:'待验证连接',help:'填写客户端授权码并验证连接后启用。'};
    return {state:'connected',label:'已连接',help:'仅等待验证码时检查候选邮件。自动验证单独开启，倒计时期间可暂停。'};
  }
};
