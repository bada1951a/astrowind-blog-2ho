// =========================================================================
// 📌 [고정 식별자] 이 파일은 '2호기' 전용 스크립트입니다.
// ⚠️ [혼동 방지 경고]
// 1. 이 파일은 '2호기 (Life & Tech)'입니다. 향후 나올 '2-2호기'와 절대 혼동하지 말 것!
// 2. 카테고리는 대표님의 지시 전까지 'life-tech'로 영구 고정한다. (임의 변경 절대 금지)
// 3. 이미지 생성 방식은 Picsum 동적 시드 URL 방식을 영구 유지한다.
// 4. 대표님과의 모든 설명, 질문, 대화 및 주석은 반드시 100% 한국어로만 진행한다.
// =========================================================================

import fs from 'fs';
import path from 'path';


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');

// =========================================================================
// [2ho호기] Pexels 검색과 Picsum 안전 대체
// =========================================================================
// =========================================================================
// Pexels topic-matched photos with a non-breaking Picsum fallback.
// Pexels API results expose alt text, not a tags array; search relevance is the primary match.
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_IMAGE_CACHE = new Map();
let pexelsFallbackWarningShown = false;
const PEXELS_LOCALE_BY_LANG = {
  ko: 'ko-KR', en: 'en-US', ja: 'ja-JP', de: 'de-DE', fr: 'fr-FR',
  es: 'es-ES', it: 'it-IT', pt: 'pt-BR', nl: 'nl-NL', pl: 'pl-PL',
  id: 'id-ID', vi: 'vi-VN'
};

function getPicsumFallback(topic, index) {
  const seedBase = Date.now().toString(36);
  const coverSeed = 'mob-' + seedBase + '-' + index + '-c';
  const bodySeed = 'mob-' + seedBase + '-' + index + '-b';
  return {
    coverUrl: 'https://picsum.photos/seed/' + coverSeed + '/1200/675.jpg',
    bodyUrl: 'https://picsum.photos/seed/' + bodySeed + '/1000/550.jpg',
    bodyAlt: topic + ' guide'
  };
}

function imageTopicTerms(topic) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'about', 'what', 'when', 'how', 'guide', 'problem']);
  return String(topic || '').toLowerCase().split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !stopWords.has(term));
}

async function getPostImages(topic, index, langCode = 'en') {
  const fallback = () => getPicsumFallback(topic, index);
  if (!PEXELS_API_KEY) {
    if (!pexelsFallbackWarningShown) {
      console.warn('⚠️ PEXELS_API_KEY가 없어 기존 Picsum 이미지로 안전하게 대체합니다. Pexels를 사용하려면 GitHub Actions Secret에 키를 설정해야 합니다.');
      pexelsFallbackWarningShown = true;
    }
    return fallback();
  }

  const query = String(topic || '').trim().slice(0, 100);
  if (!query) {
    if (!pexelsFallbackWarningShown) {
      console.warn('⚠️ 주제가 비어 있어 기존 Picsum 이미지로 대체합니다.');
      pexelsFallbackWarningShown = true;
    }
    return fallback();
  }

  const locale = PEXELS_LOCALE_BY_LANG[langCode] || 'en-US';
  const cacheKey = locale + '|' + query.toLowerCase();
  try {
    let photos = PEXELS_IMAGE_CACHE.get(cacheKey);
    if (!photos) {
      const url = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(query)
        + '&per_page=40&orientation=landscape&locale=' + encodeURIComponent(locale);
      const response = await fetch(url, {
        headers: { Authorization: PEXELS_API_KEY },
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error('Pexels HTTP ' + response.status);
      const payload = await response.json();
      photos = Array.isArray(payload.photos) ? payload.photos : [];
      PEXELS_IMAGE_CACHE.set(cacheKey, photos);
    }

    const terms = imageTopicTerms(query);
    const candidates = photos
      .filter((photo) => photo && photo.id && photo.src && (photo.src.landscape || photo.src.large))
      .map((photo, order) => {
        const alt = String(photo.alt || '').trim();
        const altLower = alt.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (altLower.includes(term) ? 1 : 0), 0);
        return { photo, order, score, alt };
      })
      .sort((a, b) => b.score - a.score || a.order - b.order);

    const unique = [];
    const seenIds = new Set();
    for (const candidate of candidates) {
      const id = String(candidate.photo.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      unique.push(candidate);
      if (unique.length === 2) break;
    }
    if (unique.length < 2) throw new Error('Pexels 검색에서 서로 다른 사진 2장을 찾지 못했습니다.');

    return {
      coverUrl: unique[0].photo.src.landscape || unique[0].photo.src.large,
      bodyUrl: unique[1].photo.src.landscape || unique[1].photo.src.large,
      coverAlt: unique[0].alt || query,
      bodyAlt: unique[1].alt || query
    };
  } catch (error) {
    if (!pexelsFallbackWarningShown) {
      console.warn('⚠️ Pexels 사진 검색에 실패해 기존 Picsum 이미지로 대체합니다: ' + error.message);
      pexelsFallbackWarningShown = true;
    }
    return fallback();
  }
}
// =========================================================================
// 한국 시간(KST) 기준 당일 발행 날짜 생성
// =========================================================================
function getKstPublishDateIso() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  return new Date(Date.UTC(year, month - 1, day, 10, 10, 0)).toISOString();
}

// =========================================================================
// [2호기 전용] 12개국 100% 현지어 섹션 제목 및 치환 딕셔너리 (영구 고정)
// =========================================================================
const I18N_SECTIONS = {
  ko: {
    s1: "1. 문제가 생긴 순간과 먼저 확인할 것",
    s2: "2. 증상으로 원인을 구분하는 방법",
    s3: "3. 안전하게 따라 하는 해결 순서",
    s4: "4. 실수 방지와 전문가 도움을 받을 때",
    s5: "5. 자주 묻는 질문 (FAQ)",
    tags: ["스마트폰수리", "모바일팁", "트러블슈팅", "배터리케어"]
  },
  en: {
    s1: "1. The Moment It Happens: What to Check First",
    s2: "2. What the Symptoms Can Tell You",
    s3: "3. Safe Steps to Solve the Problem",
    s4: "4. Mistakes to Avoid and When to Get Help",
    s5: "5. Frequently Asked Questions (FAQ)",
    tags: ["Mobile Repair", "Smartphone", "Fix Guide", "Tech Tips"]
  },
  ja: {
    s1: "1. トラブルが起きた瞬間に最初に確認すること",
    s2: "2. 症状から原因を見分ける",
    s3: "3. 安全に試す解決手順",
    s4: "4. 避けるべき操作と相談の目安",
    s5: "5. よくある質問 (FAQ)",
    tags: ["スマホ修理", "ハードウェア", "トラブルシューティング", "バッテリーケア"]
  },
  de: {
    s1: "1. Der Moment, in dem es passiert: Das zuerst prüfen",
    s2: "2. Was die Symptome verraten",
    s3: "3. Sichere Schritte zur Lösung",
    s4: "4. Fehler vermeiden und wissen, wann Hilfe nötig ist",
    s5: "5. Häufige Fragen (FAQ)",
    tags: ["Smartphone-Reparatur", "Hardware", "Fehlerbehebung", "Akku-Pflege"]
  },
  fr: {
    s1: "1. Au moment du problème : les premières vérifications",
    s2: "2. Ce que les symptômes peuvent indiquer",
    s3: "3. Les étapes sûres pour résoudre le problème",
    s4: "4. Les erreurs à éviter et quand demander de l’aide",
    s5: "5. Questions fréquentes (FAQ)",
    tags: ["Réparation Smartphone", "Matériel", "Dépannage", "Entretien Batterie"]
  },
  es: {
    s1: "1. Cuando ocurre: qué comprobar primero",
    s2: "2. Qué pueden indicar los síntomas",
    s3: "3. Pasos seguros para resolverlo",
    s4: "4. Errores que conviene evitar y cuándo pedir ayuda",
    s5: "5. Preguntas frecuentes (FAQ)",
    tags: ["Reparación Móvil", "Hardware", "Solución de Problemas", "Cuidado Batería"]
  },
  it: {
    s1: "1. Quando succede: cosa controllare per prima cosa",
    s2: "2. Cosa possono indicare i sintomi",
    s3: "3. I passaggi sicuri per risolvere il problema",
    s4: "4. Errori da evitare e quando chiedere assistenza",
    s5: "5. Domande frequenti (FAQ)",
    tags: ["Riparazione Smartphone", "Hardware", "Risoluzione Problemi", "Cura Batteria"]
  },
  pt: {
    s1: "1. Quando acontece: o que verificar primeiro",
    s2: "2. O que os sintomas podem indicar",
    s3: "3. Etapas seguras para resolver o problema",
    s4: "4. Erros a evitar e quando pedir ajuda",
    s5: "5. Perguntas frequentes (FAQ)",
    tags: ["Reparo Celular", "Hardware", "Solução de Problemas", "Cuidado Bateria"]
  },
  nl: {
    s1: "1. Op het moment zelf: wat controleer je eerst?",
    s2: "2. Wat de symptomen kunnen betekenen",
    s3: "3. Veilige stappen om het probleem op te lossen",
    s4: "4. Wat je beter niet doet en wanneer je hulp vraagt",
    s5: "5. Veelgestelde vragen (FAQ)",
    tags: ["Smartphone Reparatie", "Hardware", "Probleemoplossing", "Accuzorg"]
  },
  pl: {
    s1: "1. Gdy to się dzieje: co najpierw sprawdzić",
    s2: "2. Co mogą oznaczać objawy",
    s3: "3. Bezpieczne kroki rozwiązania problemu",
    s4: "4. Czego unikać i kiedy szukać pomocy",
    s5: "5. Częste pytania (FAQ)",
    tags: ["Naprawa Smartfona", "Sprzęt", "Rozwiązywanie Problemów", "Kondycja Baterii"]
  },
  id: {
    s1: "1. Saat masalah muncul: apa yang diperiksa lebih dulu",
    s2: "2. Arti gejala yang terlihat",
    s3: "3. Langkah aman untuk mengatasinya",
    s4: "4. Hal yang perlu dihindari dan kapan mencari bantuan",
    s5: "5. Pertanyaan umum (FAQ)",
    tags: ["Reparasi HP", "Perangkat Keras", "Troubleshooting", "Perawatan Baterai"]
  },
  vi: {
    s1: "1. Khi sự cố xảy ra: điều cần kiểm tra trước tiên",
    s2: "2. Triệu chứng có thể cho biết điều gì",
    s3: "3. Các bước an toàn để xử lý",
    s4: "4. Điều cần tránh và khi nào cần trợ giúp",
    s5: "5. Câu hỏi thường gặp (FAQ)",
    tags: ["Sửa Điện Thoại", "Phần Cứng", "Khắc Phục Sự Cố", "Bảo Vệ Pin"]
  }
};

// =========================================================================
// 🛡️ [2호기 자가 검수 및 치유 엔진: Self-Healing Inspector]
// =========================================================================
function inspectAndHealMarkdown(body, langCode) {
  let healed = body.trim();
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;
  const auditLogs = [];

  // 1) 헤딩 내부 볼드 제거 및 2호기 표준 소제목 강제 안착
  healed = healed.replace(/^(#{1,6}\s+)\*\*(.*?)\*\*/gm, '$1$2');
  healed = healed.replace(/^#{1,6}\s*1[.\s]+([^\n]+)/m, `## ${i18n.s1}`);
  healed = healed.replace(/^#{1,6}\s*2[.\s]+([^\n]+)/m, `## ${i18n.s2}`);
  healed = healed.replace(/^#{1,6}\s*3[.\s]+([^\n]+)/m, `## ${i18n.s3}`);
  healed = healed.replace(/^#{1,6}\s*4[.\s]+([^\n]+)/m, `## ${i18n.s4}`);
  healed = healed.replace(/^#{1,6}\s*5[.\s]+([^\n]+)/m, `## ${i18n.s5}`);

  if (!healed.startsWith('## 1.')) {
    healed = `## ${i18n.s1}\n\n` + healed;
    auditLogs.push("1번 헤딩 주입");
  }

  // 2) 🛡️ Q&A 줄바꿈 뭉개짐 자동 분리 치유 (질문과 답변 사이 빈 줄 2개 보장)
  const rawQnACount = (healed.match(/Q[1-3]\./gi) || []).length;
  if (rawQnACount > 0) {
    healed = healed.replace(/\s*(\*\*Q[1-3]\.\*\*|Q[1-3]\.)\s*/gi, '\n\n**$1** ');
    healed = healed.replace(/\s*(\*\*A[1-3]\.\*\*|A[1-3]\.)\s*/gi, '\n\n**$1** ');
    healed = healed.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
    healed = healed.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');
    auditLogs.push("Q&A 줄바꿈 2열 분리 치유");
  }

  // 3) 볼드 기호 안쪽 공백 정돈 (** 단어 ** -> **단어**)
  if (/\*\*\s+[^*]+?\s+\*\*/.test(healed)) {
    healed = healed.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
                   .replace(/\*\*\s+([^*]+?)\*\*/g, '**$1**')
                   .replace(/\*\*([^*]+?)\s+\*\*/g, '**$1**');
    auditLogs.push("볼드 공백 정돈");
  }

  // 4) 특수문자 및 수식 인라인 백틱화
  healed = healed.replace(/\$(?:Strg|Ctrl|Win|Shift|Alt|Esc)\s*[^$\n]*\$/gi, (match) => {
    return `\`${match.replace(/\$/g, '').trim()}\``;
  });
  healed = healed.replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`');
  healed = healed.replace(/\\times/g, 'x')
                 .replace(/\\circ/g, '°')
                 .replace(/\\approx/g, '≈')
                 .replace(/~/g, '-');

  // 5) 연속 빈 줄 압축
  healed = healed.replace(/\n{3,}/g, '\n\n').trim();

  if (auditLogs.length > 0) {
    console.log(`   🩺 [자가 치유 완료]: ${auditLogs.join(' | ')}`);
  }

  return healed;
}

if (!fs.existsSync(TOPICS_FILE)) {
  console.error("❌ topics.txt 파일이 존재하지 않습니다.");
  process.exit(1);
}

const fileContent = fs.readFileSync(TOPICS_FILE, 'utf-8');
const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

if (lines.length === 0) {
  console.log("⚠️ topics.txt에 남은 주제가 없습니다. 생성을 건너뜁니다.");
  process.exit(0);
}

const currentTopic = lines[0];
console.log(`📌 오늘 처리할 주제 [2호기 Life & Tech]: "${currentTopic}"`);

const MOBILE_CRISIS_SCENARIOS_30 = [
  "중요한 외부 미팅을 위해 거래처로 이동하기 10분 전, 스마트폰 배터리가 3%밖에 남지 않아 초조한 순간",
  "공항 탑승구 앞에서 모바일 탑승권과 여권을 띄워야 하는데 화면 밝기가 급격히 떨어지며 기기가 꺼지려 할 때",
  "KTX 열차 안에서 좌석 콘센트에 고속 충전기를 꽂았지만 '충전 중이 아님' 경고창이 깜빡거릴 때",
  "퇴근길 지하철에서 대중교통 모바일 교통카드 결제를 태그해야 하는 순간 터치가 먹통이 된 상황",
  "주말 장거리 고속도로 주행 중 차량용 거치대에서 내비게이션을 보던 스마트폰이 고온 경고와 함께 종료될 때",
  "카페에서 급한 업무 전화를 연속으로 받던 중 충전 케이블을 연결해도 배터리 퍼센트가 계속 깎여나가는 순간",
  "외근 중 배터리 공유를 위해 보조배터리를 연결했으나 단자 접촉 불량으로 충전과 끊김이 무한 반복될 때",
  "아침 출근 알람을 듣고 일어났더니 밤새 충전기에 꽂아두었던 폰이 차갑게 꺼져 있던 당혹스러운 상황",
  "비 오는 날 야외에서 우산을 들고 메신저를 확인하다가 빗방울이 충전 포트에 들어가 '물기 감지' 경고가 뜬 순간",
  "세면대나 싱크대 옆에 올려둔 스마트폰 모서리가 물에 살짝 닿은 뒤 스피커 소리가 먹먹하게 찢어질 때",
  "주머니 속 먼지와 보풀이 충전 단자 깊숙이 엉겨 붙어 충전 케이블이 끝까지 딸깍 물리지 않고 튕겨 나올 때",
  "해변이나 모래사장에서 사진을 찍은 뒤 단자 안쪽에 미세 모래 알갱이가 들어가 충전 핀을 긁는 느낌이 들 때",
  "운동 후 땀이 묻은 손으로 지문 인식을 시도했으나 잠금이 풀리지 않고 연속 실패 경고가 뜰 때",
  "카페에서 커피나 음료가 테이블 위 스마트폰 하단부로 쏟아져 긴급히 전원을 차단해야 했던 순간",
  "습도가 높은 욕실에 음악을 틀어두고 샤워를 마친 후 화면 터치 좌표가 제멋대로 튀는 고스트 터치 발생 시",
  "식당에서 국물 요리가 스피커 그릴 틈새로 살짝 튀어 알코올 솜과 면봉을 찾아 헤매던 상황",
  "여름철 대낮 야외 주차장 차 안에서 스마트폰이 과열되어 카메라 앱 실행이 강제 차단된 순간",
  "고사양 모바일 게임이나 동영상 편집 렌더링 중 기기 후면이 뜨거워지며 프레임이 심각하게 끊길 때",
  "한겨울 영하의 날씨에 야외에서 사진을 찍으려 하자 배터리가 40%에서 1%로 곤두박질치며 기절한 상황",
  "중요한 화상 면접이나 라이브 방송 도중 스마트폰 발열로 인해 화면이 멈추고 연결이 끊어질 위기",
  "소프트웨어 정기 업데이트 다운로드 도중 배터리가 빠르게 닳으며 벽돌(부팅 루프) 조짐을 보일 때",
  "카카오톡이나 사내 업무 앱을 백그라운드에 10개 이상 띄워둔 상태에서 갑자기 화면 전체가 멈췄을 때",
  "블루투스 무선 이어폰과 스마트워치가 동시에 연결 해제되며 스마트폰 시스템 설정 창이 튕길 때",
  "아이 사진을 찍어주려는데 '저장공간 부족'과 함께 갤러리 앱이 멈춰버려 당장 캐시를 정리해야 하는 순간",
  "인터넷에서 본 자가 수리 팁을 따라 이쑤시개나 바늘로 단자를 쑤셨다가 핀이 손상될 뻔한 아찔한 경험",
  "저가형 다이소 충전 케이블 끝부분 피복이 벗겨지며 탄 냄새가 살짝 나 급히 코드를 뽑았던 기억",
  "스마트폰을 바닥에 떨어뜨린 직후 겉유리는 멀쩡한데 내부 OLED 패널에 초록색 세로줄이 번지기 시작할 때",
  "정품이 아닌 차량용 시거잭 급속 충전기에 폰을 연결하자마자 화면 깜빡임과 함께 전원 리셋이 일어날 때",
  "중고 스마트폰을 구매하여 첫 세팅을 마치고 유심(USIM)을 꽂았는데 안테나가 전혀 잡히지 않던 순간",
  "보호 필름 교체 중 기포가 심하게 생겨 터치 감도가 급격히 둔화되어 화면 터치가 씹히는 답답한 상황"
];

const THEME_PRESETS = [
  { id: 1, name: "Cyberpunk Terminal", primaryColor: "#00ffcc", bgColor: "#111827", layout: "CLI/진단기 로그 스타일, 하드웨어 점검 단축 경로 최상단 배치" },
  { id: 2, name: "Modern Minimalist Slate", primaryColor: "#3b82f6", bgColor: "#f8fafc", layout: "미니멀 가이드 스타일, 여백 중심의 깔끔한 단계별 분해/세척 넘버링" },
  { id: 3, name: "Industrial Blueprint", primaryColor: "#f59e0b", bgColor: "#1e293b", layout: "엔지니어링 청사진 스타일, 부품 단자 접촉 불량 원인 시각화, 쉬운 3단 비교표 포함" },
  { id: 4, name: "Retro Monokai", primaryColor: "#a6e22e", bgColor: "#272822", layout: "테크니션 워크벤치 스타일, 실전 세척/수리 주의 팁 강조 박스 중심" },
  { id: 5, name: "Nordic Clean Ice", primaryColor: "#0284c7", bgColor: "#f0f9ff", layout: "북유럽 감성 클린 레이아웃, 인용구 중심 도입부, 필수 준비물 체크리스트" }
];

const TARGET_LANGS = [
  { code: 'ko', name: 'Korean', persona: '친절하고 실무 경험이 많은 모바일 스마트폰 전문 수리 기사', localeContext: '서울/수도권 일상 및 직장 오피스' },
  { code: 'en', name: 'English', persona: 'Expert mobile repair technician and smartphone specialist', localeContext: 'Metropolitan US tech workplace & everyday commuting' },
  { code: 'ja', name: 'Japanese', persona: 'スマホ修理とハードウェアトラブルシューティングの専門家', localeContext: '東京・丸の内および首都圏の通勤・オフィス環境' },
  { code: 'de', name: 'German', persona: 'Erfahrener Smartphone- und Mobilgeräte-Techniker', localeContext: 'Berlin / München Unternehmens- und Alltagsalltag' },
  { code: 'fr', name: 'French', persona: 'Technicien réparateur spécialiste en smartphones et appareils mobiles', localeContext: 'Paris La Défense et environnement urbain quotidien' },
  { code: 'es', name: 'Spanish', persona: 'Técnico especialista en telefonía móvil y reparación de terminales', localeContext: 'Madrid y centros corporativos urbanos' },
  { code: 'it', name: 'Italian', persona: 'Tecnico esperto in riparazione e diagnostica smartphone', localeContext: 'Milano centro direzionale e vita quotidiana' },
  { code: 'pt', name: 'Portuguese', persona: 'Técnico experiente em reparação de celulares e hardware móvel', localeContext: 'São Paulo ambiente corporativo e transporte diário' },
  { code: 'nl', name: 'Dutch', persona: 'Smartphone reparatiespecialist en mobiele hardware-expert', localeContext: 'Amsterdam Zuidas en forenzenverkeer' },
  { code: 'pl', name: 'Polish', persona: 'Serwisant urządzeń mobilnych i smartfonów', localeContext: 'Warszawa centrum i codzienne wyzwania biurowe' },
  { code: 'id', name: 'Indonesian', persona: 'Teknisi profesional perbaikan smartphone dan gadget', localeContext: 'Kawasan Sudirman Jakarta dan mobilitas harian' },
  { code: 'vi', name: 'Vietnamese', persona: 'Kỹ thuật viên sửa chữa điện thoại thông minh giàu kinh nghiệm', localeContext: 'Văn phòng trung tâm TP.HCM và nhịp sống đô thị' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

const generatedPostFiles = [];

// =========================================================================
// [호출 함수] maxOutputTokens: 8192 (2,500자 정량 생성 최적화)
// =========================================================================
async function fetchWithRetry(prompt, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-6-luna',
          reasoning: { effort: 'none' },
          max_output_tokens: 8192,
          input: prompt,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message = payload?.error?.message || `HTTP ${response.status}`;
        throw new Error(`OpenAI API 오류: ${message}`);
      }

      const generatedText = (payload.output || [])
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === 'output_text')
        .map((item) => item.text || '')
        .join('\n')
        .trim();

      if (!generatedText) throw new Error('OpenAI 응답에 글 본문이 없습니다.');
      return generatedText;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도 ${attempt}/${maxRetries}]: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await delay(delayMs * attempt);
    }
  }
  throw new Error('OpenAI API 호출이 최대 재시도 횟수를 초과했습니다.');
}

function validateGeneratedPost(text, langCode) {
  const fm = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!fm) return ['frontmatter 구분자 누락'];
  const body = text.slice(fm[0].length).trim();
  const errors = [];
  for (const field of ['title', 'description', 'publishDate', 'image']) {
    if (!new RegExp('^' + field + ':\\s*\\S', 'm').test(fm[1])) errors.push(field + ' 누락');
  }
  if (body.length < (langCode === 'ko' ? 1000 : 1800)) errors.push('본문 길이 부족 또는 잘림');
  if ((body.match(/^##\s+/gm) || []).length < 5) errors.push('H2 섹션 5개 미만');
  if ((body.match(/\*\*Q[1-3]\.\*\*/gi) || []).length < 3) errors.push('FAQ 질문 3개 미만');
  if ((body.match(/\*\*A[1-3]\.\*\*/gi) || []).length < 3) errors.push('FAQ 답변 3개 미만');
  if (langCode !== 'ko' && /[가-힣]/.test(body)) errors.push('비한국어 본문에 한글 포함');
  return errors;
}

async function generateSinglePost(lang, index) {
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = currentTopic;
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 애드센스 표준 생성 중... (테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl, bodyAlt } = await getPostImages(currentTopic, index, lang.code);
  const pubDateIso = getKstPublishDateIso();

  // 🎯 [애드센스 승인 최적화 프롬프트: 2,400~2,600자 정량화]
  const prompt = `
Write as a clear, warm, knowledgeable guide for ${lang.name} readers; do not claim to be a repair technician or to have personally handled this phone.
Write a high-quality, practical mobile technology guide about the assigned topic, natively in ${lang.name}.
Target Culture: "${lang.localeContext}"
Assigned Situation: "${selectedScenario}"
Topic: "${currentTopic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical technician advice.
- Narrative voice: Use a natural first-person guide voice ("I"/the natural first-person form in ${lang.name}) without claiming professional credentials or personal repair experiences.
- Open with a vivid, reader-centered moment based on the assigned situation, then carry the article in a natural first-person guide voice. Aim for roughly 30% engaging narrative and transitions and 70% verified explanations, practical steps, and safety information.
- Never begin with a disclaimer that a scene is hypothetical, illustrative, or not a real customer case. Do not invent customer stories, personal repair experiences, credentials, quotations, or outcomes. Use first person to explain what to check and why, without claiming events that did not happen.
- Keep the story readable and the instructions easy to follow. Accuracy, useful steps, clear safety warnings, and reliable sources take priority over a forced story arc.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Use these exact H2 headings:

## ${i18n.s1}
Write 2 detailed, engaging paragraphs that place the reader in a recognizable moment related to the actual topic. Keep the scene specific to "${currentTopic}" and do not invent a real customer case.

## ${i18n.s2}
Write 2 clear paragraphs explaining plausible causes and observable clues specific to "${currentTopic}". Do not list unrelated hardware causes or state uncertain diagnoses as fact.

## ${i18n.s3}
Provide 3 concrete practical emergency resolution steps. Use clean numbered lists with safe tools and exact diagnostic steps.

## ${i18n.s4}
Write 2 practical paragraphs about safe use, mistakes to avoid, prevention where relevant, and when to seek professional help.

## ${i18n.s5}
Provide exactly 3 practical Q&A items. You MUST put an empty line between Question and Answer:

**Q1.** Question text

**A1.** Detailed answer (3-4 sentences).

**Q2.** Question text

**A2.** Detailed answer (3-4 sentences).

**Q3.** Question text

**A3.** Detailed answer (3-4 sentences).

[FORMATTING RULES]
1. Never put asterisks (**) inside H2 headings.
2. Bold keywords with strict syntax: **keyword** (no space inside asterisks).
3. Put diagnostic secret codes or settings in inline backticks (e.g. \`*#0*#\`, \`Clear Cache\`).
${lang.code !== 'ko' ? `- Absolutely NO Korean characters in non-Korean posts.` : ''}

[Strict Output Format]
Return ONLY raw Markdown starting directly with frontmatter:
---
title: "Native Clear Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "life-tech"
tags: ${JSON.stringify(i18n.tags)}
theme: "${selectedTheme.name}"
---
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0].trim();
      let body = text.slice(fmMatch[0].length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      // ⚠️ 2호기 카테고리 'life-tech' 영구 보존 강제 검증
      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, 'category: "life-tech"')
                               .replace(/category:\s*[^\n\r]+/i, 'category: "life-tech"');

      // 🩺 [자가 검수 및 치유 엔진 가동]
      body = inspectAndHealMarkdown(body, lang.code);

      if (lang.code === 'ko') {
        console.log(`   📏 [2호기 본문 최종 글자 수] ${body.length}자 (애드센스 표준: 2,400~2,600자)`);
      }

      // 본문 중간 이미지 배치 (2번 섹션 직전)
      const safeAlt = currentTopic.replace(/[\[\]\(\)"']/g, '').trim();
      const middleImageMarkdown = `\n\n![${bodyAlt || safeAlt}](${bodyUrl})\n\n`;

      if (body.includes('## 2.')) {
        body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
      } else {
        body = `${middleImageMarkdown}${body}`;
      }

      text = `${frontmatter}\n\n${body}\n`;
    }

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const validationErrors = validateGeneratedPost(text, lang.code);
    if (validationErrors.length) throw new Error('발행 전 검수 실패: ' + validationErrors.join(', '));

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    generatedPostFiles.push(filePath);
    console.log(`   ✅ [성공] 2호기 저장 완료: src/data/post/${lang.code}/${fileSlug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("⚡ [2호기 Life & Tech] (카테고리: life-tech) 12개국 고속 자동 포스팅 시작");
  console.log("==================================================");

  const batchStart = generatedPostFiles.length;
  let successCount = 0;

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) {
      await delay(2000);
    }
  }

  if (successCount === TARGET_LANGS.length) {
    lines.shift();
    fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🧹 총 ${successCount}개국 포스팅 완료. topics.txt에서 주제를 제거했습니다.`);
    console.log(`📊 남은 주제 수: ${lines.length}개`);
  } else {
    for (const filePath of generatedPostFiles.slice(batchStart)) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    console.error(`12개 언어 세트 검수 실패 (${successCount}/${TARGET_LANGS.length}). 생성된 이번 세트 파일을 되돌리고 topics.txt의 주제를 보존합니다.`);
    process.exit(1);
  }
}

run();
