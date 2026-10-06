"""Capture source bindings for nine manually reviewed lessons; not all-course certification."""
from pathlib import Path
import concurrent.futures,urllib.request,json,re,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'qa/v653/20261005/lessons/online-20261006';lessons=json.loads((OUT/'lesson-snapshot.json').read_text())
checks=[
(['w2d1b2'],'https://supersimple.com/song/shape-song-1/','官方主課列出圓形、菱形、正方形、愛心；本課只在影片中等待圓形與正方形，星形、三角形已明確安排於片後圖卡。步驟、暫停提問與分齡目標沒有要求原片唱未出現的形狀。'),
(['w2d2b2'],'https://supersimple.com/song/shapes-i-see-at-the-beach/','原歌主題為橢圓、星形、長方形；教案只要求在主課找星形，其他圖卡與孩子自選顏色是片後活動，也明說不可把橢圓叫成圓形。'),
(['w6d5b2'],'https://supersimple.com/song/five-little-ghosts/','官方故事逐次少一隻返回，最後全數回家；本課數返回群體，之後另做一加三的玩具合作，沒有把加法誤稱為原歌算式，也區分歌中沒有返回與數詞零。'),
(['w9d3b2'],'https://supersimple.com/song/where-is-the-cat/','官方歌詞的確使用床、桌子、椅子作位置場景；中文一拍與兩拍安排在片後，教案明說不能按中文字數拆英文音節。'),
(['w12d1b1','w12d3b2'],'https://supersimple.com/song/a-is-for-apple/','原歌D對應洋娃娃。兩堂均明說狗是本頁圖卡的片後延伸，不要求回影片找狗；字母唱名、英文單字和中文名稱分開教，分齡任務允許先指圖或單詞。'),
(['w15d3b2'],'https://www.youtube.com/watch?v=vcUyDAO1Fk0','已讀同videoId官方YouTube player的shortDescription與其歌詞：太空、月亮、星星、火箭均有來源；本課把天體與環境分組，分清歌曲想像旅行與月相補充，不把太空當第三顆星。'),
(['w18d2b2'],'https://supersimple.com/song/i-love-my-pet/','官方內容對應狗的腳掌、魚鰭、鳥翅。教案用肢體手勢與有無翅膀分類，明說腿的完整句為延伸，不以歌詞重複次數當卡片數量。'),
(['w18d5b2'],'https://supersimple.com/song/this-is-the-way-we-make-friends/','官方主題包括招呼、分享、輪流、唱玩與道別；教案將請求與感謝留在片後，並把題目順序和真正表演的開場至收尾順序分開，未要求補寫過去紀錄。')]
def fetch(check):
 ids,url,assessment=check;selected=[b for b in lessons if b['id'] in ids];expected=selected[0]['video']['videoId'];req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 curriculum-source-audit'});response=urllib.request.urlopen(req,timeout=25);raw=response.read();text=raw.decode();row={'blocks':ids,'url':response.url,'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'httpStatus':response.status,'responseSHA256':hashlib.sha256(raw).hexdigest(),'expectedVideoId':expected,'exactVideoIdPresent':expected in text,'manualAssessment':assessment,'reviewedFields':['title','video topics','videoAnchor','pausePrompts','steps','younger','older','mission criteria'],'notClaimed':['Full video watched','All 180 lessons semantically certified'],'curriculumChanged':False}
 if 'youtube.com/watch' in url:
  m=re.search(r'ytInitialPlayerResponse\s*=\s*',text);data,_=json.JSONDecoder().raw_decode(text[m.end():]);v=data['videoDetails'];desc=v['shortDescription'];row.update(officialTitle=v['title'],descriptionSHA256=hashlib.sha256(desc.encode()).hexdigest(),exactVideoIdPresent=v['videoId']==expected,sourceDescriptionTerms={word:bool(re.search(r'\b'+word+r'\b',desc,re.I)) for word in ['space','moon','stars','rocket']})
 row['status']='NO_CLEAR_CONTRADICTION_IN_REVIEWED_SCOPE' if row['exactVideoIdPresent'] else 'SOURCE_BINDING_UNCONFIRMED';return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(fetch,checks))
report={'scope':'Nine targeted lesson reviews against eight exact official source bindings; source text and caregiver guidance only, not full video watching or whole-course semantic certification.','reviewedLessonCount':sum(len(r['blocks']) for r in rows),'sources':rows,'clearContradictions':[],'productionChanges':[]};(OUT/'targeted-semantic-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
for row in rows:print(row['blocks'],row['status'],row['exactVideoIdPresent'])
