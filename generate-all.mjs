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
// [2호기 전용] 100% 무에러 영구 고정 Picsum 실사 CDN 매핑
// =========================================================================
function getPostImages(topic, index) {
  const seedBase = Date.now().toString(36);
  const coverSeed = `mob-${seedBase}-${index}-c`;
  const bodySeed = `mob-${seedBase}-${index}-b`;

  return {
    coverUrl: `https://picsum.photos/seed/${coverSeed}/1200/675.jpg`,
    bodyUrl: `https://picsum.photos/seed/${bodySeed}/1000/550.jpg`
  };
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

// =========================================================================
// 30가지 고유 시각 스타일 및 레이아웃 프리셋 (모바일 수리/하드웨어 최적화)
// =========================================================================
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
  { id: 13, name: "High-Contrast Charcoal", primaryColor: "#e11d48", bgColor: "#18181b", layout: "고대비 경보 스타일, 데이터 손실 및 쇼트 방지 수칙, 긴급 전원 차단 팁" },
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
  { code: 'ko', name: 'Korean', persona: '친절하고 실무 경험이 많은 모바일 스마트폰 전문 수리 기사', localeContext: '서울/수도권 일상, 스마트폰 고속 충전 먹통 및 발열 문제' },
  { code: 'en', name: 'English', persona: 'Expert mobile repair technician and smartphone specialist', localeContext: 'US tech office, sudden charging port failure before important meeting' },
  { code: 'ja', name: 'Japanese', persona: 'スマホ修理とハードウェアトラブルシューティングの専門家', localeContext: '東京のオフィス街、外出直前のスマホ急速充電エラー' },
  { code: 'de', name: 'German', persona: 'Erfahrener Smartphone- und Mobilgeräte-Techniker', localeContext: 'Berlin / München Büro, USB-C Ladebuchsen-Defekt' },
  { code: 'fr', name: 'French', persona: 'Technicien réparateur spécialiste en smartphones et appareils mobiles', localeContext: 'Paris La Défense, panne de charge rapide sur mobile' },
  { code: 'es', name: 'Spanish', persona: 'Técnico especialista en telefonía móvil y reparación de terminales', localeContext: 'Madrid oficina, problemas de puerto de carga en el smartphone' },
  { code: 'it', name: 'Italian', persona: 'Tecnico esperto in riparazione e diagnostica smartphone', localeContext: 'Milano centro direzionale, malfunzionamento della ricarica' },
  { code: 'pt', name: 'Portuguese', persona: 'Técnico experiente em reparação de celulares e hardware móvel', localeContext: 'São Paulo ambiente corporativo, conector de charge emperrado' },
  { code: 'nl', name: 'Dutch', persona: 'Smartphone reparatiespecialist en mobiele hardware-expert', localeContext: 'Amsterdam Zuidas, laadproblemen met smartphone' },
  { code: 'pl', name: 'Polish', persona: 'Serwisant urządzeń mobilnych i smartfonów', localeContext: 'Warszawa centrum, problem z gniazdem ładowania' },
  { code: 'id', name: 'Indonesian', persona: 'Teknisi profesional perbaikan smartphone dan gadget', localeContext: 'Jakarta kawasan bisnis, masalah port charger longgar' },
  { code: 'vi', name: 'Vietnamese', persona: 'Kỹ thuật viên sửa chữa điện thoại thông minh giàu kinh nghiệm', localeContext: 'Văn phòng TP.HCM, lỗi sạc nhanh cổng type C' }
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = `post-${Date.now().toString(36)}`;

async function fetchWithRetry(prompt, maxRetries = 15, delayMs = 20000) {
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

  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 포스팅 생성 중... (적용 테마: ${selectedTheme.name})`);

  const { coverUrl, bodyUrl } = getPostImages(currentTopic, index);

  const postDate = new Date();
  const baseMinutes = 8 * 60 + 30 + Math.floor(index * 75);
  postDate.setHours(Math.floor(baseMinutes / 60), baseMinutes % 60, 0, 0);
  const pubDateIso = postDate.toISOString();

  const prompt = `
You are a ${lang.persona}.
Write a highly practical, conversational, 1st-person mobile hardware troubleshooting guide natively in ${lang.name}.
CRITICAL: DO NOT translate literally from Korean. Write completely from scratch as an authentic native technician.

[Topic]
${currentTopic}

[Workplace Scenario]
Context: "${lang.localeContext}"

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
    - The opening emergency story MUST be 100% strictly about the assigned [Topic] (${currentTopic}).

[TECHNICAL TEXT FORMATTING RULE (STRICT NO LATEX)]
- ABSOLUTELY FORBIDDEN: NEVER use LaTeX math delimiters or academic math symbols (DO NOT use $, $$, \\times, \\approx, \\degree).
- Always use plain, human-readable numbers and units:
    * Write "45°C", "9V 2A", "25W" instead of LaTeX.
- Clean 2-column key-value lists or bulleted cards instead of overly wide 4-column tables that break on mobile screens.

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
    - Start immediately with an intense, relatable panic moment strictly about [Topic] (e.g., 5% battery left with client calls pending and port refusing to charge).
2. Tone & Voice:
    - Write like an experienced repair shop owner sharing honest, battle-tested practical tips.
3. Fast-Paced 3-Step Narrative:
    - Step 1: Sudden charging/port panic regarding [Topic] set in ${lang.localeContext}.
    - Step 2: Dangerous mistakes people make (e.g., using sharp metal pins, blowing saliva).
    - Step 3: Safe, actionable diagnostic and cleaning/repair steps.

[Content & Structure (AdSense E-E-A-T Compliant)]
1. Opening Story: Intense real-life incident strictly regarding this topic.
2. Root Cause Breakdown: Clearly explain 3 realistic root causes behind the port/battery/charging failure.
3. Step-by-Step Resolution: Actionable, safe diagnostic and cleaning/inspection steps.
4. Expert Warning / Safety Tip: Crucial warnings on battery safety, pin deformation, or liquid contact.
5. Frequently Asked Questions (FAQ): Exactly 3 realistic, high-value Q&As that users frequently ask.

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
category: "Life & Tech"
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

    if (lang.code !== 'ko') {
      text = text.replace(/(title:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
      text = text.replace(/(description:\s*")([^"]*)(")/g, (match, p1, p2, p3) => `${p1}${p2.replace(/[가-힣]+/g, '').trim()}${p3}`);
    }

    const fmMatch = text.match(/^---[\s\S]*?---\n*/);
    if (fmMatch) {
      let frontmatter = fmMatch[0];
      let body = text.slice(frontmatter.length).trim();
      body = body.replace(/^#\s+[^\n]+\n+/, '');

      // 2호기 영구 고정 단일 카테고리: Life & Tech
      frontmatter = frontmatter.replace(/category:\s*["'][^"']*["']/i, "category: 'Life & Tech'")
                               .replace(/category:\s*[^\n\r]+/i, "category: 'Life & Tech'");

      // Cloudflare 빌드 실패 방지: publishDate 따옴표 제거
      frontmatter = frontmatter.replace(/publishDate:\s*["']([^"']+)["']/i, "publishDate: $1");

      // 대표 이미지 경로 강제 동기화
      frontmatter = frontmatter.replace(/image:\s*["'][^"']*["']/i, `image: '${coverUrl}'`);

      // 이미지 alt 텍스트 특수문자 제거 방어 로직
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
    console.log(`✅ [저장 완료] 2호기: src/data/post/${lang.code}/${fileSlug}.md (Life & Tech / 테마: ${selectedTheme.name})`);
    return true;
  } catch (error) {
    console.error(`❌ [생성 실패] ${lang.name}:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("⚡ 2호기 Life & Tech 12개국 30가지 테마 Picsum 자동 포스팅 파이프라인 시작");
  console.log("==================================================");

  let successCount = 0;
  for (let i = 0; i < TARGET_LANGS.length; i++) {
    const isSuccess = await generateSinglePost(TARGET_LANGS[i], i);
    if (isSuccess) successCount++;
    if (i < TARGET_LANGS.length - 1) await delay(5000);
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
