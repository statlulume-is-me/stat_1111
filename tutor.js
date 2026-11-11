/* ============================================================
   統計小助教（三個主題共用）
   用法：在頁面最後加一行
     <script src="tutor.js" data-topic="kmeans"></script>
   data-topic：kmeans｜regression｜tree｜road｜home
   data-bottom（可省略）：右下按鈕離底部幾 px，避免擋到頁面底部的固定按鈕
   ------------------------------------------------------------
   運作順序：先查下面的知識庫（關鍵字比對，不用網路）→ 查不到才問 AI
   → AI 也沒接上，就給 Google／ChatGPT 搜尋連結
   ============================================================ */
(function(){
"use strict";

/* ==================== 可以改的設定 ==================== */
const CONFIG={
  NAME:"統計小助教",
  AI:{
    ENABLED:true,          // false＝完全不用 AI，只用知識庫
    // 老師的 Apps Script 代理網址（結尾 /exec）。填了以後學生不用自己申請金鑰。
    // 設定方法見「統計小助教_AI代理_說明.md」。留白＝不用代理。
    PROXY_URL:"https://script.google.com/macros/s/AKfycbxU4AYtoSKLUKDcwkWVFwShkcG6BVZJ6Ti6nd9XeMiOKoKegQVPJlNJxVdHss0YPxsX5Q/exec",
    ALLOW_KEY:false,       // 允許學生在小助教裡貼自己的 Gemini 金鑰（2026-11-11 有老師代理了 → 關掉，藏起「🔌 AI」鈕）
    ALLOW_BUILTIN:true     // 瀏覽器有內建 AI（新版 Chrome）就直接用
  },
  TOPICS:{
    kmeans:{name:"K-means 分群",color:"#2A78D6",
      hello:"我是統計小助教。這個單元在學 K-means 分群，名詞不懂都可以問我。",
      chips:["什麼是質心？","k 要怎麼選？","為什麼要用佔比？","為什麼要標準化？"],
      context:"學生正在學 K-means 分群。例子是台灣行政區的刑案資料（毒品、車輛竊盜、住宅竊盜三類的佔比），把犯罪組成相像的區分成同一群。"},
    regression:{name:"迴歸分析",color:"#17798E",
      hello:"我是統計小助教。這個單元在學迴歸分析，名詞不懂都可以問我。",
      chips:["什麼是相關係數 r？","斜率是什麼意思？","r 接近 0 代表什麼？","相關等於因果嗎？"],
      context:"學生正在學簡單線性迴歸與相關係數。主例子是 35 個國家的房價漲幅與生育率變化（r 只有 +0.037），還有讀書時數與分數、冰淇淋與溺水、安斯庫姆四重奏、辛普森悖論。"},
    tree:{name:"決策樹",color:"#C7391F",
      hello:"我是統計小助教。這個單元在學決策樹，名詞不懂都可以問我。",
      chips:["什麼是不純度？","為什麼先問「明天要早起」？","什麼是過度配適？","準確率高就是好模型嗎？"],
      context:"學生正在學決策樹（CART）。例子是 40 個人今晚要不要去夜市，五個條件中「明天要早起」被選為第一個問題，用 Gini 不純度挑分裂。"},
    road:{name:"資料視覺化",color:"#B26A00",
      hello:"我是統計小助教。這個單元在學怎麼讀圖、怎麼看穿會騙人的圖，名詞不懂都可以問我。",
      chips:["為什麼要看分母？","截斷 y 軸有什麼問題？","圓餅圖什麼時候能用？","相關等於因果嗎？"],
      context:"學生正在學資料視覺化與比率。例子是台灣 114 年各縣市交通事故（死亡人數 vs 每百件死亡數 vs 每十萬人），六台實驗機器分別是長條圖截軸、散布圖相關≠因果、折線圖、圓餅圖、直方圖組距、自己輸入數字畫五種圖。"},
    home:{name:"全民數據科學實驗室",color:"#1F2328",
      hello:"我是統計小助教。迴歸、K-means、決策樹、資料視覺化的名詞都可以問我，也可以問我該先學哪一個。",
      chips:["該先學哪一個？","迴歸和分群差在哪？","什麼是監督式學習？"],
      context:"這是選主題的首頁，有迴歸分析、K-means 分群、決策樹、資料視覺化四個主題。"}
  },
  /* 每一站的提示問題：頁面切到哪一站，小助教就換成那一站最常卡住的問題
     （頁面用 window 事件 "stt-station" 告訴小助教目前在哪一站；沒有站點資訊時用上面的 chips）
     每一題都要能在下面的知識庫查到答案 → 改了記得用 ?tutor=open 點一輪確認 */
  STATION_NAME:{life:"① 生活問題",guess:"② 先猜答案",story:"③ 故事動畫",principle:"④ 核心原理",lab:"⑤ 互動實驗",
    chaos:"⑥ 搞亂資料",myth:"⑦ 迷思破解",quiz:"⑧ 學習挑戰",diag:"⑨ 學習診斷",next:"⑩ 下一步"},
  STATIONS:{
    common:{
      quiz:["答錯了，題目會變簡單嗎？","測驗的程度是怎麼算的？","什麼是迷思？"],
      diag:["「確認迷思」是什麼意思？","我該先補哪一塊？","分數不高代表我很差嗎？"]},
    kmeans:{
      life:["分群跟分類一樣嗎？","分群需要先有標準答案嗎？","分群是在比哪一區比較危險嗎？"],
      guess:["為什麼要用佔比，不用件數？","佔比高就代表那區比較危險嗎？","只看兩個特徵夠嗎？"],
      story:["質心一定是某一個區嗎？","分群什麼時候會停下來？","換個起點，結果會不一樣嗎？"],
      principle:["WSS 越小就越好嗎？","k 要怎麼選？","為什麼要先標準化？"],
      lab:["第一群一定比第二群嚴重嗎？","質心為什麼會移動？","距離是怎麼算的？"],
      chaos:["一個離群值就能把群拉歪嗎？","資料根本沒有群，也會硬分嗎？","一邊資料特別多會怎樣？"],
      myth:["分群可以證明原因嗎？","KNN 和 K-means 一樣嗎？","類別資料可以直接分群嗎？"],
      quiz:["答錯了，題目會變簡單嗎？","「我不知道」可以按嗎？","測驗的程度是怎麼算的？"],
      diag:["雷達圖怎麼看？","「確認迷思」是什麼意思？","我該先補哪一塊？"],
      next:["K-means 還能用在哪裡？","還有其他分群方法嗎？","下一個主題學什麼？"]},
    regression:{
      life:["房價漲，生育率就一定掉嗎？","什麼是迴歸？","相關等於因果嗎？"],
      guess:["什麼是散佈圖？","誰是 X、誰是 Y？","一個點代表什麼？"],
      story:["台灣一國能證明房價是元兇嗎？","相關和因果差在哪？","什麼是混淆變數？"],
      principle:["斜率是什麼意思？","線越陡，關係越強嗎？","為什麼要平方？"],
      lab:["r 接近 0 代表什麼？","負相關是比較弱嗎？","R² 是什麼？"],
      chaos:["一個極端的點能改變結論嗎？","什麼是辛普森悖論？","換個算法，排名會變嗎？"],
      myth:["r 一樣，圖就差不多嗎？","整體趨勢，每一組都一樣嗎？","可以拿線去預測很遠的地方嗎？"],
      next:["外推是什麼？","p 值是什麼？","下一個主題學什麼？"]},
    tree:{
      life:["決策樹是怎麼做決定的？","分類和分群一樣嗎？","決策樹需要標準答案嗎？"],
      guess:["什麼是根節點？","為什麼先問「明天要早起」？","什麼是樹葉？"],
      story:["第一個問題是怎麼選的？","什麼是不純度？","早起是不去夜市的原因嗎？"],
      principle:["Gini 是什麼？","Gini 和熵差在哪？","什麼是貪婪分裂？"],
      lab:["樹越深越準嗎？","什麼是過度配適？","葉子裡的比例怎麼來？"],
      chaos:["資料少一點，樹會變嗎？","沒出現在樹上的條件就沒用嗎？","在夜市發問卷，收很多就準嗎？"],
      myth:["準確率八成就很強嗎？","樹上的規則都一樣可信嗎？","什麼是隨機森林？"],
      diag:["能力值是什麼？","「確認迷思」是什麼意思？","我該先補哪一塊？"],
      next:["什麼是剪枝？","決策樹也能預測數字嗎？","下一個主題學什麼？"]},
    road:{
      life:["死亡人數最多就最危險嗎？","為什麼要看分母？","比率是什麼？"],
      guess:["兩張排行榜為什麼不一樣？","每十萬人和每百件差在哪？","什麼是比率？"],
      story:["資料是怎麼登錄的？","沒報案的事故算不算？","署所屬機關是什麼？"],
      principle:["圖是怎麼「翻譯」數字的？","相關等於因果嗎？","換分母會怎樣？"],
      lab:["截斷 y 軸有什麼問題？","什麼時候用折線圖？","直方圖組距怎麼選？"],
      chaos:["只留前 5 名有什麼問題？","加一個離群值會怎樣？","竄改數字和換分母一樣嗎？"],
      myth:["連江縣 0 人死亡，就最安全嗎？","凌晨事故最少，就最安全嗎？","比率高，代表駕駛都開很快嗎？"],
      next:["圓餅圖什麼時候能用？","死亡人數一路改善是真的嗎？","下一個主題學什麼？"]}
  }
};

/* ==================== 知識庫 ====================
   t：名稱　k：關鍵字（命中越長分數越高）　a：回答　s：一句話重點
   r：相關名詞（會變成「你可能也想問」）　topic：common 或主題代號
   ============================================== */
const KB=[
 /* ---------- 共通 ---------- */
 {topic:"common",t:"平均數",k:["平均數","平均","mean","算術平均"],a:"全部加起來再除以個數。最直覺，但只要有一個超大或超小的極端值，平均就會被拉過去。",s:"全部加總除以個數；怕極端值。",r:["中位數","離群值"]},
 {topic:"common",t:"中位數",k:["中位數","median"],a:"把資料排好，取正中間那一個。多一個誇張的大值它也幾乎不動，所以描述「典型情況」常比平均數穩。",s:"排序取正中間；不怕極端值。",r:["平均數"]},
 {topic:"common",t:"眾數",k:["眾數","mode"],a:"出現次數最多的值。類別資料（例如最常見的犯罪類型、最多人選的口味）只能看眾數，不能算平均。",s:"出現最多次的值；類別資料用它。"},
 {topic:"common",t:"標準差",k:["標準差","變異數","離散程度","分散","sd","std","variance"],a:"衡量資料離平均有多散。標準差小＝大家擠在平均附近；大＝分佈很開。變異數是標準差的平方。",s:"資料有多分散；變異數＝標準差平方。",r:["標準化"]},
 {topic:"common",t:"離群值",k:["離群值","離群","極端值","outlier","異常值","怪咖"],a:"跟其他資料差很遠的點。它可能是打錯，也可能是真實的特殊情況。不管哪一種方法，平均、迴歸線、質心都可能被它拉歪，所以要先查明，不要直接刪掉。",s:"差很遠的點；先查明再處理，別直接刪。",r:["平均數","高槓桿點"]},
 {topic:"common",t:"變數",k:["變數","欄位","特徵","feature","variable"],a:"資料裡可以變動、可以被記錄的一個項目，例如身高、房價、犯罪佔比、「明天要不要早起」。數值變數可以加減，類別變數只能分類。",s:"資料裡被記錄的一個項目。",r:["類別資料"]},
 {topic:"common",t:"類別資料 vs 數值資料",k:["類別資料","類別變數","數值資料","數值變數","質性","量化"],a:"數值資料可以比大小、算平均（身高、件數）；類別資料只是分類（血型、口味、縣市）。把類別硬編成 1、2、3 去算距離或平均，通常沒有意義。",s:"數值能算平均；類別只能分類。"},
 {topic:"common",t:"相關 vs 因果",k:["因果","相關等於因果","相關不等於因果","causation","correlation","造成","導致","相關和因果"],a:"兩件事一起變動（相關），不代表其中一個造成另一個（因果）。可能有第三個變數同時推動兩者，也可能方向反了。要證明因果，通常需要隨機分派的實驗。",s:"一起變動 ≠ 一個造成另一個。",r:["混淆變數","反向因果","隨機實驗"]},
 {topic:"common",t:"混淆變數",k:["混淆變數","第三變數","第三個變數","干擾變數","confounder","潛在變數"],a:"同時影響 X 和 Y、讓兩者看起來有關的變數。例：天氣熱同時讓冰淇淋賣更多、去玩水的人更多，冰淇淋和溺水就「看起來」有關。",s:"同時推動 X 和 Y 的第三個變數。",r:["相關 vs 因果"]},
 {topic:"common",t:"反向因果",k:["反向因果","方向相反","倒因為果","reverse"],a:"明明是 Y 影響 X，卻被讀成 X 影響 Y。例：「常去醫院的人比較不健康」——其實是身體不好才常去醫院。",s:"因果方向弄反了。",r:["相關 vs 因果"]},
 {topic:"common",t:"隨機實驗",k:["隨機實驗","隨機分派","實驗組","對照組","rct","控制組"],a:"把人隨機分成兩組，只讓其中一組接受處理。因為隨機，兩組其他條件平均起來差不多，結果的差別才能歸因到那個處理。這是證明因果最有力的方法。",s:"隨機分組，才能把差異歸因於處理。",r:["相關 vs 因果"]},
 {topic:"common",t:"抽樣偏誤",k:["抽樣偏誤","選擇偏誤","偏誤","bias","代表性","樣本怎麼來","自願","只留前","發問卷","收很多"],a:"樣本的挑選方式讓它不能代表想研究的全體。例：只訪問有瘦下來的顧客、網路投票只有在意的人會投。樣本怎麼來的，比樣本有多大更重要。",s:"挑樣本的方式偏了，人再多也沒用。",r:["樣本數"]},
 {topic:"common",t:"樣本數",k:["樣本數","樣本大小","樣本太小","資料太少","n 是什麼","筆數","幾筆"],a:"資料有幾筆。樣本太小時，結果很容易隨「剛好抽到誰」大幅擺盪；但樣本大也不保證可靠，還要看樣本有沒有代表性。",s:"太小會不穩；大也要有代表性。",r:["抽樣偏誤"]},
 {topic:"common",t:"雜訊",k:["雜訊","noise","干擾","隨機誤差"],a:"資料裡跟規律無關的隨機變動。雜訊多，真正的訊號就被稀釋，結果會變得不穩定。",s:"隨機變動，會稀釋真正的規律。"},
 {topic:"common",t:"不平衡資料",k:["不平衡","imbalance","一邊多","類別不平衡","少數群體","特別多"],a:"某一類（或某一群）的資料特別多。多數會蓋過少數：分群會把大群切開、小群併掉；迴歸裡少數人的強關係會被多數稀釋；分類時「全猜多數」準確率就很高。",s:"多數會蓋過少數的訊號。"},
 {topic:"common",t:"標準化",k:["標準化","正規化","z分數","z 分數","zscore","normalize","standardize","單位不同"],a:"把每個欄位換算成「離自己的平均幾個標準差」，讓不同單位（件數 vs 百分比、元 vs 歲）站在同一條起跑線。K-means 這種靠距離的方法特別需要；相關係數 r 本身則不受單位影響。",s:"換成同一個尺度，免得大數字主導。",r:["標準差","歐式距離"]},
 {topic:"common",t:"監督式 vs 非監督式",k:["監督式","非監督式","監督","非監督","supervised","unsupervised","有沒有答案","標準答案"],a:"監督式學習有正確答案可以對（迴歸預測數字、決策樹預測去不去）；非監督式沒有答案，只找資料自己的結構（K-means 分群）。",s:"有答案可對＝監督；只找結構＝非監督。",r:["分類 vs 分群"]},
 {topic:"common",t:"分類 vs 分群",k:["分類","分群差","classification","分類和分群","分群跟分類","分類跟分群","分群和分類"],a:"分類是「已知每筆的類別，學會判斷新資料」（決策樹）；分群是「沒有類別，自己把像的湊一起」（K-means）。名字很像，方向相反。",s:"分類：有答案學判斷；分群：沒答案自己湊。",r:["監督式 vs 非監督式"]},
 {topic:"common",t:"模型",k:["模型","model","演算法是什麼","演算法"],a:"從資料裡整理出來、可以拿來描述或預測的規則。迴歸線、K-means 的分群、決策樹都是模型。模型都是簡化，一定有誤差。",s:"從資料整理出的規則，一定有誤差。"},
 {topic:"common",t:"三個主題差在哪",k:["差在哪","有什麼不同","哪裡不一樣","迴歸和分群","分群和決策樹","迴歸和決策樹","三個主題"],a:"迴歸：用一個數字預測另一個數字，畫一條線。K-means：沒有答案，把長得像的資料自動分成幾群。決策樹：一路問是非題，做出分類或決定。資料視覺化：學會讀圖、選對分母，看穿會騙人的圖表。",s:"預測數字／自動分群／一路問問題／讀懂圖表。",r:["監督式 vs 非監督式"]},
 {topic:"common",t:"該先學哪一個",k:["先學","從哪裡開始","學哪一個","順序","推薦","下一個主題"],a:"建議先學迴歸（看懂散佈圖、一條線、相關係數 r），再學 K-means（同樣的散佈圖加上「距離」），最後學決策樹（一路問問題，概念比較抽象）。資料視覺化不需要先備知識，什麼時候學都可以。",s:"迴歸 → K-means → 決策樹；視覺化隨時可學。"},
 {topic:"common",t:"適性測驗",k:["適性測驗","變簡單","變難","題目會變","怎麼出題"],a:"適性測驗會跟著你的作答調整：答對就出難一點、答錯就出簡單一點，用比較少的題目估出你的程度。所以題目變簡單不代表你考很差，只是電腦在找最適合你的難度；每個人考到的題目也不一樣。",s:"答對變難、答錯變簡單，找最適合你的難度。",r:["能力估計","迷思診斷"]},
 {topic:"common",t:"我不知道",k:["我不知道","不會就猜","可以猜嗎","用猜的"],a:"不會的題目按「我不知道」比亂猜好：猜對了，電腦會以為你懂，後面的題目和補強建議就不準了。這不是考試，誠實作答，診斷才幫得上你。",s:"不會就按我不知道，診斷才準。",r:["適性測驗"]},
 {topic:"common",t:"能力估計",k:["程度是怎麼算","能力值","能力分數","θ","theta","怎麼算分","分數不高","程度"],a:"電腦不是只數你答對幾題，而是看你答對、答錯的是哪些難度的題目，估出一個能力值（θ）。答對難題、答錯簡單題，影響都比較大。題數少時估計比較粗，所以結果是「你大概在哪個位置」，不是成績，也不代表你差。",s:"看答對哪些難度的題，估出大概位置。",r:["適性測驗"]},
 {topic:"common",t:"迷思診斷",k:["確認迷思","什麼是迷思","迷思是什麼","迷思"],a:"迷思是「聽起來很合理、但其實不對」的想法。測驗的錯誤選項背後通常各藏一種迷思：同一種迷思重複選錯，比較可能是真的有這個誤會；只錯一次，可能只是粗心，先「留意」就好。",s:"重複犯同一種錯，才比較像真的迷思。",r:["怎麼補強"]},
 {topic:"common",t:"怎麼補強",k:["先補","補哪","補強","該複習","弱項","弱的"],a:"先挑診斷裡最弱、或重複出現的那一個迷思，回到對應的那一站（互動實驗、搞亂資料或迷思破解）親手再玩一次，再回來做幾題確認。一次補一個，比全部重看有效。",s:"一次補一個最弱的，玩完再回來驗收。",r:["迷思診斷"]},
 {topic:"common",t:"生態謬誤",k:["生態謬誤","駕駛都","每個人都","整體推個人"],a:"用整個群體（縣市、國家、班級）的數字，去推論群體裡的每一個人。某縣市每百件事故死亡數高，可能是路況、車種、送醫距離不同，不代表那裡每個駕駛都開得比較快。",s:"群體的數字不能直接套在每個人身上。",r:["混淆變數"]},

 /* ---------- 資料視覺化（馬路地獄地圖） ---------- */
 {topic:"road",t:"比率與分母",k:["分母","分子","比率","每十萬人","每百件","死傷率","人數還是比率","換分母","死亡人數最多","排行榜"],a:"比率＝分子 ÷ 分母。死亡「人數」最多的縣市，通常只是人多車多；換成每十萬人、每百件事故來比，冠軍常常換人。不同分母回答不同問題：每十萬人問「住這裡的人危不危險」，每百件問「出事時嚴不嚴重」。",s:"先問分母是誰；換分母，冠軍就換人。",r:["相關 vs 因果"]},
 {topic:"road",t:"截斷 y 軸",k:["截軸","截斷","y軸","y 軸","縱軸","不從0開始","不從零開始","誇大差距"],a:"長條圖用「長度」表示數量，所以 y 軸必須從 0 開始；把底部截掉，3% 的差距看起來可能像 3 倍。折線圖看的是趨勢，可以不從 0 開始，但截得太過頭一樣會誇大起伏。",s:"長條圖一定從 0 開始；截軸會放大差距。",r:["圖表選擇"]},
 {topic:"road",t:"圓餅圖",k:["圓餅","圓餅圖","派圖","pie"],a:"圓餅圖三個條件缺一不可：各塊加起來是一個整體（100%）、類別不能太多（大約 5 塊以內）、要比的是「占全體多少」。不符合時改用長條圖，人眼比長度比比角度準得多。",s:"加起來要 100%、塊數少、比占比才用。",r:["圖表選擇"]},
 {topic:"road",t:"直方圖組距",k:["直方圖","組距","bin","分組","柱子"],a:"直方圖把數值切成一段一段數個數。組距切粗切細，形狀會差很多，所以組距本身就是一種選擇。直方圖的柱子按數值順序排、彼此相連，不能像長條圖那樣任意交換位置。",s:"組距會改變形狀；柱子不能換位置。",r:["圖表選擇"]},
 {topic:"road",t:"圖表選擇",k:["該畫哪種圖","選哪種圖","用什麼圖","長條圖","折線圖","哪張圖","圖表種類"],a:"比類別大小用長條圖；看時間變化用折線圖（類別之間不能連線）；看兩個數值有沒有關係用散布圖；看分布形狀用直方圖；看占整體多少才考慮圓餅圖。先看資料長什麼形狀，再決定畫什麼。",s:"資料形狀決定圖：比大小、看趨勢、看關係、看分布。",r:["截斷 y 軸","圓餅圖","直方圖組距"]},
 {topic:"road",t:"資料怎麼來",k:["登錄","資料怎麼來","沒報案","黑數","沒登錄"],a:"交通事故資料是警察處理後登錄的。沒報案、私下和解的小擦撞，常常不會進到資料裡，所以統計數字會比真實事故少（叫「黑數」）。看排行榜之前先問：誰登錄、登錄了什麼、漏掉了誰。",s:"警察登錄的才算；沒報案的是黑數。",r:["抽樣偏誤"]},
 {topic:"road",t:"署所屬機關",k:["署所屬機關","分類單位","不是縣市"],a:"「署所屬機關」不是一個地區，而是警政署底下的專業警察單位（例如負責國道的公路警察）。把它跟縣市放在同一張排行榜或圓餅圖裡，等於拿不同種類的東西比；它的每百件死亡數高，也不能直接說國道最危險，因為它處理的事故類型跟縣市不一樣。",s:"它是警察單位，不是地區，不能直接跟縣市比。",r:["比率與分母"]},
 {topic:"road",t:"圖是翻譯",k:["翻譯","視覺編碼","圖是怎麼"],a:"畫圖就是把數字翻譯成眼睛讀得出來的東西：長度、位置、角度、面積、顏色。人眼比長度和位置最準，比角度和面積比較不準，所以比大小首選長條圖，圓餅圖只適合粗略看占比。",s:"數字→長度、位置、角度；長度最好讀。",r:["圖表選擇","圓餅圖"]},
 {topic:"road",t:"造假 vs 分析選擇",k:["竄改","竄改數字","造假","分析選擇","弄壞資料"],a:"竄改、虛構數字又不說，是資料造假或錯誤；換分母、截軸、只挑一部分樣本，則是分析時的選擇——不一定是欺騙，但會改變結論，所以一定要寫清楚怎麼選、為什麼這樣選。",s:"造假是錯；分析選擇要交代清楚。",r:["截斷 y 軸","抽樣偏誤"]},
 {topic:"road",t:"數字小 ≠ 安全",k:["0人死亡","最安全","件數少","件數最少","凌晨"],a:"數字小不等於安全。連江縣人少車少，一年 0 人死亡可能只是剛好，明年多一件比率就大翻轉——樣本小，比率很不穩。凌晨事故件數少，主要是因為路上車少；換成「同樣多的車流出幾次事」來看，結論可能完全不同。",s:"數字小可能只是樣本小或分母小。",r:["樣本數","比率與分母"]},
 {topic:"road",t:"趨勢怎麼看",k:["一路改善","趨勢","十三年","逐年"],a:"看趨勢要注意三件事：起點選哪一年、中間有沒有改過定義或登錄方式、人口和車輛有沒有變多。只看頭尾兩個點說「一路改善」，可能漏掉中間的起伏；人數下降也可能只是分母變了。",s:"看起點、看定義有沒有變、看分母。",r:["比率與分母"]},

 /* ---------- K-means ---------- */
 {topic:"kmeans",t:"分群",k:["分群","聚類","cluster","clustering","分堆"],a:"把「長得像」的資料自動歸成同一堆，事先沒有標準答案（非監督式）。K-means 是最常見的一種。",s:"把像的資料自動歸堆，沒有標準答案。",r:["K-means"]},
 {topic:"kmeans",t:"K-means",k:["k-means","kmeans","k means","k平均","怎麼運作","怎麼跑","兩個動作"],a:"重複兩步到不再變動：①每個點認領最近的質心；②每個質心搬到自己這群的平均位置。K 是要分幾群，means 指質心＝平均。",s:"認領最近質心＋質心搬到群平均，重複到收斂。",r:["質心","收斂","k 怎麼選"]},
 {topic:"kmeans",t:"質心",k:["質心","中心點","旗子","centroid","小旗"],a:"每一群的中心點（故事裡的旗子），位置永遠等於這群所有點的平均。常常落在沒有任何一個區的位置，就像全班平均身高不一定有人剛好這麼高。",s:"每群的中心＝該群所有點的平均位置。",r:["K-means"]},
 {topic:"kmeans",t:"k 怎麼選",k:["k怎麼選","k 怎麼選","k要怎麼選","k要選","k要幾","要選幾","選幾個","選幾群","要幾群","分幾群","幾群","陡坡","手肘","elbow","k值","選k"],a:"看陡坡圖：橫軸 k、縱軸 WSS。k 越大 WSS 一定越小，所以不能挑最小的，要找從陡降變平緩的「手肘」。也可以參考輪廓係數，最後還要問：分出來的群說得出道理嗎？",s:"找手肘＋看輪廓係數＋說得出道理。",r:["WSS","輪廓係數"]},
 {topic:"kmeans",t:"WSS",k:["wss","群內平方和","總距離","平方和","總拉力","inertia"],a:"每個點到自己質心的距離平方，全部加起來（實驗室叫「總拉力」）。越小代表群越緊；同一個 k 下每跑一輪只會變小或不變。",s:"點到質心距離平方的總和。",r:["k 怎麼選"]},
 {topic:"kmeans",t:"輪廓係數",k:["輪廓係數","silhouette","輪廓"],a:"看每個點「離自己群」比「離最近的別群」近多少，介於 −1 到 1，越大越好。可以拿來比較不同 k 哪個分得比較清楚。",s:"−1～1，越大分得越清楚。",r:["k 怎麼選","CH 與 DB 指數"]},
 {topic:"kmeans",t:"CH 與 DB 指數",k:["ch指數","ch 指數","calinski","db指數","db 指數","davies","bouldin","ari","蘭德"],a:"CH 指數＝群與群之間的分散 ÷ 群內的分散，越大越好；DB 指數看每群和最像它的群有多重疊，越小越好；ARI 要有標準答案才能算，越接近 1 越一致。",s:"CH 越大越好、DB 越小越好、ARI 要有答案。",r:["輪廓係數"]},
 {topic:"kmeans",t:"歐式距離",k:["歐式距離","距離","euclidean","直線距離","畢氏"],a:"K-means 判斷「最近」用歐式距離，就是兩點之間的直線距離（畢氏定理）。所以單位很重要：數字大的欄位會主導距離，要先標準化。",s:"兩點直線距離；單位不同要先標準化。",r:["標準化"]},
 {topic:"kmeans",t:"收斂",k:["收斂","converge","何時停","什麼時候停","停下來","停止"],a:"沒有點想換群、質心也不再移動，就收斂停下來，通常幾輪到十幾輪。但它只保證停在「附近最好」，換個起點可能分得不一樣。",s:"沒人換群就停；只保證附近最好。",r:["換個開局"]},
 {topic:"kmeans",t:"換個開局",k:["開局","起點","初始","隨機起點","每次不一樣","n_init","nstart","局部最小","k-means++"],a:"K-means 只找到起點附近最好的解，所以同一份資料換個起始位置，可能分成不同的群。實務上會多跑幾次、挑 WSS 最小的；K-means++ 讓初始旗子彼此離遠一點，降低爛開局。",s:"換起點可能分得不同，要多跑幾次。",r:["收斂"]},
 {topic:"kmeans",t:"佔比 vs 件數",k:["佔比","比例","百分比","為什麼用比例","件數","成分表"],a:"用佔比是為了比「犯罪的組成形狀」，不是比案件多寡。三重案子是內湖的六倍，但兩張成分表形狀很像，就算同一種區。佔比高也不代表件數多或比較危險。",s:"比組成形狀，不比多寡。",r:["分群 vs 治安"]},
 {topic:"kmeans",t:"分群 vs 治安",k:["治安","危險","犯罪率","安全","最嚴重","比較危險"],a:"分群只講「這裡的犯罪長什麼樣」，不講「這裡多危險」。要談治安，得再看人口數（每十萬人案件數）與時間趨勢。",s:"分群講犯罪長相，不講危險程度。",r:["佔比 vs 件數"]},
 {topic:"kmeans",t:"K-means 的弱點",k:["弱點","缺點","限制","什麼時候會騙","失準","不適合","沒有群","硬分"],a:"它相信平均（怕離群值）、偏好大小差不多的圓形群（怕不平衡、月牙形）、只看你餵的資料（怕抽樣偏誤），而且就算資料根本沒有群，它也會切出 K 群。",s:"怕離群值、不平衡、怪形狀；沒群也會硬切。",r:["離群值","不平衡資料","其他分群方法"]},
 {topic:"kmeans",t:"其他分群方法",k:["dbscan","gmm","階層式","hierarchical","k-medoids","k-modes","譜分群","其他方法","其他分群方法"],a:"群不是圓的用 DBSCAN；想要橢圓形、用機率歸屬用 GMM；不想先決定 K 用階層式分群；怕離群值用 K-medoids；類別資料用 K-modes。",s:"每種方法放寬 K-means 的一個前提。",r:["K-means 的弱點"]},
 {topic:"kmeans",t:"KNN",k:["knn","k近鄰","最近鄰","k nearest","knn和k-means"],a:"KNN 和 K-means 名字像，但完全不同：KNN 是監督式，找最近的 K 個鄰居投票來分類新資料；K-means 是非監督式，K 是要分幾群。",s:"KNN 找鄰居投票（監督）；K-means 分 K 群。",r:["監督式 vs 非監督式"]},
 {topic:"kmeans",t:"PCA",k:["pca","主成分","降維"],a:"PCA 把很多變數濃縮成少數幾個方向，方便畫圖或去掉雜訊，但它本身不分群。變數很多時，常先做 PCA 再分群。",s:"濃縮變數，不分群。"},
 {topic:"kmeans",t:"群編號沒有順序",k:["群編號","第一群","第二群","群的順序","編號"],a:"群的編號（第 1 群、第 2 群、顏色）只是名牌，沒有大小或好壞之分；重跑一次，同樣的群可能換了編號。要看懂一群，得看它的質心長什麼樣子（哪一類犯罪的佔比高）。",s:"編號只是名牌，沒有順序。",r:["質心"]},
 {topic:"kmeans",t:"特徵要選幾個",k:["兩個特徵","幾個特徵","特徵越多","變數越多","特徵夠","選特徵"],a:"特徵不是越多越好：多放跟問題無關的欄位等於加雜訊，而且欄位一多，每兩點的距離都差不多，分群反而變模糊。先想清楚「想比的是什麼」，再挑能回答它的特徵。這個單元只挑幾種主要犯罪的佔比，就是為了讓結果看得懂、說得出道理。",s:"多放無關欄位＝加雜訊。",r:["雜訊","標準化"]},
 {topic:"kmeans",t:"WSS 越小越好？",k:["wss越小","越小越好","總拉力越小"],a:"不是。k 越大，WSS 一定越小；k 等於資料點數時 WSS 是 0，但那等於每個點自成一群，沒有意義。WSS 要搭配 k 一起看：找下降從陡變緩的「手肘」。",s:"k 越大一定越小，要找手肘。",r:["k 怎麼選","WSS"]},
 {topic:"kmeans",t:"分群不證明原因",k:["證明原因","找出原因","原因"],a:"分群只告訴你「哪些區長得像」，不告訴你「為什麼像」。同一群的區犯罪組成相近，可能跟人口結構、交通、警力配置有關，但要找原因得另外收資料、做比較。",s:"分群描述「像」，不解釋「為什麼」。",r:["相關 vs 因果","分群 vs 治安"]},
 {topic:"kmeans",t:"K-means 的應用",k:["k-means還能用在","用在哪","應用","哪裡會用到"],a:"只要想把很多東西「依相似程度分堆」都用得到：商店把顧客分成幾種消費型態、相簿把相似照片歸在一起、把顏色相近的像素合併來壓縮圖片、依症狀把病人分型。重點都一樣：先決定用哪些特徵來比「像不像」。",s:"顧客分型、照片歸類、圖片壓縮、病人分型。",r:["其他分群方法"]},
 {topic:"kmeans",t:"能力雷達圖",k:["雷達圖","五種能力","五種數據能力","能力圖"],a:"雷達圖的五個角是五種數據能力：資料理解、統計推理、不確定性、AI 判讀、因果判斷。越往外代表那一項越穩；空心灰點代表這次沒考到、資料不足。題目少的那一角會被拉向你的整體程度，所以先找明顯縮進來的那一角，那就是下一步要補的。",s:"越外越穩；縮進來的那角先補。",r:["怎麼補強","能力估計"]},

 /* ---------- 迴歸 ---------- */
 {topic:"regression",t:"迴歸",k:["迴歸","回歸","regression","迴歸分析","在做什麼"],a:"用一個變數的變化，去描述或預測另一個變數的變化，並把規則寫成一條直線。它描述「一起變動多少」，本身不證明因果。",s:"用 X 描述／預測 Y，畫成一條線。",r:["迴歸線","自變數與應變數"]},
 {topic:"regression",t:"自變數與應變數",k:["自變數","應變數","解釋變數","依變數","x和y","x 和 y","誰是x","誰是y"],a:"X（自變數、解釋變數）是拿來預測的；Y（應變數）是想被預測、被解釋的。例：用讀書時數（X）預測分數（Y）。放在 X 不代表它就是原因。",s:"X 拿來預測，Y 被預測。",r:["反向因果"]},
 {topic:"regression",t:"散佈圖",k:["散佈圖","散布圖","scatter","一個點代表"],a:"把每個對象的兩個數值畫成一個點（橫軸 X、縱軸 Y）。分析前一定先畫：看得出方向、形狀、離群值，也能發現是不是曲線或分成兩團。",s:"一個點＝一個對象的兩個數值；先畫圖。",r:["安斯庫姆四重奏"]},
 {topic:"regression",t:"迴歸線",k:["迴歸線","最佳直線","最適線","趨勢線","那條線"],a:"最能代表散佈圖的那條直線：讓每個點到線的垂直距離平方加總最小（最小平方法）。它可能一個點都沒穿過。",s:"讓殘差平方和最小的那條線。",r:["最小平方法","斜率","截距"]},
 {topic:"regression",t:"最小平方法",k:["最小平方","最小平方法","least squares","ols","為什麼要平方"],a:"把每個點的殘差平方後加總，挑讓總和最小的那條線。要平方，是因為線上方的正殘差和下方的負殘差直接相加會抵銷；平方也讓離很遠的點影響特別大。",s:"殘差平方和最小；平方避免正負抵銷。",r:["殘差"]},
 {topic:"regression",t:"殘差",k:["殘差","誤差","residual","實際減預測"],a:"殘差＝實際值 − 預測值，就是點到迴歸線的垂直距離（有正負）。正的在線上方、負的在線下方；有截距的迴歸線，殘差全部加起來一定是 0。",s:"實際 − 預測；點到線的垂直距離。",r:["最小平方法"]},
 {topic:"regression",t:"斜率",k:["斜率","slope","b1","陡","每多一","線越陡"],a:"X 每多 1，Y 平均變多少。「預測分數＝38＋7×讀書時數」裡的 7 就是斜率：每多讀一小時平均多 7 分。斜率會隨單位改變，所以線陡不代表關係強。",s:"X 多 1，Y 平均變多少；陡≠強。",r:["截距","相關係數 r"]},
 {topic:"regression",t:"截距",k:["截距","intercept","b0","x等於0","x=0"],a:"X＝0 時的預測值，例如「38＋7×讀書時數」裡的 38。如果 X＝0 遠在資料範圍外（身高 0 公分），截距只是讓線落在對的位置，不需要有現實意義。",s:"X＝0 時的預測值；不一定有意義。",r:["斜率","外推"]},
 {topic:"regression",t:"相關係數 r",k:["相關係數","r值","r 值","pearson","皮爾森","相關強度"],a:"介於 −1 到 +1。正負號看方向（右上或右下），絕對值看強弱（點有多貼近一條直線）。r＝−0.9 和 +0.9 一樣強。它沒有單位，換單位也不變。",s:"正負看方向，絕對值看強弱。",r:["r 接近 0","斜率"]},
 {topic:"regression",t:"r 接近 0",k:["r接近0","r 接近 0","r等於0","沒有關係","0.037","0.04","看不出關係"],a:"r 接近 0 只代表「看不出直線關係」，不代表完全沒關係——先升後降的 U 形、倒 U 形，r 也可能接近 0。房價與生育率的 r＝+0.037，比較好的說法是「這份資料看不出直線關係」。",s:"看不出直線關係 ≠ 完全沒關係。",r:["相關係數 r","安斯庫姆四重奏"]},
 {topic:"regression",t:"負相關",k:["負相關","負的","右下","r是負","負號"],a:"X 越大，Y 大致越小，點從左上往右下。負號只代表方向，不代表弱；r＝−0.85 比 +0.30 強得多。",s:"右下方向；負≠弱。",r:["相關係數 r"]},
 {topic:"regression",t:"決定係數 R²",k:["r平方","r²","r2","決定係數","解釋力"],a:"R² 是 r 的平方，代表 Y 的變動中有幾成能被這條線解釋。r＝0.5 時 R² 只有 0.25，也就是 75% 的變動線說明不了。",s:"Y 的變動有幾成被線解釋。",r:["相關係數 r"]},
 {topic:"regression",t:"預測值",k:["預測值","預測","y hat","ŷ","估計值"],a:"把 X 代入迴歸線算出的值，是「平均傾向」，不是每個人一定會得到的數字。同樣讀 4 小時的人，分數會散在預測值上下。",s:"平均傾向，不是個人保證。",r:["外推","殘差"]},
 {topic:"regression",t:"外推",k:["外推","extrapolation","超出範圍","資料範圍外","122分","預測未來","預測很遠"],a:"拿迴歸線去預測資料範圍以外的情況，那段線沒有資料支撐。例：資料只有讀 1–6 小時，代入 12 小時算出 122 分，超過滿分。離資料中心越遠，預測越不可靠。",s:"超出資料範圍的預測沒有根據。",r:["預測值"]},
 {topic:"regression",t:"安斯庫姆四重奏",k:["安斯庫姆","anscombe","四重奏","0.816","r一樣"],a:"四組資料的平均、r（都是 0.816）、迴歸線幾乎一樣，但一組是直線、一組是曲線、兩組被單一個點左右。教訓：看 r 之前，先把圖畫出來。",s:"r 一樣，圖可以完全不同。",r:["散佈圖"]},
 {topic:"regression",t:"高槓桿點",k:["槓桿","高槓桿","leverage","影響點","influential","極端的點"],a:"X 值遠離其他點的資料，像蹺蹺板最外端的人，只要它的 Y 稍微偏離，就能把整條線撬動。實驗 8 裡 14 個沒關係的人，加 1 個極端的人 r 就飆到很高。",s:"X 很極端的點，能撬動整條線。",r:["離群值"]},
 {topic:"regression",t:"辛普森悖論",k:["辛普森","simpson","分組後相反","合起來相反","補習","每一組"],a:"整體的趨勢，分組之後可能完全相反，而且兩邊都沒算錯。例：全班看起來補習越多分數越低，但分基礎班、精英班看，兩班都是補越多考越好——因為基礎班本來就補得多、分數低。",s:"整體和分組的趨勢可能相反。",r:["混淆變數","樣本組成"]},
 {topic:"regression",t:"樣本組成",k:["組成比例","抽樣比例","小鎮","大城","通勤","改變比例"],a:"兩群各自都沒有關係，但平均位置不同，混在一起就會出現「群與群之間」的假趨勢；調整兩群的比例，r 就跟著變。看到整體的相關，要先問是哪些群混在一起。",s:"混群會製造假相關。",r:["辛普森悖論"]},
 {topic:"regression",t:"實質 vs 名目",k:["實質","名目","通膨","物價","實質房價"],a:"名目房價是當年的價錢；實質房價扣掉物價上漲，看的是「房子真的貴了多少」。跨 20 年比較一定要用實質。",s:"實質＝扣掉通膨。"},
 {topic:"regression",t:"絕對變化 vs 相對變化",k:["絕對變化","相對變化","幾個","幾成","變化率","百分比變化","換個算法","排名會變"],a:"少生幾個（絕對變化）對原本生得多的國家不利；掉了幾成（百分比變化）拿掉起點差異。馬來西亞少了 1.14 個、韓國少 0.48 個，但比例上兩國都掉了約四成。",s:"換算法，排名就可能翻轉。"},
 {topic:"regression",t:"房價與生育率",k:["房價","生育率","不敢生","少子化","台灣房價"],a:"把 35 國攤開看，實質房價漲幅和生育率變化的 r 只有 +0.037，幾乎是 0。台灣房價漲最多、生育率也大跌，但韓國房價只漲約 25%，生育率一樣大跌——單一國家撐不起「房價是元兇」的結論。",s:"35 國 r＝+0.037，看不出直線關係。",r:["r 接近 0","相關 vs 因果"]},
 {topic:"regression",t:"多重比較",k:["多重比較","測很多變數","挑最高","p-hacking","p hacking","試很多次"],a:"一次測 20 個變數、只報告 r 最高的那個，光靠巧合也可能出現看起來很強的關係。報告要說清楚總共試了幾個。",s:"試越多，巧合越容易被當真。"},
 {topic:"regression",t:"p 值",k:["p值","p 值","p-value","顯著","顯著性"],a:"p 值是「如果其實沒有關係，還會看到這麼強（或更強）的結果」的機率。p 小代表不太像巧合，但不代表關係很強、更不代表因果。",s:"不像巧合的程度，不是關係強度。",r:["多重比較"]},
 {topic:"regression",t:"單一個案",k:["一國","單一國家","一個例子","個案"],a:"一個例子（一個國家、一個朋友、一則新聞）撐不起一般的結論，因為例外永遠找得到。台灣房價漲最多、生育率也大跌，但韓國房價只漲約 25%，生育率一樣大跌。要把很多例子攤開來看整體。",s:"一個例子撐不起結論。",r:["房價與生育率","相關 vs 因果"]},

 /* ---------- 決策樹 ---------- */
 {topic:"tree",t:"決策樹",k:["決策樹","decision tree","樹是什麼","怎麼運作"],a:"像玩二十個問題：從最上面的問題開始，依答案往左或往右，一路問到樹葉，樹葉裡的比例就是答案。電腦用資料自己決定要先問哪一題。",s:"一路問是非題，問到樹葉得出答案。",r:["根節點與樹葉","不純度"]},
 {topic:"tree",t:"根節點與樹葉",k:["根節點","節點","樹葉","葉節點","內部節點","leaf","root","node"],a:"最上面、還沒被篩選的叫根節點（第一個問題）；中間繼續分岔的叫內部節點；最底下不再問的叫樹葉，裡面的比例就是預測。",s:"根＝第一題；葉＝答案。",r:["決策樹"]},
 {topic:"tree",t:"不純度",k:["不純度","純度","亂度","impurity","切得乾淨"],a:"一群人裡答案有多混雜。全部都去或全部都不去＝很純（0）；一半一半＝最亂，最難預測。決策樹每一步都挑讓不純度下降最多的問題。",s:"答案有多混；一半一半最亂。",r:["Gini 不純度","熵"]},
 {topic:"tree",t:"Gini 不純度",k:["gini","吉尼","基尼","gini不純度"],a:"Gini＝1 − 各類比例的平方和。兩類時最大是 0.5（剛好一半一半），全部同一類是 0。第 4 站的滑桿就是在看這條線。",s:"兩類時最大 0.5，全同類為 0。",r:["不純度","熵"]},
 {topic:"tree",t:"熵",k:["熵","entropy","資訊熵","資訊增益","資訊獲利","information gain","gini和熵"],a:"另一種量不純度的方法，兩類一半一半時最大是 1。熵下降的量叫資訊增益。Gini 和熵大多數時候會選出差不多的問題。",s:"另一把不純度的尺；一半一半＝1。",r:["Gini 不純度"]},
 {topic:"tree",t:"為什麼先問「明天要早起」",k:["早起","第一個問題","先問哪","最上面","根節點是"],a:"電腦把五個條件都拿來切一次，「明天要早起」切完兩堆最整齊（不純度下降最多），所以被放在最上面。這只代表它最能把這 40 個人分開，不代表早起「造成」大家不去夜市。",s:"它切得最乾淨，不代表它是原因。",r:["貪婪分裂","相關 vs 因果"]},
 {topic:"tree",t:"貪婪分裂",k:["貪婪","greedy","每一步最好","全域最佳"],a:"每一步只挑眼前讓不純度下降最多的問題，不回頭、不考慮之後兩層的後果。速度快，但整棵樹不保證是全世界最好的那一棵。",s:"每步只看眼前最好，不保證全域最佳。"},
 {topic:"tree",t:"過度配適",k:["過度配適","過擬合","過度擬合","overfitting","overfit","背答案","太深","越深"],a:"樹一直長到每片葉子只剩一兩個人，等於把訓練資料（連雜訊）背起來了，換一批新的人就答得很差。深度越深，訓練資料越漂亮，新資料不一定更準。",s:"背答案：訓練好看，新資料很差。",r:["剪枝","訓練集與測試集"]},
 {topic:"tree",t:"剪枝",k:["剪枝","pruning","max_depth","深度上限","min_samples","ccp"],a:"防止過度配適的方法。預先剪枝：限制深度、每片葉子至少幾人；後剪枝：先長完再把不划算的枝剪掉（成本複雜度剪枝）。",s:"限制樹的大小，避免背答案。",r:["過度配適"]},
 {topic:"tree",t:"訓練集與測試集",k:["訓練集","測試集","驗證集","交叉驗證","cross validation","train","test"],a:"用一部分資料長樹（訓練集），留另一部分沒看過的資料來考它（測試集），才知道它對新資料準不準。交叉驗證是輪流當測試集，結果更穩。",s:"用沒看過的資料考模型。",r:["過度配適"]},
 {topic:"tree",t:"準確率與基準線",k:["準確率","accuracy","基準線","baseline","八成","很準"],a:"準確率高不一定好，先問基準線：如果本來就有六成的人不去，「永遠猜不去」也有六成準。資料越不平衡，準確率越會騙人。",s:"先和「全猜多數」比。",r:["精確率與召回率","不平衡資料"]},
 {topic:"tree",t:"精確率與召回率",k:["精確率","召回率","precision","recall","f1","混淆矩陣","偽陽性","偽陰性"],a:"召回率：真的會去的人裡，抓到幾成；精確率：猜會去的人裡，真的去了幾成。兩者常常此消彼長，F1 是兩者的綜合。資料不平衡時要看這些，不能只看準確率。",s:"召回＝抓到幾成；精確＝猜對幾成。",r:["準確率與基準線"]},
 {topic:"tree",t:"門檻",k:["門檻","閾值","threshold","0.5"],a:"樹葉給的是機率（例如 70% 會去），再跟門檻（通常 0.5）比較變成「去／不去」。門檻調低會抓到更多會去的人（召回率上升），但誤判也變多。",s:"機率 → 決定的切點，可以調。",r:["精確率與召回率"]},
 {topic:"tree",t:"葉節點的機率",k:["葉子比例","葉節點機率","預測機率","機率怎麼來","葉子裡的比例"],a:"葉子裡的比例，就是訓練資料裡落在那片葉子的人有幾成會去。葉子裡人越少，這個比例越不可靠——只有 5 個人的 40%，誤差非常大，報告時要附上人數。",s:"葉子裡的比例；人少就不可靠。"},
 {topic:"tree",t:"沒出現的條件",k:["沒出現","沒被選","沒用的條件","特徵遮蔽","共線"],a:"沒出現在樹上不代表沒用，可能只是被意思很像的條件先選走了（例如「明天要早起」和「明天有早八」）。拿掉先被選的那個，另一個就可能冒出來。",s:"可能是被相似條件搶先了。"},
 {topic:"tree",t:"樹不穩定",k:["不穩定","高變異","拿掉五個人","資料少一點","樹變了","一樣可信"],a:"決策樹對資料很敏感：拿掉幾個人、多一個怪咖，第一個問題就可能換人，整棵樹跟著變。這叫高變異，也是實務上常改用隨機森林的原因。",s:"資料小改，樹就大變。",r:["隨機森林"]},
 {topic:"tree",t:"隨機森林",k:["隨機森林","random forest","整體學習","ensemble","梯度提升","xgboost","boosting","bagging"],a:"一次長很多棵樹（每棵用不同的抽樣和條件），再讓它們投票。單棵樹不穩，很多棵平均起來就穩多了。梯度提升則是一棵接一棵，每棵修正前面的錯。",s:"很多棵樹投票，比一棵穩。",r:["樹不穩定"]},
 {topic:"tree",t:"迴歸樹",k:["迴歸樹","regression tree","預測數字的樹","cart","也能預測數字"],a:"決策樹也能預測數字：樹葉輸出那群人的平均值，分裂時改看誤差（MSE）下降多少。本單元用的 CART 演算法，分類和迴歸都能做。",s:"樹葉輸出平均值，就能預測數字。"}
];

/* ==================== 以下不用改 ==================== */
const ME=document.currentScript;
const TOPIC=(ME&&ME.dataset.topic)||"home";
const TP=CONFIG.TOPICS[TOPIC]||CONFIG.TOPICS.home;
const BOTTOM=+((ME&&ME.dataset.bottom)||16);
const TOPIC_NAME={kmeans:"K-means",regression:"迴歸",tree:"決策樹",road:"資料視覺化"};
const BYT={};KB.forEach(e=>BYT[e.t]=e);
/* 目前在哪一站：頁面設 window.STT_STATION 並發出 "stt-station" 事件；沒有的話看 script 的 data-station */
let station=window.STT_STATION||(ME&&ME.dataset.station)||null;
function stationChips(){
  const own=(CONFIG.STATIONS[TOPIC]||{})[station], com=CONFIG.STATIONS.common[station];
  return own||com||TP.chips;
}
const logEv=(n,d)=>{try{ if(typeof LOG!=="undefined"&&LOG.ev) LOG.ev(n,d); }catch(e){}};
const snd=k=>{try{ if(typeof Sound!=="undefined"&&Sound[k]) Sound[k](); }catch(e){}};

/* ---------- 樣式（全部限定在 .stt 底下，不影響頁面） ---------- */
const css=`
.stt-fab{position:fixed;right:16px;bottom:${BOTTOM}px;z-index:9990;border:0;border-radius:999px;background:var(--stt);color:#fff;
  font:700 14px/1.2 'Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif;padding:12px 17px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.22);transition:transform .12s,filter .15s}
.stt-fab:hover{filter:brightness(1.08);transform:translateY(-1px)} .stt-fab:active{transform:scale(.96)}
.stt-fab[hidden],.stt[hidden]{display:none}
.stt{position:fixed;right:16px;bottom:${BOTTOM}px;z-index:9991;width:min(370px,calc(100vw - 32px));height:min(540px,calc(100vh - ${BOTTOM+16}px));
  background:#fff;color:#1f2328;border:1px solid #dcd8d0;border-radius:16px;box-shadow:0 12px 44px rgba(0,0,0,.25);display:flex;flex-direction:column;overflow:hidden;
  font:14px/1.65 'Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif;text-align:left}
.stt *{box-sizing:border-box}
.stt-h{background:var(--stt);color:#fff;padding:11px 14px;display:flex;align-items:center;gap:8px}
.stt-h b{font-size:14.5px;flex:1} .stt-h small{opacity:.85;font-size:11.5px;font-weight:500}
.stt-h button{border:0;background:transparent;color:#fff;font-size:20px;cursor:pointer;line-height:1;padding:0 2px}
.stt-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:9px;background:#faf8f5}
.stt-m{max-width:88%;padding:9px 12px;border-radius:12px;font-size:13.5px;white-space:pre-wrap;word-break:break-word}
.stt-m.bot{background:#fff;border:1px solid #e4e0d8;align-self:flex-start}
.stt-m.me{background:var(--stt);color:#fff;align-self:flex-end}
.stt-think{color:#5b6168}.stt-dots i{font-style:normal;display:inline-block;animation:stt-dot 1.2s infinite both;font-weight:900}
.stt-dots i:nth-child(2){animation-delay:.2s}.stt-dots i:nth-child(3){animation-delay:.4s}
@keyframes stt-dot{0%,80%,100%{opacity:.2;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.stt-sec{font-size:12px;opacity:.6}.stt-hint{font-size:12.5px;opacity:.75;margin-top:4px}.stt-hint:empty{display:none}
@media (prefers-reduced-motion:reduce){.stt-dots i{animation:none;opacity:.6}}
.stt-m.sum{background:#fff7ec;border-color:#f2dcbb;max-width:96%}
.stt-key{align-self:flex-start;max-width:88%;font-size:12.5px;color:var(--stt);background:var(--stt-lt);border-radius:10px;padding:6px 11px}
.stt-tag{align-self:flex-start;font-size:11.5px;color:#7a7f86;background:#f0efec;border-radius:8px;padding:3px 9px}
.stt-row{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:96%}
.stt-row button,.stt-chips button{border:1px solid #dcd8d0;background:#fff;border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer;color:#5b6168}
.stt-row button:hover,.stt-chips button:hover{border-color:var(--stt);color:#1f2328}
.stt-row.link button{border-color:var(--stt);color:var(--stt);background:var(--stt-lt);font-weight:600}
.stt-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px 0;background:#faf8f5}
.stt-chips button.hl{border-color:var(--stt);color:var(--stt);font-weight:700}
.stt-ch{flex:1 1 100%;font-size:11.5px;font-weight:700;color:var(--stt)}
.stt-note{font-size:11px;color:#7a7f86;padding:6px 12px 8px;background:#faf8f5}
.stt-f{display:flex;gap:6px;padding:10px 12px;border-top:1px solid #e4e0d8;background:#fff}
.stt-f input{flex:1;min-width:0;border:1px solid #dcd8d0;border-radius:9px;padding:8px 10px;font:inherit;font-size:13.5px;color:#1f2328;background:#fff}
.stt-f button,.stt-kf button{border:0;border-radius:9px;background:var(--stt);color:#fff;font:inherit;font-weight:700;padding:8px 14px;cursor:pointer}
.stt-kf{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.stt-kf input{flex:1 1 100%;border:1px solid #dcd8d0;border-radius:8px;padding:6px 9px;font:inherit;font-size:12.5px}
.stt-kf button{padding:6px 12px;font-size:12px} .stt-kf button.lk{background:#ece7df;color:#1f2328}
.stt button:focus-visible,.stt input:focus-visible,.stt-fab:focus-visible{outline:3px solid #e8912a;outline-offset:2px}
@media (prefers-reduced-motion:reduce){.stt-fab{transition:none}}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

/* ---------- 畫面 ---------- */
const fab=document.createElement("button");
fab.className="stt-fab";fab.type="button";fab.textContent="🤖 問問小助教";
const panel=document.createElement("div");
panel.className="stt";panel.hidden=true;panel.setAttribute("role","dialog");panel.setAttribute("aria-label",CONFIG.NAME);
panel.innerHTML='<div class="stt-h"><b>🤖 '+CONFIG.NAME+'</b><small></small><button type="button" aria-label="關閉">×</button></div>'+
  '<div class="stt-log" aria-live="polite"></div><div class="stt-chips"></div><div class="stt-note"></div>'+
  '<form class="stt-f"><input type="text" placeholder="問我一個統計名詞…" autocomplete="off" aria-label="問題"><button type="submit">送出</button></form>';
[fab,panel].forEach(el=>{el.style.setProperty("--stt",TP.color);el.style.setProperty("--stt-lt",TP.color+"18");});
document.body.appendChild(fab);document.body.appendChild(panel);
const $=s=>panel.querySelector(s);
const log=$(".stt-log"),chips=$(".stt-chips"),note=$(".stt-note"),form=$(".stt-f"),input=$(".stt-f input"),badge=$(".stt-h small");
badge.textContent=TOPIC==="home"?"":TP.name;
function scroll(){log.scrollTop=log.scrollHeight;}
function add(text,who,cls){const d=document.createElement("div");d.className="stt-m "+(who||"bot")+(cls?" "+cls:"");d.textContent=text;log.appendChild(d);scroll();return d;}
function small(text,cls){const d=document.createElement("div");d.className=cls||"stt-key";d.textContent=text;log.appendChild(d);scroll();return d;}
function buttons(list,cls){const d=document.createElement("div");d.className="stt-row"+(cls?" "+cls:"");
  list.forEach(([label,fn])=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=fn;d.appendChild(b);});
  log.appendChild(d);scroll();return d;}

/* ---------- 知識庫比對 ---------- */
function norm(s){return (s||"").toLowerCase().replace(/[\s，。、？！?!,.~～：:；;「」『』（）()"'＂]/g,"").replace(/^(請問|請教|想問|問一下)/,"");}
const HI=["你好","哈囉","hi","hello","嗨","在嗎","有人嗎","安安"],THX=["謝謝","感謝","thank","thx","3q","感恩"];
function bigrams(s){const o=new Set();for(let i=0;i<s.length-1;i++)o.add(s.slice(i,i+2));return o;}
function match(q){
  const n=norm(q);
  if(!n) return {a:"打幾個字問我吧，例如「什麼是離群值」。",hit:true};
  if(n.length<=6&&HI.some(h=>n.includes(norm(h)))) return {a:TP.hello+"\n試著問我："+stationChips().join("、"),hit:true};
  if(n.length<=8&&THX.some(h=>n.includes(norm(h)))) return {a:"不客氣～還想知道什麼都可以問。",hit:true};
  let best=null,bs=0;
  KB.forEach(e=>{let sc=0;
    e.k.concat([e.t]).forEach(key=>{const kk=norm(key);if(kk&&n.includes(kk))sc=Math.max(sc,kk.length*2+2);});
    if(sc){ if(e.topic===TOPIC)sc+=3; else if(e.topic==="common")sc+=1; }
    if(sc>bs){bs=sc;best=e;}});
  if(!best&&n.length>=3){   // 打錯字時：用兩字片段的重疊程度找最像的名詞
    const qb=bigrams(n);
    KB.forEach(e=>e.k.forEach(key=>{const kb=bigrams(norm(key));if(kb.size<2)return;
      let hit=0;kb.forEach(g=>{if(qb.has(g))hit++;});const sc=hit/kb.size;
      if(sc>=0.67&&sc>bs){bs=sc;best=e;}}));
  }
  if(best) return {a:best.a,hit:true,entry:best};
  return {a:"這題超出我的知識庫了。",hit:false};
}

/* ---------- 「整理剛剛問的」 ---------- */
const notes=[];let sumBtn=null;
function remember(e){if(!e||notes.includes(e))return;notes.push(e);
  if(!sumBtn){sumBtn=document.createElement("button");sumBtn.type="button";sumBtn.className="hl";sumBtn.onclick=summarize;chips.appendChild(sumBtn);}
  sumBtn.textContent="📝 整理剛剛問的（"+notes.length+"）";}
function summarize(){
  const txt="📝 這次問過的重點\n"+notes.map(e=>"• "+e.t+"："+e.s).join("\n");
  add(txt,"bot","sum");
  buttons([["複製",function(){const b=this;try{navigator.clipboard.writeText(txt).then(()=>b.textContent="已複製 ✓",()=>b.textContent="請手動選取複製");}catch(e){b.textContent="請手動選取複製";}}]]);
  logEv("tutor_summary",{n:notes.length});
}

/* ---------- AI ---------- */
const AI={key:null,builtin:false};
if(CONFIG.AI.ENABLED&&CONFIG.AI.ALLOW_KEY){try{AI.key=localStorage.getItem("stt_ai_key")||localStorage.getItem("km_ai_key")||null;}catch(e){}}
const SYS="你是「全民數據科學實驗室」的統計科普小助教，對象是沒有統計背景的一般民眾和中學生。"+TP.context+
  "請用繁體中文（台灣用語）、白話、最多 4 句話回答，多用生活例子、少用公式；不確定就說不確定。"+
  "問題和統計、資料、機器學習完全無關時，簡短說明這不是你負責的範圍。";
const aiReady=()=>CONFIG.AI.ENABLED&&(!!CONFIG.AI.PROXY_URL||AI.builtin||!!AI.key);
(async function(){
  if(!CONFIG.AI.ENABLED||!CONFIG.AI.ALLOW_BUILTIN)return;
  try{const LM=window.LanguageModel;
    if(LM&&LM.availability){const a=await LM.availability();AI.builtin=(a&&a!=="unavailable");}}catch(e){}
})();
async function viaProxy(q){
  // 等超過 45 秒就放棄，改走下一條路（避免學生一直等；實測多數 3–5 秒，偶爾 30 秒以上）
  const ac=window.AbortController?new AbortController():null;const tm=ac?setTimeout(()=>ac.abort(),45000):0;
  let r;try{r=await fetch(CONFIG.AI.PROXY_URL,{method:"POST",credentials:"omit",redirect:"follow",signal:ac?ac.signal:undefined,
    headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"ask",topic:TOPIC,q:q.slice(0,300)})});}
  catch(e){throw new Error(e&&e.name==="AbortError"?"AI 想太久了，先看看下面的連結":(e.message||"連不到 AI"));}
  finally{clearTimeout(tm);}
  const t=await r.text();let j;try{j=JSON.parse(t);}catch(e){throw new Error("代理回應看不懂："+t.slice(0,60));}
  if(!j.ok)throw new Error(j.error||"代理沒有回答");return j.text;
}
async function viaBuiltin(q){
  const s=await window.LanguageModel.create({initialPrompts:[{role:"system",content:SYS}]});
  try{return await s.prompt(q);}finally{try{s.destroy();}catch(e){}}
}
async function viaGemini(q){
  let last;
  for(const m of["gemini-2.5-flash","gemini-2.0-flash","gemini-flash-latest"]){
    try{const res=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+m+":generateContent?key="+encodeURIComponent(AI.key),
        {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({system_instruction:{parts:[{text:SYS}]},
          contents:[{role:"user",parts:[{text:q}]}],generationConfig:{maxOutputTokens:500,temperature:0.4}})});
      if(!res.ok){last=new Error("Gemini "+res.status);continue;}
      const j=await res.json();
      const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts)||[]).map(p=>p.text||"").join("").trim();
      if(t)return t;last=new Error("Gemini 沒有回覆內容");
    }catch(e){last=e;}
  }
  throw last||new Error("Gemini 呼叫失敗");
}
async function askAI(q){
  const errs=[];
  if(CONFIG.AI.PROXY_URL){try{const t=await viaProxy(q);if(t)return{text:t.trim(),via:"老師設定的 AI"};}catch(e){errs.push(e.message);}}
  if(AI.builtin){try{const t=await viaBuiltin(q);if(t&&t.trim())return{text:t.trim(),via:"瀏覽器內建 AI"};}catch(e){errs.push("內建 AI："+e.message);}}
  if(AI.key){try{return{text:await viaGemini(q),via:"Gemini"};}catch(e){errs.push(e.message);}}
  throw new Error(errs.join("／")||"沒有可用的 AI");
}
function keyForm(){
  const d=add("","bot");
  d.innerHTML="接上 <b>Google Gemini</b>，我答不出來的題目就能直接問它：<br>1. 到 <b>aistudio.google.com/apikey</b> 用 Google 帳號免費申請金鑰<br>2. 貼在下面按「連接」<br>"+
    "<span style='color:#7a7f86;font-size:12px'>金鑰只存在你這台電腦的瀏覽器，不會寫進檔案、也不會傳給別人。</span>";
  const w=document.createElement("div");w.className="stt-kf";
  const ip=document.createElement("input");ip.type="password";ip.placeholder="貼上 Gemini API 金鑰（AIza…）";
  const ok=document.createElement("button");ok.type="button";ok.textContent="連接";
  const lk=document.createElement("button");lk.type="button";lk.className="lk";lk.textContent="開啟申請頁";
  lk.onclick=()=>window.open("https://aistudio.google.com/apikey","_blank","noopener");
  ok.onclick=()=>{const v=ip.value.trim();if(!v)return;AI.key=v;try{localStorage.setItem("stt_ai_key",v);}catch(e){}
    w.remove();add("✅ 已連上 Gemini。我答不出來的題目會直接問它。（要斷開：再按「🔌 AI」）");refreshNote();logEv("tutor_ai_connect",{});};
  w.append(ip,ok,lk);d.appendChild(w);scroll();
}
function aiMenu(){
  if(CONFIG.AI.PROXY_URL){add("老師已經幫這個網站接好 AI，不用自己申請金鑰。");return;}
  if(AI.key){AI.key=null;try{localStorage.removeItem("stt_ai_key");localStorage.removeItem("km_ai_key");}catch(e){}
    add("已斷開 Gemini。"+(AI.builtin?"還有瀏覽器內建 AI 可用。":"答不出來時改給你搜尋連結。"));refreshNote();return;}
  if(AI.builtin)add("你的瀏覽器有內建 AI，我答不出來時會直接問它，不用金鑰。想改用 Gemini 再往下貼：");
  if(CONFIG.AI.ALLOW_KEY)keyForm();
}
function refreshNote(){
  note.textContent=aiReady()?"先查知識庫；查不到就問 AI（AI 的回答可能有誤）。":
    "先查知識庫；查不到會給你搜尋連結"+(CONFIG.AI.ENABLED&&CONFIG.AI.ALLOW_KEY?"，或按「🔌 AI」接上 AI。":"。");
}

/* ---------- 問答流程 ---------- */
function related(e){
  const list=(e.r||[]).map(t=>BYT[t]).filter(x=>x&&!notes.includes(x)).slice(0,3);
  if(list.length)buttons(list.map(x=>["💡 "+x.t,()=>ask(x.t)]));
}
function links(q){
  const enc=encodeURIComponent(q+" 統計");
  buttons([["🔍 Google 搜尋",()=>window.open("https://www.google.com/search?q="+enc,"_blank","noopener")],
           ["💬 ChatGPT",()=>window.open("https://chatgpt.com/?q="+encodeURIComponent(q),"_blank","noopener")]],"link");
}
function ask(q){
  add(q,"me");snd("step");
  setTimeout(async()=>{
    const r=match(q);
    logEv("hint_ask",{q:q.slice(0,80),hit:r.hit,concept:r.entry?r.entry.t:"",topic:TOPIC});
    if(r.hit){
      add(r.a);
      if(r.entry){small("🔑 一句話："+r.entry.s);
        if(r.entry.topic!=="common"&&r.entry.topic!==TOPIC)small("這是〈"+TOPIC_NAME[r.entry.topic]+"〉主題的內容","stt-tag");
        remember(r.entry);related(r.entry);}
      return;
    }
    if(aiReady()){
      // 2026-11-11：等待時有跳動的點點＋秒數，久了給安心的話（AI 多半 3–5 秒，偶爾 30 秒）
      const wait=add("");wait.classList.add("stt-think");
      wait.innerHTML='🤔 知識庫裡沒有，AI 思考中<span class="stt-dots"><i>.</i><i>.</i><i>.</i></span> <span class="stt-sec"></span><div class="stt-hint"></div>';
      const t0=Date.now(),sec=wait.querySelector(".stt-sec"),hint=wait.querySelector(".stt-hint");
      const tick=setInterval(()=>{const s=Math.round((Date.now()-t0)/1000);sec.textContent=s>=2?s+" 秒":"";
        hint.textContent=s>=25?"快好了，再撐一下 🙏（超過 45 秒會改給你查詢連結）":s>=10?"這題 AI 想得比較久，通常再幾秒就好～":"";if(s>=10)scroll();},1000);
      wait.remove=(r=>function(){clearInterval(tick);r.call(this);})(wait.remove);
      try{const ai=await askAI(q);wait.remove();add(ai.text);small("🌐 由"+ai.via+"回答，可能有誤，重要的事請再查證。","stt-tag");logEv("tutor_ai",{ok:1,via:ai.via});}
      catch(e){wait.remove();add("連 AI 失敗了（"+e.message.slice(0,80)+"）。先用下面的連結：");links(q);logEv("tutor_ai",{ok:0});}
    }else{
      add(r.a+"可以換個說法，或用下面的連結查：");links(q);
      if(CONFIG.AI.ENABLED&&CONFIG.AI.ALLOW_KEY)buttons([["🔌 讓我直接問 AI",aiMenu]]);
    }
  },200);
}
let greeted=false;
function renderChips(){
  chips.innerHTML="";
  const sn=CONFIG.STATION_NAME[station];
  if(sn){const h=document.createElement("span");h.className="stt-ch";h.textContent="📍 "+sn+" 常見問題";chips.appendChild(h);}
  stationChips().forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t;b.onclick=()=>ask(t);chips.appendChild(b);});
  if(CONFIG.AI.ENABLED&&CONFIG.AI.ALLOW_KEY){const b=document.createElement("button");b.type="button";b.className="hl";b.textContent="🔌 AI";b.onclick=aiMenu;chips.appendChild(b);}
  if(sumBtn)chips.appendChild(sumBtn);
}
window.addEventListener("stt-station",e=>{const s=e.detail||null;if(s===station)return;station=s;if(greeted)renderChips();});
function open(){
  panel.hidden=false;fab.hidden=true;snd("click");
  if(!greeted){greeted=true;add(TP.hello);
    if(aiReady())small("已接上 AI：知識庫查不到的題目會直接問它。","stt-tag");
    renderChips();
    refreshNote();logEv("tutor_open",{topic:TOPIC,station:station||""});}
  setTimeout(()=>{try{input.focus();}catch(e){}},60);
}
function close(){panel.hidden=true;fab.hidden=false;fab.focus();}
fab.onclick=open;
$(".stt-h button").onclick=close;
panel.addEventListener("keydown",e=>{if(e.key==="Escape")close();});
form.addEventListener("submit",e=>{e.preventDefault();const q=input.value.trim();if(!q)return;input.value="";ask(q);});
window.StatTutor={open,ask,KB,CONFIG,match,chips:stationChips};
if(/[?&]tutor=open/.test(location.search))setTimeout(open,300);   // 網址加 ?tutor=open 會直接打開小助教
})();
