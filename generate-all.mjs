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
import { createHash } from 'node:crypto';

const DRY_RUN = process.argv.includes('--dry-run');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!DRY_RUN && !OPENAI_API_KEY) throw new Error('OPENAI_API_KEY secret is required.');
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');

// =========================================================================
// [2호기 고유] Picsum 기반 시드 이미지 URL 동적 생성
// =========================================================================
function getPostImages(topic, index) {
  const seedBase = Date.now().toString(36);
  return {
    coverUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-c/1200/675.jpg`,
    bodyUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-b/1000/550.jpg`
  };
}

// =========================================================================
// 한국 시간(KST) 기준 당일 발행 날짜 생성
// =========================================================================
function getKstPublishDateIso(index) {
  const now = new Date();
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const year = kstTime.getUTCFullYear();
  const month = String(kstTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getUTCDate()).padStart(2, '0');
  const minute = String((index * 5) % 60).padStart(2, '0');
  return `${year}-${month}-${day}T03:${minute}:00.000Z`;
}

// =========================================================================
// [2호기 전용] 12개국 100% 현지어 섹션 제목 및 치환 딕셔너리 (영구 고정)
// =========================================================================
const I18N_SECTIONS = {
  ko: {
    s1: "1. 스마트폰 먹통 돌발 위기 상황",
    s2: "2. 충전 오류 및 하드웨어 결함의 핵심 원인 분석",
    s3: "3. 1분 만에 끝내는 단계별 실전 응급 조치법",
    s4: "4. 현직 수리 기사가 전하는 주의사항 및 팁",
    s5: "5. 자주 묻는 질문 (FAQ)",
    tags: ["스마트폰수리", "모바일팁", "트러블슈팅", "배터리케어"]
  },
  en: {
    s1: "1. Critical Smartphone Emergency Situation",
    s2: "2. Root Cause Breakdown of Port and Hardware Failures",
    s3: "3. Step-by-Step Practical Emergency Resolution",
    s4: "4. Professional Repair Technician Precautions & Tips",
    s5: "5. Frequently Asked Questions (FAQ)",
    tags: ["Mobile Repair", "Smartphone", "Fix Guide", "Tech Tips"]
  },
  ja: {
    s1: "1. スマホが突然動かなくなった緊急トラブル",
    s2: "2. 充電不良とハードウェア障害の根本原因",
    s3: "3. 1分で完了する実践的な応急処置手順",
    s4: "4. 現役修理技術者が教える注意点とコツ",
    s5: "5. よくある質問 (FAQ)",
    tags: ["スマホ修理", "ハードウェア", "トラブルシューティング", "バッテリーケア"]
  },
  de: {
    s1: "1. Kritischer Smartphone-Notfall im Alltag",
    s2: "2. Detaillierte Ursachenanalyse von Lade- und Hardwarefehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur Notfallbehebung",
    s4: "4. Praxistipps und Warnungen vom Reparatur-Experten",
    s5: "5. Häufig gestellte Fragen (FAQ)",
    tags: ["Smartphone-Reparatur", "Hardware", "Fehlerbehebung", "Akku-Pflege"]
  },
  fr: {
    s1: "1. Situation d'urgence critique sur smartphone",
    s2: "2. Analyse approfondie des pannes matérielles et de charge",
    s3: "3. Guide pratique de dépannage étape par étape",
    s4: "4. Conseils et précautions d'un réparateur professionnel",
    s5: "5. Foire Aux Questions (FAQ)",
    tags: ["Réparation Smartphone", "Matériel", "Dépannage", "Entretien Batterie"]
  },
  es: {
    s1: "1. Emergencia crítica con el teléfono móvil",
    s2: "2. Análisis de causas raíz de fallos de carga y hardware",
    s3: "3. Solución práctica de emergencia paso a paso",
    s4: "4. Consejos y advertencias de un técnico reparador",
    s5: "5. Preguntas Frecuentes (FAQ)",
    tags: ["Reparación Móvil", "Hardware", "Solución de Problemas", "Cuidado Batería"]
  },
  it: {
    s1: "1. Emergenza improvvisa con lo smartphone",
    s2: "2. Analisi approfondita dei guasti hardware e di ricarica",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Avvertenze e suggerimenti del tecnico riparatore",
    s5: "5. Domande Frequenti (FAQ)",
    tags: ["Riparazione Smartphone", "Hardware", "Risoluzione Problemi", "Cura Batteria"]
  },
  pt: {
    s1: "1. Situação de emergência com o smartphone",
    s2: "2. Análise da causa raiz de falhas de carregamento e hardware",
    s3: "3. Guia prático de primeiros socorros passo a passo",
    s4: "4. Alertas e recomendações de técnicos especialistas",
    s5: "5. Perguntas Frecuentes (FAQ)",
    tags: ["Reparo Celular", "Hardware", "Solução de Problemas", "Cuidado Bateria"]
  },
  nl: {
    s1: "1. Kritieke smartphone-noodsituatie",
    s2: "2. Grondige oorzaakanalyse van laad- en hardwareproblemen",
    s3: "3. Stapsgewijze praktische noodoplossing",
    s4: "4. Belangrijke waarschuwingen van reparatiespecialisten",
    s5: "5. Veelgestelde Vragen (FAQ)",
    tags: ["Smartphone Reparatie", "Hardware", "Probleemoplossing", "Accuzorg"]
  },
  pl: {
    s1: "1. Awaryjna sytuacja ze smartfonem",
    s2: "2. Szczegółowa analiza przyczyn problemów z ładowaniem i sprzętem",
    s3: "3. Praktyczne rozwiązanie problemu krok po kroku",
    s4: "4. Wskazówki i ostrzeżenia profesjonalnego serwisanta",
    s5: "5. Najczęściej zadawane pytania (FAQ)",
    tags: ["Naprawa Smartfona", "Sprzęt", "Rozwiązywanie Problemów", "Kondycja Baterii"]
  },
  id: {
    s1: "1. Situasi Darurat Kritis pada Smartphone",
    s2: "2. Analisis Mendalam Kerusakan Port dan Hardware",
    s3: "3. Panduan Praktis Langkah demi Langkah Perbaikan Darurat",
    s4: "4. Tips & Peringatan Penting Teknisi Reparasi",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)",
    tags: ["Reparasi HP", "Perangkat Keras", "Troubleshooting", "Perawatan Baterai"]
  },
  vi: {
    s1: "1. Tình huống sự cố điện thoại thông minh khẩn cấp",
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi sạc và phần cứng",
    s3: "3. Các bước xử lý khẩn cấp thực tế từng bước",
    s4: "4. Lưu ý và lời khuyên quan trọng từ thợ sửa chữa",
    s5: "5. Các câu hỏi thường gặp (FAQ)",
    tags: ["Sửa Điện Thoại", "Phần Cứng", "Khắc Phục Sự Cố", "Bảo Vệ Pin"]
  }
};

// =========================================================================
// 🛡️ [2호기 자가 검수 및 치유 엔진: Self-Healing Inspector]
// =========================================================================
function inspectAndHealMarkdown(body) {
  return body.trim()
    .replace(/^(#{1,6}\s+)\*\*([^\n]*?)\*\*/gm, '$1$2')
    .replace(/\*\*[ \t]+([^*\n]+?)[ \t]+\*\*/g, '**$1**')
    // Luna sometimes bolds the whole FAQ question: **Q1. question?**.
    // Normalize the marker only; keep the native-language question text unchanged.
    .replace(/^\*\*Q([1-3])\.\s+([^\n]*?)\*\*[ \t]*$/gm, '**Q$1.** $2')
    .replace(/(\*\*Q[1-3]\.\*\*[^\n]*)\n(?=\*\*A[1-3]\.\*\*)/g, '$1\n\n')
    .replace(/\n{3,}/g, '\n\n');
}
function validateGeneratedPost(text, langCode) {
  const errors = [];
  const fm = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
  if (!fm) return ['frontmatter missing'];
  const meta = fm[1], body = text.slice(fm[0].length);
  for (const field of ['title', 'description', 'publishDate', 'image', 'theme'])
    if (!new RegExp('^' + field + ':\\s*\\S', 'm').test(meta)) errors.push(field + ' missing');
  if (!/^category:\s*['"]?life-tech['"]?\s*$/m.test(meta)) errors.push('category must be life-tech');
  const readable = body.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/[#*_\x60>]/g,'');
  const isCharacterCountLanguage = langCode === 'ko' || langCode === 'ja';
  const count = isCharacterCountLanguage ? [...readable.replace(/\s/g, '')].length : (readable.match(/\S+/g) || []).length;
  const minLength = langCode === 'ko' ? 1900 : langCode === 'ja' ? 1700 : 700;
  const maxLength = langCode === 'ko' ? 3100 : langCode === 'ja' ? 3500 : 1400;
  if (count < minLength || count > maxLength) errors.push('body length ' + count);
  const headings = body.match(/^##\s+[^\n]+/gm)||[];
  if (headings.length !== 5) errors.push('exactly 5 H2 headings required');
  for(let n=1;n<=5;n++) if(!headings[n-1]?.startsWith('## '+n+'. ')) errors.push('H2 order '+n);
  for(let n=1;n<=3;n++){
    if((body.match(new RegExp('\\*\\*Q'+n+'\\.\\*\\*','gi'))||[]).length!==1) errors.push('Q'+n+' missing or duplicated');
    if((body.match(new RegExp('\\*\\*A'+n+'\\.\\*\\*','gi'))||[]).length!==1) errors.push('A'+n+' missing or duplicated');
  }
  if((body.match(/^\x60\x60\x60/gm)||[]).length%2) errors.push('unclosed code fence');
  if(langCode!=='ko' && /[가-힣]/.test(body)) errors.push('Korean in non-Korean article');
  return errors;
}

if (!DRY_RUN && !fs.existsSync(TOPICS_FILE)) {
  console.error("❌ topics.txt 파일이 존재하지 않습니다.");
  process.exit(1);
}

const fileContent = DRY_RUN ? 'offline test mobile topic' : fs.readFileSync(TOPICS_FILE, 'utf-8');
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
const fileSlug = 'post-' + createHash('sha256').update(currentTopic).digest('hex').slice(0,14);

// =========================================================================
// [호출 함수] maxOutputTokens: 4096 (2,500자 정량 생성 최적화)
// =========================================================================
async function fetchWithRetry(prompt, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-6-luna', input: prompt, max_output_tokens: 6500 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${JSON.stringify(result.error || result).slice(0, 400)}`);
      const output = (result.output || []).flatMap((item) => item.content || [])
        .filter((part) => part.type === 'output_text').map((part) => part.text).join('\n');
      if (!output.trim()) throw new Error('No text in GPT response: ' + (result.status || 'unknown'));
      return output;
    } catch (error) {
      console.warn(`GPT retry ${attempt}/${maxRetries}: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await delay(delayMs * attempt);
    }
  }
}

async function generateSinglePost(lang, index) {
  const existingPath = path.join(POSTS_BASE_DIR, lang.code, `${fileSlug}.md`);
  if (fs.existsSync(existingPath)) {
    console.log(`기존 성공 언어 유지: ${lang.code}`);
    return true;
  }
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = MOBILE_CRISIS_SCENARIOS_30[Math.floor(Math.random() * MOBILE_CRISIS_SCENARIOS_30.length)];
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 애드센스 표준 생성 중... (테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(currentTopic, index);
  const pubDateIso = getKstPublishDateIso(index);

  // 🎯 [애드센스 승인 최적화 프롬프트: 2,400~2,600자 정량화]
  const prompt = `
You are a ${lang.persona}.
Write a high-quality, practical mobile smartphone hardware & repair guide natively in ${lang.name}.
Target Culture: "${lang.localeContext}"
Optional illustrative scenario ONLY when directly relevant; do not invent a firsthand event: "${selectedScenario}"
Topic: "${currentTopic}"
Example native language taxonomy: ${JSON.stringify(i18n.tags)}. Choose only topic-relevant tags.

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Target 2,400-2,600 Korean characters excluding whitespace and Markdown; prioritize practical accuracy rather than filler.
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical technician advice.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Use exactly five topic-specific native-language H2 headings numbered 1 to 5 in order. Avoid fixed generic charging or hardware headings for unrelated topics:

## 1. [Specific native-language heading relevant to the exact topic]
Explain symptoms and safe initial checks specific to the topic. Never invent personal experience, a crisis, or an expert credential.

## 2. [Specific native-language heading relevant to the exact topic]
Explain plausible causes specifically relevant to the topic. Avoid unsupported hardware diagnoses and risky physical interventions.

## 3. [Specific native-language heading relevant to the exact topic]
Provide three concrete, safe troubleshooting steps in clear order. Use manufacturer-appropriate interface labels; never advise inserting tools or liquids into ports.

## 4. [Specific native-language heading relevant to the exact topic]
Explain how to verify the fix, possible exceptions, when to stop troubleshooting, and when professional service is warranted.

## 5. [Specific native-language heading relevant to the exact topic]
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
tags: ["3 to 5 useful topic-specific tags in this language"]
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
      body = inspectAndHealMarkdown(body);

      if (lang.code === 'ko') {
        console.log(`   📏 [2호기 본문 최종 글자 수] ${body.length}자 (애드센스 표준: 2,400~2,600자)`);
      }

      // 본문 중간 이미지 배치 (2번 섹션 직전)
      const safeAlt = currentTopic.replace(/[\[\]()"']/g, '').trim();
      const middleImageMarkdown = `\n\n![${safeAlt} Mobile Repair Guide](${bodyUrl})\n\n`;

      if (body.includes('## 2.')) {
        body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
      } else {
        body = `${middleImageMarkdown}${body}`;
      }

      text = `${frontmatter}\n\n${body}\n`;
    } else {
      throw new Error('프런트매터 없음: 저장 차단');
    }
    const validationErrors = validateGeneratedPost(text, lang.code);
    if (validationErrors.length) throw new Error('품질 검사 실패: ' + validationErrors.join(', '));

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`   ✅ [성공] 2호기 저장 완료: src/data/post/${lang.code}/${fileSlug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  if (DRY_RUN) {
    console.log('SAFE DRY RUN: no API calls, no files changed, no publishing');
    const sample = '---\ntitle: sample\ndescription: sample\npublishDate: 2026-10-28\nimage: https://picsum.photos/seed/test/1200/675.jpg\ncategory: life-tech\ntheme: test\n---\n\n## 1. Test\nshort';
    if (!validateGeneratedPost(sample,'ko').some(e=>e.startsWith('body length'))) throw new Error('Validation smoke test failed for Korean');
    if (!validateGeneratedPost(sample,'ja').some(e=>e.startsWith('body length'))) throw new Error('Validation smoke test failed for Japanese');
    const japaneseBody = ['## 1. 症状', 'あ'.repeat(500), '## 2. 原因', 'あ'.repeat(500), '## 3. 対処法', 'あ'.repeat(500), '## 4. 注意点', 'あ'.repeat(500), '## 5. 質問', '**Q1.** 質問', '**A1.** 回答', '**Q2.** 質問', '**A2.** 回答', '**Q3.** 質問', '**A3.** 回答'].join('\n\n');
    const japaneseSample = sample.slice(0, sample.indexOf('## 1. Test')) + japaneseBody;
    if (validateGeneratedPost(japaneseSample, 'ja').length) throw new Error('Valid Japanese character-count sample rejected');
    const repairedFaq = inspectAndHealMarkdown('**Q1. 와이파이 연결 오류인가요?**  \n**A1.** 답변');
    if (!repairedFaq.includes('**Q1.** 와이파이 연결 오류인가요?\n\n**A1.**')) throw new Error('FAQ bold-question repair or paragraph separation failed');
    console.log('PASS: Korean/Japanese length gates and FAQ question-marker repair');
    return;
  }
  console.log("==================================================");
  console.log("⚡ [2호기 Life & Tech] (카테고리: life-tech) 12개국 고속 자동 포스팅 시작");
  console.log("==================================================");

  let successCount = 0;

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    let isSuccess = false;
    for (let attempt=1;attempt<=2 && !isSuccess;attempt++) {
      isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
      if (!isSuccess && attempt<2) await delay(2500);
    }
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
    console.error(`\n❌ ${TARGET_LANGS.length - successCount}개 언어 누락. 주제 보존.`);
    process.exit(1);
  }
}

run();
