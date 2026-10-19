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
  console.log(`\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 포스팅 생성 중... (Picsum 실사 적용)`);

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

[Strict Output Language Rules]
- Non-Korean posts MUST NOT contain any Korean characters (가-힣).

[Structure]
1. Opening emergency panic scenario strictly about ${currentTopic}.
2. 3 Realistic root causes.
3. Actionable step-by-step diagnostic and cleaning/repair steps.
4. Expert safety tips (battery/pin protection).
5. 3 Practical FAQs.

[Length]
- Korean: Minimum 2,500 characters.
- Global: 1,200 - 1,500 words.

[Format]
Return raw Markdown starting with frontmatter:
---
title: "Catchy Title in ${lang.name}"
description: "Brief summary in ${lang.name} under 160 chars"
publishDate: ${pubDateIso}
image: "${coverUrl}"
category: "Life & Tech"
tags: ["Mobile Repair", "Smartphone", "Fix Guide"]
---
(Body starts here)
`;

  try {
    let rawText = await fetchWithRetry(prompt);
    let text = rawText.trim();
    if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

    text = text.replace(/\$([^$]+)\$/g, '$1');

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

      frontmatter = frontmatter.replace(/publishDate:\s*["']([^"']+)["']/i, "publishDate: $1");
      frontmatter = frontmatter.replace(/image:\s*["'][^"']*["']/i, `image: '${coverUrl}'`);

      // 이미지 alt 텍스트 특수문자 제거 방어 로직
      const safeAlt = currentTopic.replace(/[\[\]\(\)"']/g, '').trim();
      const middleImageMarkdown = `\n\n![${safeAlt} Guide](${bodyUrl})\n\n`;

      const paragraphs = body.split('\n\n');
      if (paragraphs.length >= 3) {
        paragraphs.splice(2, 0, middleImageMarkdown.trim());
        body = paragraphs.join('\n\n');
      } else {
        body = `${middleImageMarkdown}${body}`;
      }

      text = `${frontmatter}\n${body}\n`;
    }

    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filePath = path.join(targetDir, `${fileSlug}.md`);
    fs.writeFileSync(filePath, text, 'utf-8');
    console.log(`✅ [저장 완료] 2호기: src/data/post/${lang.code}/${fileSlug}.md (카테고리: Life & Tech / Picsum 적용)`);
    return true;
  } catch (error) {
    console.error(`❌ [생성 실패] ${lang.name}:`, error.message);
    return false;
  }
}

async function run() {
  console.log("==================================================");
  console.log("⚡ 2호기 Life & Tech 12개국 Picsum 자동 포스팅 파이프라인 시작");
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
