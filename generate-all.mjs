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
// [최종 안정형 마크다운 정제 함수] 볼드 보존 + Q&A 개행 완벽 방어
// =========================================================================
function sanitizeMarkdownFormatting(content) {
  let cleaned = content;

  // 1) 소제목 헤딩(#) 바로 뒤에 붙은 불필요한 볼드 기호 정제 (### **제목** -> ### 제목)
  cleaned = cleaned.replace(/^(#{1,6}\s*)\*\*(.*?)\*\*/gm, '$1$2');

  // 2) Q&A 볼드 뭉침 방어: **Q1:**, **Q.**, **A1:**, **A.** 등의 머리말 앞을 무조건 2줄 개행으로 분리
  cleaned = cleaned.replace(/([^\n])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?)/gi, '$1\n\n$2');

  // 3) 마크다운 볼드가 없는 일반 Q/A 머리말도 앞줄과 강제 2줄 개행 분리
  cleaned = cleaned.replace(/([^\n])\s+([QA][0-9]*\s*[:.])/g, '$1\n\n$2');

  // 4) 문장 끝 부호(.!?) 뒤에 곧바로 Q/A나 번호 목록(1., 2.)이 붙어 나오는 현상 분리
  cleaned = cleaned.replace(/([.!?])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?|[0-9]+\.\s+)/gi, '$1\n\n$2');

  // 5) 물음표 뒤 띄어쓰기 누락 보정 (?단어 -> ? 단어)
  cleaned = cleaned.replace(/\?([A-Za-z\u00C0-\u024F\u1EA0-\u1EF9가-힣])/g, '? $1');

  // 6) 스페인어/다국어 특수 기호 분리
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
  { code: 'ja', name: 'Japanese', persona: 'スマホ修理とハードウェアトラブルシュー팅의 専門家', localeContext: '東京・丸の内および首都圏の通勤・オフィス環境' },
  { code: 'de', name: 'German', persona: 'Erfahrener Smartphone- und Mobilgeräte-Techniker', localeContext: 'Berlin / München Unternehmens- und Alltagsalltag' },
  { code: 'fr', name: 'French', persona: 'Technicien réparateur spécialiste en smartphones et appareils mobiles', localeContext: 'Paris La Défense et environnement urbain quotidien' },
  { code: 'es', name: 'Spanish', persona: 'Técnico especialista en telefonía móvil y reparación de terminales', localeContext: 'Madrid y centros corporativos urbanos' },
  { code: 'it', name: 'Italian', persona: 'Tecnico esperto in riparazione e diagnostica smartphone', localeContext: 'Milano centro direzionale e vita quotidiana' },
  { code: 'pt', name: 'Portuguese', persona: 'Técnico experiente em reparação de celulares e hardware móvel', localeContext: 'São Paulo ambiente corporativo e transporte diário' },
  { code: 'nl', name: 'Dutch', persona: 'Smartphone reparatiespecialist en mobiele hardware-expert', localeContext: 'Amsterdam Zuidas en forenzenverkeer' },
  { code: 'pl', name: 'Polish', persona: 'Serwisant urządzeń mobilnych i smartfonów', localeContext: 'Warszawa centrum i codzienne wyzwania biurowe' },
  { code: 'id', name: 'Indonesian', persona: 'Teknisi profesional perbaikan smartphone dan gadget', localeContext: 'Kawasan Sudirman Jakarta dan mobilitas harian' },
  { code: 'vi', name: 'Vietnamese', persona: 'Kỹ thuật viên sửa chữa điện thoại thông minh giàu kinh nghiệm', localeContext: 'Văn phòng trung tâm TP.HCM 및 nhịp sống đô thị' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

async function fetchWithRetry(prompt, maxRetries = 5, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
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

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 포스팅 생성 중... (적용 테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(currentTopic, index);
  const pubDateIso = getKstPublishDateIso(index);

  const prompt = `
You are a ${lang.persona}.
Write a highly practical, conversational, 1st-person mobile hardware troubleshooting guide natively in ${lang.name}.
CRITICAL: DO NOT translate literally from Korean. Write completely from scratch as an authentic native technician.

[Topic]
${currentTopic}

[Workplace Incident Context]
- Target City/Culture: ${lang.localeContext}
- Assigned Emergency Scenario: "${selectedScenario}"

[CRITICAL OUTPUT LANGUAGE INTEGRITY - ZERO HANGUL IN GLOBAL POSTS]
- If target language is NOT Korean (ko):
  * Absolutely NEVER include any Korean Hangul characters (가-힣) anywhere in the title, description, tags, or body.
  * Every single character in the title and description MUST strictly be in native ${lang.name}.

[WRITING STYLE: PLAIN & PRACTICAL FOR EVERYDAY PROFESSIONALS]
1. Plain & Easy Explanations:
    - Avoid overly abstract electrical engineering formulas.
    - Write in warm, friendly, everyday language that any phone owner can safely follow.
    - Give concrete cleaning, inspection, and diagnosis steps.
2. Laser-Focused Narrative:
    - The opening emergency story MUST be 100% strictly about the assigned [Topic] (${currentTopic}) and reflect the given [Assigned Emergency Scenario].

[MANDATORY OPENING VARIATION RULE - ZERO CLICHE REPETITION]
- You MUST start the opening story based strictly on the assigned scenario: "${selectedScenario}".
- ABSOLUTELY FORBIDDEN: Do NOT default to a generic "meeting in 30 minutes" trope. Adapt the specific incident naturally into the local daily culture of ${lang.name}.

[STRICT MARKDOWN & FORMATTING RULES - NO RENDERING GLITCHES]
1. HEADINGS & STRUCTURE (MANDATORY):
    - You MUST use clear markdown headings (## for major sections, ### for subsections) for every section:
      * ## 1. [Opening Story/Problem]
      * ## 2. [Root Cause Breakdown]
      * ## 3. [Step-by-Step Resolution]
      * ## 4. [Expert Advice]
      * ## 5. Frequently Asked Questions
    - NEVER put markdown asterisks inside headings. Keep clean headings like "## 2. Root Cause Breakdown".
2. BOLD FORMATTING RULE:
    - Use markdown bold (**) naturally and moderately ONLY for key action words, UI menu buttons, tools, or core technical terms.
    - NEVER bold an entire sentence or overuse bold on every phrase.
3. COMMANDS & CODE BLOCKS:
    - Always wrap long technical terms, test codes (e.g. *#0*#), or shell snippets in standard 3-backtick code blocks (\`\`\`bash or \`\`\`cmd).
4. NO LATEX & NO TILDE:
    - ABSOLUTELY FORBIDDEN: NEVER use LaTeX math delimiters ($ or $$). Always write plain text units (e.g., "45°C", "9V 2A", "25W").
    - ABSOLUTELY FORBIDDEN: NEVER use tilde (~) for ranges (e.g., NEVER write "10~20%"). Always use a hyphen (e.g., "10-20%").

[Design Theme & Layout Dynamic Rules (MANDATORY)]
- Assigned Theme: "${selectedTheme.name}"
- Primary Accent Color: ${selectedTheme.primaryColor}
- Layout Characteristic: ${selectedTheme.layout}
- You MUST incorporate native Markdown and inline styled HTML callouts tailored to this theme.
- Use custom styled tip/warning boxes (e.g., <div style="border-left: 4px solid ${selectedTheme.primaryColor}; padding: 12px 16px; margin: 20px 0; background-color: rgba(0,0,0,0.03); border-radius: 4px; color: #111827;">...</div>).
  * CRITICAL: All text inside callout/tip/warning boxes MUST be crisp dark charcoal/black (color: #111827) so it is 100% legible against any background.

[Tone & Writing Style Rules (STRICT - NO AI VIBE)]
1. Mandatory Opening:
    - Absolutely FORBIDDEN: Boring textbook intros like "Hello", "In this post", "Today we will explore".
    - Start immediately with an intense, relatable panic moment strictly about [Topic] based on the assigned incident.
2. Tone & Voice:
    - Write like an experienced repair shop owner sharing honest, battle-tested practical tips.
3. Fast-Paced 3-Step Narrative:
    - Step 1: Sudden charging/port panic regarding [Topic] set in the assigned incident.
    - Step 2: Dangerous mistakes people make (e.g., using sharp metal pins, blowing saliva).
    - Step 3: Safe, actionable diagnostic and cleaning/repair steps.

[Content & Structure (AdSense E-E-A-T Compliant)]
1. Opening Story: Intense real-life incident strictly regarding this topic based on the assigned scenario.
2. Root Cause Breakdown: Clearly explain 3 realistic root causes behind the port/battery/charging failure.
3. Step-by-Step Resolution: Actionable, safe diagnostic and cleaning/inspection steps.
4. Expert Warning / Safety Tip: Crucial warnings on battery safety, pin deformation, or liquid contact.
5. Frequently Asked Questions (FAQ): Exactly 3 realistic, high-value Q&As that users frequently ask.
   * CRITICAL: Every single Question (Q) and Answer (A) MUST start on its own separate new line, separated by an empty blank line. Never run Q and A together.

[Length & Richness Rules]
- Korean (ko): Minimum 2,500 characters of rich, deep, non-repetitive text.
- Other languages: 1,200 to 1,500 words of thorough practical explanation.

[Strict Output Format]
Return ONLY raw Markdown starting directly with frontmatter:
---
title: "Native Catchy Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "life-tech"
tags: ["Mobile Repair", "Smartphone", "Fix Guide", "Tech Tips"]
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

      // 2호기 안전 정제 함수 적용 (볼드 복원 및 Q&A 개행 분리 방어)
      body = sanitizeMarkdownFormatting(body);

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
