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
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
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

// =========================================================================
// [호출 함수] maxOutputTokens: 4096 (2,500자 정량 생성 최적화)
// =========================================================================
async function fetchWithRetry(prompt, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도 ${attempt}/${maxRetries}]: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await delay(delayMs);
    }
  }
}

async function generateSinglePost(lang, index) {
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
Assigned Situation: "${selectedScenario}"
Topic: "${currentTopic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical technician advice.
- Narrative voice: Write in a first-person storytelling voice ("I"/the natural first-person form in ${lang.name}) from the assigned technician persona's perspective.
- Open with a vivid but clearly illustrative troubleshooting scene based on the assigned situation; build a story arc from the urgent problem through diagnosis, safe action, and outcome, then explain the practical guidance.
- Do not falsely claim that an illustrative scenario is a real customer case or the author's personal experience. Do not invent verified outcomes, quotations, or facts. Clearly frame hypothetical/composite events as illustrative.
- Keep first-person narration throughout the opening and transitions, while making technical instructions, safety warnings, and sources precise and factual.

[STRUCTURE - STRICT 5 H2 HEADINGS]
Use these exact H2 headings:

## ${i18n.s1}
Write 2 detailed paragraphs describing the sudden smartphone hardware failure, remaining battery panic, and urgent crisis based on: "${selectedScenario}".

## ${i18n.s2}
Write 2 analytical paragraphs explaining the technical root causes (port pin oxidation, lint compaction, PMIC loop, thermal throttling, or BMS calibration drift).

## ${i18n.s3}
Provide 3 concrete practical emergency resolution steps. Use clean numbered lists with safe tools and exact diagnostic steps.

## ${i18n.s4}
Write 2 paragraphs of practical precautions and technician tips to prevent recurring hardware damage.

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
      const middleImageMarkdown = `\n\n![${safeAlt} Mobile Repair Guide](${bodyUrl})\n\n`;

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
  console.log("==================================================");
  console.log("⚡ [2호기 Life & Tech] (카테고리: life-tech) 12개국 고속 자동 포스팅 시작");
  console.log("==================================================");

  let successCount = 0;

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) {
      await delay(2000);
    }
  }

  if (successCount > 0) {
    lines.shift();
    fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🧹 총 ${successCount}개국 포스팅 완료. topics.txt에서 주제를 제거했습니다.`);
    console.log(`📊 남은 주제 수: ${lines.length}개`);
  } else {
    console.error("\n❌ 모든 언어 생성이 실패하여 topics.txt를 보존합니다.");
    process.exit(1);
  }
}

run();
