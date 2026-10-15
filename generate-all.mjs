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
console.log(`📌 오늘 처리할 주제 (2호기 모바일): "${currentTopic}"`);

// =========================================================================
// [2호기 전용] 차단 없는 고속 CDN (Picsum) 기반 안정적 스마트폰/모바일 이미지
// =========================================================================
function getDistributedImages(langIndex, seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0;
  }

  // 1부터 1000 사이의 고유 Seed 번호 연산
  const baseNum = (Math.abs(hash) % 1000) + 1;
  const coverSeed = ((baseNum + (langIndex * 73)) % 1000) + 1;
  const bodySeed = ((coverSeed + 499) % 1000) + 1;

  // 엑박 원천 차단: Picsum 고유 Seed 이미지 (모바일 전용)
  const coverUrl = `https://picsum.photos/seed/phone${coverSeed}/1200/630`;
  const bodyUrl = `https://picsum.photos/seed/mobile${bodySeed}/1000/550`;

  return { coverUrl, bodyUrl };
}

// 30가지 고유 시각 스타일 및 글 구조 테마 프리셋
const THEME_PRESETS = [
  { id: 1, name: "Cyberpunk Terminal", primaryColor: "#00ffcc", bgColor: "#111827", layout: "CLI/모바일 터미널 스타일, 간결한 세팅 경로 최상단 배치" },
  { id: 2, name: "Modern Minimalist Slate", primaryColor: "#3b82f6", bgColor: "#f8fafc", layout: "애플 가이드 스타일, 여백 중심의 깔끔한 단계별 넘버링, 직관적 핵심 요약" },
  { id: 3, name: "Industrial Blueprint", primaryColor: "#f59e0b", bgColor: "#1e293b", layout: "모바일 엔지니어링 청사진 스타일, 배터리 소모 원인 시각화, 쉬운 3단 비교표 포함" },
  { id: 4, name: "Retro Monokai", primaryColor: "#a6e22e", bgColor: "#272822", layout: "개발자 에디터 스타일, 실전 모바일 팁 형태의 전개, 에러 해결 팁 박스" },
  { id: 5, name: "Nordic Clean Ice", primaryColor: "#0284c7", bgColor: "#f0f9ff", layout: "북유럽 감성 클린 레이아웃, 인용구 중심 도입부, 소프트 체크리스트" },
  { id: 6, name: "Dark Velvet Obsidian", primaryColor: "#a855f7", bgColor: "#0f172a", layout: "고급 다크 모드, 전문가 독점 팁 배너, 단계별 문제 해결 타임라인" },
  { id: 7, name: "Crimson Emergency Field", primaryColor: "#ef4444", bgColor: "#fff1f2", layout: "긴급 모바일 장애 복구 매뉴얼 스타일, 위험 경고 박스 최우선 강조, FAQ 아코디언형" },
  { id: 8, name: "Forest Emerald Bio", primaryColor: "#10b981", bgColor: "#f0fdf4", layout: "스마트폰 수명 연장 가이드 스타일, 배터리 효율 지표 박스, 친절한 어조" },
  { id: 9, name: "Solarized Amber Warm", primaryColor: "#d97706", bgColor: "#fef3c7", layout: "모바일 공방 노트 스타일, 실측 데이터 및 배터리 절약 분석표, 초보자 세팅 팁" },
  { id: 10, name: "Deep Ocean Cobalt", primaryColor: "#2563eb", bgColor: "#eff6ff", layout: "표준 모바일 지침서, 원인 분석 심층 다이어그램 텍스트, 권장 설정 안내" },
  { id: 11, name: "Tokyo Neon Violet", primaryColor: "#8b5cf6", bgColor: "#2e1065", layout: "모바일 게이밍 최적화 스타일, 터치 반응 및 프레임 비교, 커스텀 세팅 팁" },
  { id: 12, name: "Graphite Technical Paper", primaryColor: "#475569", bgColor: "#f1f5f9", layout: "깔끔한 기술 가이드 스타일, 정밀 원인 가설 및 검증 절차, 표준화된 결론" },
  { id: 13, name: "High-Contrast Charcoal", primaryColor: "#e11d48", bgColor: "#18181b", layout: "고대비 모바일 경보 스타일, 데이터 손실 방지 수칙, 긴급 리셋 팁 박스" },
  { id: 14, name: "Warm Coffee Latte", primaryColor: "#78350f", bgColor: "#fefae0", layout: "초보자를 위한 친절한 스마트폰 수필 가이드, 쉬운 비유법, 차근차근 따라하기" },
  { id: 15, name: "Steel Silver Metallic", primaryColor: "#64748b", bgColor: "#e2e8f0", layout: "공식 서비스센터 접수증 스타일, 입고 증상 체크리스트, 사전 자가진단표" },
  { id: 16, name: "Sunset Horizon Coral", primaryColor: "#f97316", bgColor: "#fff7ed", layout: "스마트폰 꿀팁 세팅 스타일, 전후 비교 표, 추천 세팅값 모음 배너" },
  { id: 17, name: "Mint Fresh Engineering", primaryColor: "#059669", bgColor: "#ecfdf5", layout: "가벼운 OS 캐시 최적화 매뉴얼, 저장공간 정리 팁, 간결한 한 줄 명쾌 솔루션" },
  { id: 18, name: "Midnight Navy Royal", primaryColor: "#1d4ed8", bgColor: "#172554", layout: "야간 당직 로그 스타일, 모바일 오류 극복 타임스탬프, 재발 방지책" },
  { id: 19, name: "Matte Black stealth", primaryColor: "#ffffff", bgColor: "#09090b", layout: "전문 모바일 가이드 스타일, 불필요한 서술 배제, 직관적인 단계별 설명" },
  { id: 20, name: "Teal Matrix Digital", primaryColor: "#14b8a6", bgColor: "#042f2e", layout: "무선 연결 및 블루투스 분석 스타일, 페어링 신호 및 주파수 점검 체크리스트" },
  { id: 21, name: "Pastel Lavender Tech", primaryColor: "#7c3aed", bgColor: "#faf5ff", layout: "사용자 경험 중심 모바일 가이드, 자주 묻는 질문 5선 최상단 요약 배치" },
  { id: 22, name: "Bronze Artisan Workshop", primaryColor: "#b45309", bgColor: "#fffbeb", layout: "단자 청소 및 방수 관리 가이드, 세척 시 주의 박스, 준비물 목록" },
  { id: 23, name: "Cobalt Enterprise Lab", primaryColor: "#1e40af", bgColor: "#dbeafe", layout: "스마트폰 실사용 성능 리포트 형식, 발열 관리 수치 인용" },
  { id: 24, name: "Rosewood Hardware Guide", primaryColor: "#be123c", bgColor: "#ffe4e6", layout: "모바일 기기 매니아 분석기, OS 빌드별 차이점 설명, 설정 기준표" },
  { id: 25, name: "Deep Indigo System", primaryColor: "#4338ca", bgColor: "#e0e7ff", layout: "iOS / 안드로이드 시스템 오류 분석 형식, 불필요한 시스템 캐시 식별법" },
  { id: 26, name: "Acid Lime Hacker Space", primaryColor: "#84cc16", bgColor: "#14532d", layout: "모바일 유용한 툴 가이드, 안전한 백업 및 복구 앱 연동 안내" },
  { id: 27, name: "Sandstone Desert Minimal", primaryColor: "#a16207", bgColor: "#fefce8", layout: "깔끔한 모바일 매뉴얼 스타일, 소제목 하단 1줄 핵심 팁 강조 배너" },
  { id: 28, name: "Dracula Purple Dev", primaryColor: "#bd93f9", bgColor: "#282a36", layout: "전통 드라큘라 테마 스타일, 필수 재부팅 단축키 및 복구 모드 하이라이트" },
  { id: 29, name: "Electric Cyan Speed", primaryColor: "#06b6d4", bgColor: "#ecfeff", layout: "초고속 1분 해결 가이드 형식, 빠른 조치법 -> 심층 조치법 2단계 분리" },
  { id: 30, name: "Pure Titanium Clean", primaryColor: "#334155", bgColor: "#ffffff", layout: "초고화질 모바일 매뉴얼 스타일, 볼드 타이포그래피 강조, 깔끔한 구분선" }
];

// 모바일 환경에 최적화된 12개국 페르소나, 설정 메뉴 용어 및 현지 이동/출퇴근 인프라
const TARGET_LANGS = [
  { code: 'ko', name: 'Korean', persona: '친절하고 경험 많은 스마트폰 활용 장인 직장인 (사내 블라인드/커뮤니티 꿀팁 장인)', osUi: '설정 > 디스플레이, 배터리, 애플리케이션 저장공간 캐시 삭제, 단축어', localeContext: '서울/판교 출퇴근길, KTX 경부선 이동, 지하철 2호선 만원 전철' },
  { code: 'en', name: 'English', persona: 'Friendly Silicon Valley smartphone specialist sharing accessible everyday mobile tips', osUi: 'Settings > Display & Brightness, Battery, Storage, Shortcuts', localeContext: 'Caltrain commute (SF to Mountain View), Amtrak Acela (NYC to DC), busy airport security lines, Uber rides' },
  { code: 'ja', name: 'Japanese', persona: 'スマホのトラブルを誰でもわかる言葉で解決する日本の現役ITワーカー', osUi: '設定 > 画面表示と明るさ, バッテリー, ストレージ, ショートカット', localeContext: '山手線満員電車でのスマホ操作, 東海道新幹線(のぞみ)車内, 丸の内・品川オフィスでの緊急スマホトラブル' },
  { code: 'de', name: 'German', persona: 'Praxisnaher deutscher Mobilfunk- und Smartphone-Experte, der Tipps verständlich erklärt', osUi: 'Einstellungen > Anzeige & Helligkeit, Akku, Speicher, Kurzbefehle', localeContext: 'Deutsche Bahn ICE (Frankfurt nach München), Berufsverkehr in Berlin, hektischer Büroalltag' },
  { code: 'fr', name: 'French', persona: 'Spécialiste support mobile français expliquant les astuces pour smartphone avec simplicité', osUi: 'Réglages > Luminosité et affichage, Batterie, Stockage, Raccourcis', localeContext: 'TGV (Paris à Lyon), métro parisien bondé à l\'heure de pointe, bureau à La Défense' },
  { code: 'es', name: 'Spanish', persona: 'Especialista en soporte móvil cotidiano que explica trucos de smartphone de forma clara', osUi: 'Ajustes > Pantalla y brillo, Batería, Almacenamiento, Atajos', localeContext: 'Tren AVE (Madrid-Barcelona), cercanías de Madrid, prisas por llegar a la reunión con el móvil casi apagado' },
  { code: 'it', name: 'Italian', persona: 'Tecnico riparatore smartphone italiano che spiega le soluzioni pratiche in modo semplice', osUi: 'Impostazioni > Schermo e luminosità, Batteria, Spazio, Comandi Rapidi', localeContext: 'Treno Frecciarossa (Milano-Roma), metro di Milano nell\'ora di punta, emergenze batteria prima dell\'incontro' },
  { code: 'pt', name: 'Portuguese', persona: 'Técnico de smartphones brasileiro gente boa que ensina a resolver perrengues de celular no dia a dia', osUi: 'Ajustes > Tela e Brilho, Bateria, Armazenamento, Atalhos', localeContext: 'Metrô de São Paulo, trânsito na Marginal Pinheiros/Paulista, celular esquentando no calor do transporte' },
  { code: 'nl', name: 'Dutch', persona: 'Nederlandse mobiele tech-specialist die smartphone-oplossingen in duidelijke mensentaal uitlegt', osUi: 'Instellingen > Scherm en helderheid, Batterij, Opslag, Opdrachten', localeContext: 'NS intercity trein (Utrecht-Amsterdam), Zuidas zakenwijk, drukke werkdagen' },
  { code: 'pl', name: 'Polish', persona: 'Polski ekspert od smartfonów tłumaczący przydatne triki i naprawy w prosty 방식', osUi: 'Ustawienia > Ekran i jasność, Bateria, Pamięć, Skróty', localeContext: 'Pociąg PKP Intercity, warszawskie Mordor, kryzys z rozładowanym smartfonem w drodze do pracy' },
  { code: 'id', name: 'Indonesian', persona: 'Teknisi smartphone Indonesia yang berbagi solusi praktis dan mudah dipahami sehari-hari', osUi: 'Pengaturan > Tampilan & Kecerahan, Baterai, Penyimpanan, Pintasan', localeContext: 'KRL Commuter Line Jabodetabek, kemacetan Jakarta, baterai boros saat jam sibuk pulang kerja' },
  { code: 'vi', name: 'Vietnamese', persona: 'Chuyên viên kỹ thuật di động thực chiến chia sẻ mẹo dùng điện thoại cực kỳ dễ hiểu', osUi: 'Cài đặt > Màn hình & Độ sáng, Pin, Dung lượng, Phím tắt', localeContext: 'Giờ cao điểm kẹt xe Hà Nội / TP.HCM, điện thoại sập nguồn trước cuộc gọi quan trọng' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `mobile-${Date.now().toString(36)}`;

async function fetchWithRetry(prompt, maxRetries = 15, delayMs = 20000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      console.warn(`⚠️ [호출 지연/에러] 시도 ${attempt}/${maxRetries}: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      console.log(`⏳ ${delayMs / 1000}초 동안 대기 후 다시 시도합니다...`);
      await delay(delayMs);
    }
  }
}

async function generateSinglePost(lang, index) {
  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const { coverUrl, bodyUrl } = getDistributedImages(index, currentTopic + fileSlug);

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 모바일 포스팅 생성 중... (적용 테마: ${selectedTheme.name})`);

  const postDate = new Date();
  const baseMinutes = 8 * 60 + 30 + Math.floor(index * 75);
  postDate.setHours(Math.floor(baseMinutes / 60), baseMinutes % 60, 0, 0);
  const pubDateIso = postDate.toISOString();

  // =========================================================================
  // [초보자 친화적 문체 + 주제 100% 집중 + 현지화 강화 프롬프트]
  // =========================================================================
  const prompt = `
You are a ${lang.persona}.
Write a highly practical, conversational, 1st-person mobile troubleshooting guide natively in ${lang.name}.
CRITICAL: DO NOT translate literally from Korean. Write completely from scratch as an authentic native user living and working in THAT specific country/culture.

[Topic]
${currentTopic}

[CRITICAL LOCALIZATION & REAL WORLD MOBILE CONTEXT (MANDATORY)]
- Target Locale Context: "${lang.localeContext}"
- ABSOLUTELY FORBIDDEN for non-Korean languages:
  * NEVER mention Korean infrastructure, trains, or places (NO KTX, NO Gyeongbu line, NO Seoul, NO Gangnam, NO Kakao/Naver) in English, Japanese, German, etc.
  * Your opening story MUST naturally incorporate the authentic local environment:
    - English (en): Caltrain, Amtrak Acela, US airports, Silicon Valley / New York transit.
    - Japanese (ja): Yamanote Line rush hour, Tokaido Shinkansen, Marunouchi commute.
    - German (de): Deutsche Bahn ICE, Frankfurt/Munich commute.
    - French (fr): TGV, Paris Metro, La Défense business district.
    - Italian (it): Frecciarossa trains, Milan Metro.
    - And corresponding native transit/workplace for other languages.
  * The protagonist must be 100% perceived as a local resident/worker of that country.

[CRITICAL OUTPUT LANGUAGE INTEGRITY - ZERO HANGUL IN GLOBAL POSTS]
- If target language is NOT Korean (ko):
  * Absolutely NEVER include any Korean Hangul characters (가-힣) anywhere in the title, description, tags, or body.
  * Special note for European languages: Never attach Korean phonetic words like "브랜드" to words containing "brand" (e.g., Dutch "OLED-inbranden" must be written strictly in native Dutch, NEVER with Korean text).
  * Every single character in the title and description MUST strictly be in native ${lang.name}.

[WRITING STYLE: PLAIN & EASY FOR EVERYDAY READERS (MANDATORY)]
1. Plain & Easy Explanations (NO OBSCURE JARGON):
   - Absolutely FORBIDDEN: Overly academic engineering jargon or obscure developer terms (NO "handshake", NO "SSH", NO "SoC", NO "chemical degradation", NO theoretical math equations).
   - Write in warm, friendly, everyday language that any ordinary smartphone user or commuter can immediately follow.
   - Use intuitive real-life analogies:
     * Instead of "excessive current in OLED subpixels causing thermal throttling", write: "Keeping a bright white screen on full brightness is like leaving your car high-beams on all day—it eats through your battery and strains your eyes."
     * Instead of "daemon background task CPU consumption", write: "It runs silently in the background without draining noticeable battery."
2. Laser-Focused Narrative (NO OFF-TOPIC RAMBLING):
   - The opening emergency story MUST be 100% strictly about the assigned [Topic] (${currentTopic}).
   - DO NOT ramble into unrelated technical setups (e.g., if the topic is Dark Mode, Battery Saving, or Screen settings, DO NOT talk about corporate VPNs, server SSH bugs, or Wi-Fi hotspot crashes).
   - Keep the opening story centered around the exact moment this specific mobile problem ruined the commute or workday (e.g., blinding glare in a dark train, sudden battery drop before an important call).

[TECHNICAL TEXT FORMATTING RULE (STRICT NO LATEX)]
- ABSOLUTELY FORBIDDEN: NEVER use LaTeX math delimiters or academic math symbols (DO NOT use $, $$, \\times, \\approx, \\degree).
- Always use plain, human-readable numbers and units:
  * Write "305 km/h" instead of "$305~km/h$"
  * Write "42°C" or "42 C" instead of "$42^{\\circ}C$"
  * Write "USB 3.2 x 2" instead of "USB 3.2 $\\times$ 2"
- Mobile-friendly formatting: DO NOT use complex, wide 4-column tables that break on mobile screens. Use clean 2-column key-value lists or bulleted summary cards instead.

[Design Theme & Layout Dynamic Rules (MANDATORY)]
- Assigned Theme: "${selectedTheme.name}"
- Primary Accent Color: ${selectedTheme.primaryColor}
- Layout Characteristic: ${selectedTheme.layout}
- You MUST incorporate native Markdown and inline styled HTML callouts tailored to this theme.
- Use custom styled tip/warning boxes (e.g., <div style="border-left: 4px solid ${selectedTheme.primaryColor}; padding: 12px 16px; margin: 20px 0; background-color: rgba(0,0,0,0.03); border-radius: 4px; color: #111827;">...</div>).
  * CRITICAL: All text inside callout/tip/warning boxes MUST be crisp dark charcoal/black (color: #111827) so it is 100% legible against any background.
  * Structure the sections uniquely based on: "${selectedTheme.layout}".

[Tone & Writing Style Rules (STRICT - NO AI VIBE)]
1. Mandatory Opening:
   - Absolutely FORBIDDEN: Boring textbook intros like "Hello", "In this post", "Today we will look into", "~습니다" rigid style.
   - Start immediately with an intense, sweat-inducing real smartphone emergency scenario strictly about [Topic] (e.g., "10 minutes before a crucial call with 5% battery", "squinting in pain from screen glare on a crowded train").
2. Tone & Voice:
   - Write like a real employee sharing an honest, relatable story on an anonymous workplace forum (like Blind / Reddit / 5ch) in an approachable 1st-person voice.
3. Fast-Paced 3-Step Narrative:
   - Step 1: Sudden mobile disaster regarding [Topic] set in ${lang.localeContext}.
   - Step 2: Desperate trial-and-error & wasted time (Real struggles that regular people face).
   - Step 3: The breakthrough easy tip & actionable step-by-step resolution.

[Content & Structure (AdSense E-E-A-T Compliant)]
1. Opening Story: Intense real workplace/commute incident strictly regarding this topic.
2. Root Cause Breakdown: Clearly explain 3 realistic root causes in simple, easy-to-understand words.
3. Step-by-Step Resolution:
   - Use official local mobile OS terminology matching: "${lang.osUi}".
   - Provide exact diagnostic and repair steps with actual easy-to-follow settings paths (e.g., Settings > Display > Dark Mode), shortcuts, or beginner-friendly actions.
4. Expert Warning / Advice: Practical precautions to prevent mobile data loss, battery damage, or screen burn-in.
5. Frequently Asked Questions (FAQ): Exactly 3 realistic, high-value Q&As that everyday users would ask.

[Length & Richness Rules]
- Korean (ko): Minimum 2,500 characters of rich, deep, non-repetitive text.
- Other languages: 1,200 to 1,500 words of thorough technical explanation.

[Strict Output Format]
Return ONLY raw Markdown. DO NOT wrap the output in markdown code fences. DO NOT include the post title as an H1 (# Title) in the body (the template automatically displays the title from frontmatter). Begin immediately with the frontmatter:

---
title: "Native Catchy Title in ${lang.name}"
description: "Native concise description in ${lang.name} under 160 characters"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "Mobile"
tags: ["Smartphone", "Troubleshooting", "iOS", "Android"]
theme: "${selectedTheme.name}"
---

(Body starts directly here without H1 header)
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    // 혹시라도 LLM이 LaTeX 수식 기호를 남겼을 경우를 대비한 안전 정규식 치환
    text = text.replace(/\$([^$]+)\$/g, '$1')
               .replace(/\\times/g, 'x')
               .replace(/\\circ/g, '°')
               .replace(/\\approx/g, '≈');

    // 비한국어 글인데 제목/설명에 한글 단어가 혼입된 경우 자동 제거 필터링
    if (lang.code !== 'ko') {
      text = text.replace(/(title:\s*")([^"]*)(")/g, (match, p1, p2, p3) => {
        return `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`;
      });
      text = text.replace(/(description:\s*")([^"]*)(")/g, (match, p1, p2, p3) => {
        return `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`;
      });
    }

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      const frontmatter = fmMatch[0];
      let body = text.slice(frontmatter.length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      // 본문 중간(2번째 큰 섹션 부근)에 스마트폰 관련 사진 안전 삽입
      const middleImageMarkdown = `\n\n![Smartphone Diagnostic & Troubleshooting](${bodyUrl})\n\n`;
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
    console.log(`✅ [성공] 2호기 저장 완료: src/data/post/${lang.code}/${fileSlug}.md (테마: ${selectedTheme.name})`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("📱 2호기 모바일 12개국 초고속 자동 포스팅 파이프라인 시작 (Picsum 고속 이미지)");
  console.log("==================================================");

  let successCount = 0;

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) {
      await delay(5000);
    }
  }

  if (successCount > 0) {
    lines.shift();
    fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🧹 총 ${successCount}개국 모바일 포스팅 완료. topics.txt에서 주제를 삭제했습니다.`);
    console.log(`📊 남은 주제 수: ${lines.length}개`);
  } else {
    console.error("\n❌ 모든 언어 생성이 실패하여 topics.txt를 유지합니다.");
    process.exit(1);
  }
}

run();
