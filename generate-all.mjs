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

function getPostImages(topic, index) {
  const seedBase = Date.now().toString(36);
  return {
    coverUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-c/1200/675.jpg`,
    bodyUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-b/1000/550.jpg`
  };
}

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
// [2호기 전용] 12개국 100% 현지어 섹션 제목 및 치환 딕셔너리
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
// [최종 안정형 마크다운 정제 함수] 볼드 복구 + 영문 템플릿 강제 박멸
// =========================================================================
function sanitizeMarkdownFormatting(content, langCode) {
  let cleaned = content;
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;

  // 1) AI가 출력한 영문 대괄호 템플릿 및 기본 헤더를 12개국 현지 언어로 100% 강제 치환
  cleaned = cleaned.replace(/^#{1,3}\s*1\.?\s*(\[Opening Story.*?\]|Opening Story.*?)/gmi, `## ${i18n.s1}`);
  cleaned = cleaned.replace(/^#{1,3}\s*2\.?\s*(\[Root Cause.*?\]|Root Cause.*?)/gmi, `## ${i18n.s2}`);
  cleaned = cleaned.replace(/^#{1,3}\s*3\.?\s*(\[Step-by-Step.*?\]|Step-by-Step.*?)/gmi, `## ${i18n.s3}`);
  cleaned = cleaned.replace(/^#{1,3}\s*4\.?\s*(\[Expert.*?\]|Expert.*?)/gmi, `## ${i18n.s4}`);
  cleaned = cleaned.replace(/^#{1,3}\s*5\.?\s*(\[Frequently Asked Questions.*?\]|Frequently Asked Questions.*?|FAQ)/gmi, `## ${i18n.s5}`);

  // 헤딩(#) 없이 텍스트 번호로 박힌 영문 템플릿도 헤딩 포함 현지어로 강제 변환
  cleaned = cleaned.replace(/^1\.\s*\[Opening Story.*?\]/gmi, `## ${i18n.s1}`);
  cleaned = cleaned.replace(/^2\.\s*\[Root Cause.*?\]/gmi, `## ${i18n.s2}`);
  cleaned = cleaned.replace(/^3\.\s*\[Step-by-Step.*?\]/gmi, `## ${i18n.s3}`);
  cleaned = cleaned.replace(/^4\.\s*\[Expert.*?\]/gmi, `## ${i18n.s4}`);
  cleaned = cleaned.replace(/^5\.\s*(Frequently Asked Questions|\[Frequently Asked Questions\])/gmi, `## ${i18n.s5}`);

  // 잔여 영문 태그 찌꺼기 완벽 제거
  cleaned = cleaned.replace(/\[(Opening Story\/Problem|Root Cause Breakdown|Step-by-Step Resolution|Expert Advice)\]/gi, '');

  // 2) 소제목 헤딩(#)에 묻은 불필요한 볼드 기호 정제
  cleaned = cleaned.replace(/^(#{1,6}\s*)\*\*(.*?)\*\*/gm, '$1$2');

  // 3) 볼드(**) 기호 깨짐 교정: 단어와 ** 사이에 붙은 공백 및 인접 문자 표준화
  cleaned = cleaned.replace(/\*\*\s+([^\*]+?)\s+\*\*/g, '**$1**');
  cleaned = cleaned.replace(/([가-힣a-zA-Z0-9])\*\*([가-힣a-zA-Z0-9])/g, '$1 **$2');

  // 4) Q&A 줄바꿈 및 볼드 보호: Q와 A는 무조건 빈 줄 2개로 분리
  cleaned = cleaned.replace(/([^\n])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?)/gi, '$1\n\n$2');
  cleaned = cleaned.replace(/([^\n])\s+([QA][0-9]*\s*[:.])/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([.!?])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?)/gi, '$1\n\n$2');

  // 5) 물음표 뒤 띄어쓰기 누락 보정
  cleaned = cleaned.replace(/\?([A-Za-z\u00C0-\u024F\u1EA0-\u1EF9가-힣])/g, '? $1');

  // 6) 다국어 특수기호 분리
  cleaned = cleaned.replace(/([^0-9][.?!])\s*([¿¡])/g, '$1\n\n$2');
  cleaned = cleaned.replace(/([.!])\s*(D:|R:|Risposta|Domande)/gi, '$1\n\n$2');

  return cleaned;
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
console.log(`📌 오늘 처리할 주제 (2호기 Life & Tech): "${currentTopic}"`);

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
  { id: 5, name: "Nordic Clean Ice", primaryColor: "#0284c7", bgColor: "#f0f9ff", layout: "북유럽 감성 클린 레이아웃, 인용구 중심 도입부, 필수 준비물 체크리스트" },
  { id: 6, name: "Dark Velvet Obsidian", primaryColor: "#a855f7", bgColor: "#0f172a", layout: "고급 다크 모드, 전문가 독점 단자 복구 팁 배너, 단계별 문제 해결 타임라인" },
  { id: 7, name: "Crimson Emergency Field", primaryColor: "#ef4444", bgColor: "#fff1f2", layout: "긴급 배터리/침수 복구 매뉴얼 스타일, 화재/쇼트 위험 경고 박스 최우선 강조" },
  { id: 8, name: "Forest Emerald Bio", primaryColor: "#10b981", bgColor: "#f0fdf4", layout: "친환경 재생 케어 스타일, 기기 수명 2배 연장 팁, 친절하고 명쾌한 어조" },
  { id: 9, name: "Solarized Amber Warm", primaryColor: "#d97706", bgColor: "#fef3c7", layout: "수리 공방 노트 스타일, 자가수리 vs 서비스센터 비용 비교표, 초보자 주의사항" },
  { id: 10, name: "Deep Ocean Cobalt", primaryColor: "#2563eb", bgColor: "#eff6ff", layout: "표준 스마트폰 서비스 매뉴얼 지침서, 접촉 불량 원인 심층 분석, 권장 정품 규격 안내" },
  { id: 11, name: "Tokyo Neon Violet", primaryColor: "#8b5cf6", bgColor: "#2e1065", layout: "플래그십 디바이스 케어 스타일, 충전 출력 및 저항값 비교, 커스텀 세팅 팁" },
  { id: 12, name: "Graphite Technical Paper", primaryColor: "#475569", bgColor: "#f1f5f9", layout: "기술 백서 스타일, 전류/전압 원인 가설 및 검증 절차, 표준화된 결론" },
  { id: 13, name: "High-Contrast Charcoal", primaryColor: "#e11d48", bgColor: "#18181b", layout: "고대비 경보 스타일, 데이터 LOSS 및 쇼트 방지 수칙, 긴급 전원 차단 팁" },
  { id: 14, name: "Warm Coffee Latte", primaryColor: "#78350f", bgColor: "#fefae0", layout: "초보자를 위한 친절한 스마트폰 관리 수필, 쉬운 일상 비유법, 차근차근 따라하기" },
  { id: 15, name: "Steel Silver Metallic", primaryColor: "#64748b", bgColor: "#e2e8f0", layout: "공식 기술지원 서비스 센터 리포트 스타일, 증상 체크리스트, 사전 자가진단표" },
  { id: 16, name: "Sunset Horizon Coral", primaryColor: "#f97316", bgColor: "#fff7ed", layout: "배터리 수명 극대화 꿀팁 스타일, 전후 충전 속도 비교표, 추천 도구 모음 배너" },
  { id: 17, name: "Mint Fresh Engineering", primaryColor: "#059669", bgColor: "#ecfdf5", layout: "깔끔한 모바일 클리닝 매뉴얼, 불필요한 위험 도구 배제 팁, 명쾌한 솔루션" },
  { id: 18, name: "Midnight Navy Royal", primaryColor: "#1d4ed8", bgColor: "#172554", layout: "심야 야간 AS 현장 로그 스타일, 치명적 충전 단자 쇼트 극복기, 재발 방지책" },
  { id: 19, name: "Matte Black stealth", primaryColor: "#ffffff", bgColor: "#09090b", layout: "전문 테크니션 실무 가이드 스타일, 군더더기 배제, 직관적인 단계별 설명" },
  { id: 20, name: "Teal Matrix Digital", primaryColor: "#14b8a6", bgColor: "#042f2e", layout: "모바일 회로 및 핀 연결 점검 스타일, 단자 접촉 저항 점검 체크리스트" },
  { id: 21, name: "Pastel Lavender Tech", primaryColor: "#7c3aed", bgColor: "#faf5ff", layout: "사용자 경험 중심 가이드, 스마트폰 사용자가 가장 자주 묻는 질문 5선 최상단 배치" },
  { id: 22, name: "Bronze Artisan Workshop", primaryColor: "#b45309", bgColor: "#fffbeb", layout: "정밀 하드웨어 공구 가이드, 단자 청소 도구 주의점, 사전 준비물 목록" },
  { id: 23, name: "Cobalt Enterprise Lab", primaryColor: "#1e40af", bgColor: "#dbeafe", layout: "공인 수리 엔터프라이즈 리포트 형식, 공임비 및 부품 비용 절감 수치 인용" },
  { id: 24, name: "Rosewood Hardware Guide", primaryColor: "#be123c", bgColor: "#ffe4e6", layout: "스마트폰 기종별 단자 비교 분석기, C타입 vs 라이트닝 차이점, 호환성 기준표" },
  { id: 25, name: "Deep Indigo System", primaryColor: "#4338ca", bgColor: "#e0e7ff", layout: "배터리 충전 알고리즘 분석 형식, 고속 충전 먹통 병목 원인 규명" },
  { id: 26, name: "Acid Lime Hacker Space", primaryColor: "#84cc16", bgColor: "#14532d", layout: "유용한 DIY 스마트폰 자가수리 꿀팁, 안전한 절연 도구 활용법 안내" },
  { id: 27, name: "Sandstone Desert Minimal", primaryColor: "#a16207", bgColor: "#fefce8", layout: "깔끔한 실무 매뉴얼 스타일, 소제목 하단 1줄 핵심 안전 팁 강조 배너" },
  { id: 28, name: "Dracula Purple Dev", primaryColor: "#bd93f9", bgColor: "#282a36", layout: "전통 드라큘라 테마 스타일, 필수 안전 수칙 및 긴급 재부팅 팁 하이라이트" },
  { id: 29, name: "Electric Cyan Speed", primaryColor: "#06b6d4", bgColor: "#ecfeff", layout: "초고속 1분 해결 가이드 형식, 빠른 먼지 제거 -> 정밀 세척 2단계 분리" },
  { id: 30, name: "Pure Titanium Clean", primaryColor: "#334155", bgColor: "#ffffff", layout: "초고화질 기기 관리 매뉴얼 스타일, 볼드 타이포그래피 강조, 깔끔한 구분선" }
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
// [출력 상한 잠금] maxOutputTokens: 8192로 모델의 중간 생략/축약 원천 차단
// =========================================================================
async function fetchWithRetry(prompt, maxRetries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          maxOutputTokens: 8192,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      console.warn(`⚠️ [호출 재시도] ${attempt}/${maxRetries}: ${error.message}`);
      if (attempt === maxRetries) throw error;
      await delay(delayMs);
    }
  }
}

async function generateSinglePost(lang, index) {
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = MOBILE_CRISIS_SCENARIOS_30[Math.floor(Math.random() * MOBILE_CRISIS_SCENARIOS_30.length)];
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 포스팅 생성 중... (적용 테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(currentTopic, index);
  const pubDateIso = getKstPublishDateIso(index);

  const prompt = `
You are a ${lang.persona}.
Write a definitive, exhaustive, highly professional mobile smartphone hardware guide natively in ${lang.name}.
CRITICAL REQUIREMENT: Write 100% natively in ${lang.name}. NEVER mix English template headings or bracketed words unless writing the English post.

[Topic]
${currentTopic}

[Workplace Incident Context]
- Target City/Culture: ${lang.localeContext}
- Assigned Emergency Scenario: "${selectedScenario}"

[MANDATORY TOTAL LENGTH ENFORCEMENT - ZERO CONDENSATION]
- For Korean (ko): Total body MUST be AT LEAST 2,500 characters (공백 제외 최소 2,000자 이상). Summarizing or brief outputs are strictly prohibited.
- For other languages: Total body MUST be AT LEAST 1,400 - 1,800 words of rich technical substance.

[EXHAUSTIVE 5-SECTION STRUCTURE REQUIREMENTS]
You MUST strictly follow these 5 sections using clean H2 markdown headings (## ):

## ${i18n.s1}
- Do NOT summarize. Write at least 4 long, vivid paragraphs describing:
  1) The intense daily/work situation, remaining battery percentage, and urgent communication needs.
  2) The exact error message popup (or freeze/port failure) and the sudden panic it caused.
  3) The naive first mistakes people make (blowing saliva, aggressive shaking, sharp needles) that risk permanent device damage.
  4) The realization of what is at stake (lost business call, missed train ticket, urgent photos).

## ${i18n.s2}
- Do NOT just write 3 quick bullets. Write an exhaustive technical breakdown across at least 4 detailed paragraphs explaining:
  1) Physical hardware causes: Port pin oxidation, micro-lint compaction inside USB-C/Lightning cavities, and mechanical terminal wear.
  2) Power delivery & circuit causes: PMIC (Power Management IC) protection loops, thermal throttling safeguards, and fluctuating cable resistances.
  3) Environmental & software causes: Moisture sensor false positives, background rogue app drain, or battery BMS calibration drift.

## ${i18n.s3}
- Provide at least 3 distinct, complete practical emergency resolution methods:
  * Method 1: Safe non-conductive mechanical cleaning (wooden toothpick / antistatic brush / compressed air angled correctly).
  * Method 2: System cache wipe, hardware diagnostic secret codes, or forced hard reboot key combinations.
  * Method 3: Cable resistance testing, alternating charging protocols (PD vs QC), or wireless inductive bypass.
  * Write step-by-step with clear numbered lists and explain the technical reasoning for each step.

## ${i18n.s4}
- Write at least 2 in-depth paragraphs of professional technician advice:
  1) Critical hazards: Short-circuiting battery cells, voiding warranty, liquid residue corrosion.
  2) Best maintenance habits: Recommended authentic chargers, charging temperature thresholds, and periodic port care.

## ${i18n.s5}
- Provide exactly 3 realistic, highly specific Q&A items:
  * Each question must be bold (**Q1.**, **Q2.**, **Q3.**) followed by the question text.
  * Each answer (**A1.**, **A2.**, **A3.**) MUST be a detailed, multi-sentence technical explanation (at least 3-4 sentences per answer).
  * Put an empty blank line between every Question and Answer.

[STRICT MARKDOWN & FORMATTING RULES]
1. HEADINGS: Keep clean markdown headings (e.g. "## ${i18n.s2}"). NEVER put bold asterisks (**) inside headings.
2. BOLD FORMATTING: Use bold (**) ONLY for key button clicks or essential UI/tool terms. Always put a space before and after the bold markup if surrounded by words.
3. COMMANDS: Wrap test codes (e.g. *#0*#) or terminal steps in 3-backtick code blocks.
4. NO LATEX & NO TILDE: NEVER use LaTeX ($ or $$). NEVER use tilde (~) for ranges; use hyphen (-).
${lang.code !== 'ko' ? `- Absolutely NEVER include any Korean characters (가-힣) anywhere in non-Korean posts.` : ''}

[Design Theme & Layout Dynamic Rules]
- Assigned Theme: "${selectedTheme.name}"
- Primary Accent Color: ${selectedTheme.primaryColor}
- Layout Characteristic: ${selectedTheme.layout}
- Incorporate inline styled HTML callout boxes tailored to this theme:
  <div style="border-left: 4px solid ${selectedTheme.primaryColor}; padding: 14px 18px; margin: 24px 0; background-color: rgba(0,0,0,0.03); border-radius: 4px; color: #111827;">...</div>

[Strict Output Format]
Return ONLY raw Markdown starting directly with frontmatter:
---
title: "Native Catchy Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "life-tech"
tags: ${JSON.stringify(i18n.tags)}
theme: "${selectedTheme.name}"
---
(Body starts directly here without H1 header)
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    text = text.replace(/\$([^$]+)\$/g, '$1')
               .replace(/\\times/g, 'x')
               .replace(/\\circ/g, '°')
               .replace(/\\approx/g, '≈');

    text = text.replace(/(\S)\s*~\s*(\S)/g, '$1 - $2');
    text = text.replace(/~/g, '-');

    if (lang.code !== 'ko') {
      text = text.replace(/(title:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
      text = text.replace(/(description:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
    }

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0];
      let body = text.slice(frontmatter.length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'life-tech'")
                               .replace(/category:\s*[^\n\r]+/i, "category: 'life-tech'");

      frontmatter = frontmatter.replace(/publishDate:\s*[^\n\r]+/i, `publishDate: ${pubDateIso}`);
      frontmatter = frontmatter.replace(/image:\s*["'][^"']*["']/i, `image: '${coverUrl}'`);

      // 🛡️ [이중 방어] 12개국 고유 언어로 강제 치환 및 볼드 서식 완벽 정제
      body = sanitizeMarkdownFormatting(body, lang.code);

      // 🛡️ [글자 수 물리적 강제 루프: 2,200자 미만 시 즉시 재작성]
      let retryCount = 0;
      while (lang.code === 'ko' && body.length < 2200 && retryCount < 2) {
        console.warn(`⚠️ [2호기 분량 부족] 현재 ${body.length}자 -> 목표 2,500자 충족을 위해 재작성 시도 (${retryCount + 1}/2)...`);
        const retryPrompt = prompt + "\n\nCRITICAL ENFORCEMENT: The previous generated post was strictly too short. You MUST write at least 4 very long, deeply detailed paragraphs for EACH section. Elaborate on every physical cleaning step and electrical concept exhaustively to exceed 2,500 Korean characters.";
        
        let retryRawText = await fetchWithRetry(retryPrompt);
        let retryText = retryRawText.trim();
        if (retryText.startsWith('```markdown')) retryText = retryText.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        if (retryText.startsWith('```')) retryText = retryText.replace(/^```\n/, '').replace(/\n```$/, '');

        const newFmMatch = retryText.match(/^---[\s\S]*?---\n*/);
        if (newFmMatch) {
          let newBody = retryText.slice(newFmMatch[0].length).trim();
          newBody = newBody.replace(/^#\s+[^\n]+\n+/, '');
          body = sanitizeMarkdownFormatting(newBody, lang.code);
        }
        retryCount++;
      }

      if (lang.code === 'ko') {
        console.log(`📏 [2호기 한국어 본문 최종 글자 수] ${body.length}자 (목표: 2,500자 이상)`);
      }

      const safeAlt = currentTopic.replace(/[\[\]\(\)"']/g, '').trim();
      const middleImageMarkdown = `\n\n![${safeAlt} Mobile Repair Guide](${bodyUrl})\n\n`;

      if (body.includes('## 2.') || body.includes('### 2.')) {
        body = body.replace(/(#{2,3}\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
      } else {
        const paragraphs = body.split('\n\n');
        if (paragraphs.length >= 3) {
          paragraphs.splice(2, 0, middleImageMarkdown.trim());
          body = paragraphs.join('\n\n');
        } else {
          body = `${middleImageMarkdown}${body}`;
        }
      }

      text = `${frontmatter}\n${body}\n`;
    }

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`✅ [저장 완료] 2호기: src/data/post/${lang.code}/${fileSlug}.md`);
    return true;
  } catch (error) {
    console.error(`❌ [생성 실패] ${lang.name}:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("⚡ 2호기 Life & Tech 12개국 최적화 고속 자동 포스팅 시작");
  console.log("==================================================");

  let successCount = 0;
  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) await delay(2000);
  }

  if (successCount > 0) {
    lines.shift();
    fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🧹 총 ${successCount}개국 포스팅 완료. topics.txt 갱신.`);
  } else {
    process.exit(1);
  }
}

run();
