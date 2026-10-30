// =========================================================================
// 📌 [고정 식별자] 이 파일은 '2호기' 전용 스크립트입니다.
// ⚠️ [혼동 방지 경고]
// 1. 이 파일은 '2호기 (Life & Tech)'입니다. 향후 나올 '2-2호기'와 절대 혼동하지 말 것!
// 2. 카테고리는 대표님의 지시 전까지 'life-tech'로 영구 고정한다. (임의 변경 절대 금지)
// 3. 이미지 경로는 main의 Picsum 시드 선택 로직을 유지한다.
// 4. 대표님과의 모든 설명, 질문, 대화 및 주석은 반드시 100% 한국어로만 진행한다.
// =========================================================================

import fs from 'fs';
import path from 'path';
import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { normalizeBoldSpacing, validateFaqLayout } from './markdown-normalizers.mjs';
import {
  createCheckpointKey,
  createLegacyCheckpointKey,
  createTopicFileSlug,
  decidePublishLocales,
} from './generation-identity.mjs';

const GENERATION_PROMPT_VERSION = '2026-10-30-first-person-story-v3';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}
const POSTS_BASE_DIR = path.resolve('src/data/post');
const TOPICS_FILE = path.resolve('topics.txt');

// =========================================================================
// [2호기 고유] Picsum 기반 시드 이미지 URL 동적 생성
// =========================================================================
function getPostImages(topic, index) {
  const seedBase = Date.now().toString(36);
  return {
    coverUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-c/1200/675.jpg`,
    bodyUrl: `https://picsum.photos/seed/mob-${seedBase}-${index}-b/1000/550.jpg`,
  };
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

function refreshPublishDate(text, publishDate) {
  const frontmatterMatch = text.match(/^---\r?\n[\s\S]*?\r?\n---(?=\r?\n)/);
  if (!frontmatterMatch) throw new Error('Checkpoint has no frontmatter.');
  const dateLines = frontmatterMatch[0].match(/^publishDate:\s*.*$/gm) || [];
  if (dateLines.length !== 1) throw new Error('Checkpoint must have exactly one publishDate field.');
  const updatedFrontmatter = frontmatterMatch[0].replace(/^publishDate:\s*.*$/m, 'publishDate: ' + publishDate);
  return updatedFrontmatter + text.slice(frontmatterMatch[0].length);
}

const CURRENT_PUBLISH_DATE = getKstPublishDateIso();

// =========================================================================
// [2호기 전용] 12개국 100% 현지어 섹션 제목 및 치환 딕셔너리 (영구 고정)
// =========================================================================
const I18N_SECTIONS = {
  ko: {
    s1: '1. 문제가 생긴 순간과 먼저 확인할 것',
    s2: '2. 증상으로 원인을 구분하는 방법',
    s3: '3. 안전하게 따라 하는 해결 순서',
    s4: '4. 실수 방지와 전문가 도움을 받을 때',
    s5: '5. 자주 묻는 질문 (FAQ)',
    tags: ['스마트폰수리', '모바일팁', '트러블슈팅', '배터리케어'],
  },
  en: {
    s1: '1. The Moment It Happens: What to Check First',
    s2: '2. What the Symptoms Can Tell You',
    s3: '3. Safe Steps to Solve the Problem',
    s4: '4. Mistakes to Avoid and When to Get Help',
    s5: '5. Frequently Asked Questions (FAQ)',
    tags: ['Mobile Repair', 'Smartphone', 'Fix Guide', 'Tech Tips'],
  },
  ja: {
    s1: '1. トラブルが起きた瞬間に最初に確認すること',
    s2: '2. 症状から原因を見分ける',
    s3: '3. 安全に試す解決手順',
    s4: '4. 避けるべき操作と相談の目安',
    s5: '5. よくある質問 (FAQ)',
    tags: ['スマホ修理', 'ハードウェア', 'トラブルシューティング', 'バッテリーケア'],
  },
  de: {
    s1: '1. Der Moment, in dem es passiert: Das zuerst prüfen',
    s2: '2. Was die Symptome verraten',
    s3: '3. Sichere Schritte zur Lösung',
    s4: '4. Fehler vermeiden und wissen, wann Hilfe nötig ist',
    s5: '5. Häufige Fragen (FAQ)',
    tags: ['Smartphone-Reparatur', 'Hardware', 'Fehlerbehebung', 'Akku-Pflege'],
  },
  fr: {
    s1: '1. Au moment du problème : les premières vérifications',
    s2: '2. Ce que les symptômes peuvent indiquer',
    s3: '3. Les étapes sûres pour résoudre le problème',
    s4: '4. Les erreurs à éviter et quand demander de l’aide',
    s5: '5. Questions fréquentes (FAQ)',
    tags: ['Réparation Smartphone', 'Matériel', 'Dépannage', 'Entretien Batterie'],
  },
  es: {
    s1: '1. Cuando ocurre: qué comprobar primero',
    s2: '2. Qué pueden indicar los síntomas',
    s3: '3. Pasos seguros para resolverlo',
    s4: '4. Errores que conviene evitar y cuándo pedir ayuda',
    s5: '5. Preguntas frecuentes (FAQ)',
    tags: ['Reparación Móvil', 'Hardware', 'Solución de Problemas', 'Cuidado Batería'],
  },
  it: {
    s1: '1. Quando succede: cosa controllare per prima cosa',
    s2: '2. Cosa possono indicare i sintomi',
    s3: '3. I passaggi sicuri per risolvere il problema',
    s4: '4. Errori da evitare e quando chiedere assistenza',
    s5: '5. Domande frequenti (FAQ)',
    tags: ['Riparazione Smartphone', 'Hardware', 'Risoluzione Problemi', 'Cura Batteria'],
  },
  pt: {
    s1: '1. Quando acontece: o que verificar primeiro',
    s2: '2. O que os sintomas podem indicar',
    s3: '3. Etapas seguras para resolver o problema',
    s4: '4. Erros a evitar e quando pedir ajuda',
    s5: '5. Perguntas frequentes (FAQ)',
    tags: ['Reparo Celular', 'Hardware', 'Solução de Problemas', 'Cuidado Bateria'],
  },
  nl: {
    s1: '1. Op het moment zelf: wat controleer je eerst?',
    s2: '2. Wat de symptomen kunnen betekenen',
    s3: '3. Veilige stappen om het probleem op te lossen',
    s4: '4. Wat je beter niet doet en wanneer je hulp vraagt',
    s5: '5. Veelgestelde vragen (FAQ)',
    tags: ['Smartphone Reparatie', 'Hardware', 'Probleemoplossing', 'Accuzorg'],
  },
  pl: {
    s1: '1. Gdy to się dzieje: co najpierw sprawdzić',
    s2: '2. Co mogą oznaczać objawy',
    s3: '3. Bezpieczne kroki rozwiązania problemu',
    s4: '4. Czego unikać i kiedy szukać pomocy',
    s5: '5. Częste pytania (FAQ)',
    tags: ['Naprawa Smartfona', 'Sprzęt', 'Rozwiązywanie Problemów', 'Kondycja Baterii'],
  },
  id: {
    s1: '1. Saat masalah muncul: apa yang diperiksa lebih dulu',
    s2: '2. Arti gejala yang terlihat',
    s3: '3. Langkah aman untuk mengatasinya',
    s4: '4. Hal yang perlu dihindari dan kapan mencari bantuan',
    s5: '5. Pertanyaan umum (FAQ)',
    tags: ['Reparasi HP', 'Perangkat Keras', 'Troubleshooting', 'Perawatan Baterai'],
  },
  vi: {
    s1: '1. Khi sự cố xảy ra: điều cần kiểm tra trước tiên',
    s2: '2. Triệu chứng có thể cho biết điều gì',
    s3: '3. Các bước an toàn để xử lý',
    s4: '4. Điều cần tránh và khi nào cần trợ giúp',
    s5: '5. Câu hỏi thường gặp (FAQ)',
    tags: ['Sửa Điện Thoại', 'Phần Cứng', 'Khắc Phục Sự Cố', 'Bảo Vệ Pin'],
  },
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
    auditLogs.push('1번 헤딩 주입');
  }

  // 2) 🛡️ Q&A 줄바꿈 뭉개짐 자동 분리 치유 (질문과 답변 사이 빈 줄 2개 보장)
  const rawQnACount = (healed.match(/Q[1-3]\./gi) || []).length;
  if (rawQnACount > 0) {
    healed = healed.replace(/\s*(\*\*Q[1-3]\.\*\*|Q[1-3]\.)\s*/gi, '\n\n**$1** ');
    healed = healed.replace(/\s*(\*\*A[1-3]\.\*\*|A[1-3]\.)\s*/gi, '\n\n**$1** ');
    healed = healed.replace(/\*\*\s*\*\*(Q[1-3]\.|A[1-3]\.)\*\*\s*\*\*/gi, '**$1**');
    healed = healed.replace(/\*\*(Q[1-3]\.|A[1-3]\.)\*\*/gi, '**$1**');
    auditLogs.push('Q&A 줄바꿈 2열 분리 치유');
  }

  // 3) 볼드 기호 안쪽 공백 정돈. 헬퍼는 줄 경계를 넘지 않습니다.
  const normalizedBoldSpacing = normalizeBoldSpacing(healed);
  if (normalizedBoldSpacing !== healed) {
    healed = normalizedBoldSpacing;
    auditLogs.push('볼드 공백 정돈');
  }

  // 4) 특수문자 및 수식 인라인 백틱화
  healed = healed.replace(/\$(?:Strg|Ctrl|Win|Shift|Alt|Esc)\s*[^$\n]*\$/gi, (match) => {
    return `\`${match.replace(/\$/g, '').trim()}\``;
  });
  healed = healed.replace(/\$([A-Za-z0-9_-]+)\$/g, '`$1`');
  healed = healed
    .replace(/\\times/g, 'x')
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
  console.error('❌ topics.txt 파일이 존재하지 않습니다.');
  process.exit(1);
}

const fileContent = fs.readFileSync(TOPICS_FILE, 'utf-8');
const lines = fileContent
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l.length > 0);

if (lines.length === 0) {
  console.log('⚠️ topics.txt에 남은 주제가 없습니다. 생성을 건너뜁니다.');
  process.exit(0);
}

const currentTopic = lines[0];
const topicKey = createCheckpointKey(lines, GENERATION_PROMPT_VERSION);
const checkpointRoot = path.resolve('.generation-checkpoints');
const checkpointDir = path.join(checkpointRoot, topicKey);
const legacyCheckpointKey = createLegacyCheckpointKey(lines, GENERATION_PROMPT_VERSION);
const legacyCheckpointDir = path.join(checkpointRoot, legacyCheckpointKey);

// Migrate a pre-fix cache only when the full topic queue still matches exactly.
if (legacyCheckpointKey !== topicKey && fs.existsSync(legacyCheckpointDir) && !fs.existsSync(checkpointDir)) {
  fs.renameSync(legacyCheckpointDir, checkpointDir);
  console.log('♻️ 기존 전체 topic 목록 기준 locale 체크포인트를 현재 주제 키로 이전합니다.');
}
const checkpointEncryptionKey = createHash('sha256')
  .update('blog-locale-checkpoint-v1\0', 'utf8')
  .update(OPENAI_API_KEY, 'utf8')
  .digest();

function readEncryptedCheckpoint(filePath) {
  const envelope = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (envelope.version !== 1) throw new Error('체크포인트 형식 버전이 다릅니다.');
  const decipher = createDecipheriv('aes-256-gcm', checkpointEncryptionKey, Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString(
    'utf8'
  );
}

function writeEncryptedCheckpoint(filePath, text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', checkpointEncryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const envelope = {
    version: 1,
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  };
  fs.writeFileSync(filePath, JSON.stringify(envelope), 'utf8');
}
console.log(`📌 오늘 처리할 주제 [2호기 Life & Tech]: "${currentTopic}"`);

const THEME_PRESETS = [
  {
    id: 1,
    name: 'Cyberpunk Terminal',
    primaryColor: '#00ffcc',
    bgColor: '#111827',
    layout: 'CLI/진단기 로그 스타일, 하드웨어 점검 단축 경로 최상단 배치',
  },
  {
    id: 2,
    name: 'Modern Minimalist Slate',
    primaryColor: '#3b82f6',
    bgColor: '#f8fafc',
    layout: '미니멀 가이드 스타일, 여백 중심의 깔끔한 단계별 분해/세척 넘버링',
  },
  {
    id: 3,
    name: 'Industrial Blueprint',
    primaryColor: '#f59e0b',
    bgColor: '#1e293b',
    layout: '엔지니어링 청사진 스타일, 부품 단자 접촉 불량 원인 시각화, 쉬운 3단 비교표 포함',
  },
  {
    id: 4,
    name: 'Retro Monokai',
    primaryColor: '#a6e22e',
    bgColor: '#272822',
    layout: '테크니션 워크벤치 스타일, 실전 세척/수리 주의 팁 강조 박스 중심',
  },
  {
    id: 5,
    name: 'Nordic Clean Ice',
    primaryColor: '#0284c7',
    bgColor: '#f0f9ff',
    layout: '북유럽 감성 클린 레이아웃, 인용구 중심 도입부, 필수 준비물 체크리스트',
  },
];

const TARGET_LANGS = [
  {
    code: 'ko',
    name: 'Korean',
    persona: '친절하고 실무 경험이 많은 모바일 스마트폰 전문 수리 기사',
    localeContext: '서울/수도권 일상 및 직장 오피스',
  },
  {
    code: 'en',
    name: 'English',
    persona: 'Expert mobile repair technician and smartphone specialist',
    localeContext: 'Metropolitan US tech workplace & everyday commuting',
  },
  {
    code: 'ja',
    name: 'Japanese',
    persona: 'スマホ修理とハードウェアトラブルシューティングの専門家',
    localeContext: '東京・丸の内および首都圏の通勤・オフィス環境',
  },
  {
    code: 'de',
    name: 'German',
    persona: 'Erfahrener Smartphone- und Mobilgeräte-Techniker',
    localeContext: 'Berlin / München Unternehmens- und Alltagsalltag',
  },
  {
    code: 'fr',
    name: 'French',
    persona: 'Technicien réparateur spécialiste en smartphones et appareils mobiles',
    localeContext: 'Paris La Défense et environnement urbain quotidien',
  },
  {
    code: 'es',
    name: 'Spanish',
    persona: 'Técnico especialista en telefonía móvil y reparación de terminales',
    localeContext: 'Madrid y centros corporativos urbanos',
  },
  {
    code: 'it',
    name: 'Italian',
    persona: 'Tecnico esperto in riparazione e diagnostica smartphone',
    localeContext: 'Milano centro direzionale e vita quotidiana',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    persona: 'Técnico experiente em reparação de celulares e hardware móvel',
    localeContext: 'São Paulo ambiente corporativo e transporte diário',
  },
  {
    code: 'nl',
    name: 'Dutch',
    persona: 'Smartphone reparatiespecialist en mobiele hardware-expert',
    localeContext: 'Amsterdam Zuidas en forenzenverkeer',
  },
  {
    code: 'pl',
    name: 'Polish',
    persona: 'Serwisant urządzeń mobilnych i smartfonów',
    localeContext: 'Warszawa centrum i codzienne wyzwania biurowe',
  },
  {
    code: 'id',
    name: 'Indonesian',
    persona: 'Teknisi profesional perbaikan smartphone dan gadget',
    localeContext: 'Kawasan Sudirman Jakarta dan mobilitas harian',
  },
  {
    code: 'vi',
    name: 'Vietnamese',
    persona: 'Kỹ thuật viên sửa chữa điện thoại thông minh giàu kinh nghiệm',
    localeContext: 'Văn phòng trung tâm TP.HCM và nhịp sống đô thị',
  },
];

const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const fileSlug = createTopicFileSlug(currentTopic);
const generatedPostContents = new Map();

// 이전 주제 체크포인트를 정리하고, 같은 topics 큐의 검증된 언어 원고는 실패 뒤 재사용합니다.
if (fs.existsSync(checkpointRoot)) {
  for (const entry of fs.readdirSync(checkpointRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== topicKey) {
      fs.rmSync(path.join(checkpointRoot, entry.name), {
        recursive: true,
        force: true,
      });
    }
  }
}

if (fs.existsSync(checkpointDir)) {
  for (const fileName of fs.readdirSync(checkpointDir)) {
    if (fileName.endsWith('.md')) {
      fs.unlinkSync(path.join(checkpointDir, fileName));
    }
  }
}

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
  const description = fm[1].match(/^description:\s*["']?([^\r\n"']*)/m)?.[1]?.trim() || '';
  if (description.length > 160) errors.push('description 160자 초과');
  if (!/^image:\s*["']?https?:\/\//m.test(fm[1])) errors.push('image URL 형식 오류');

  const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, ' ');
  const plainBody = bodyWithoutCode
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[[^\]]+\]\([^)]+\)/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/[>*_~|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const nonSpaceLength = [...plainBody].filter((char) => !/\s/u.test(char)).length;
  const words = [...plainBody.matchAll(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)].length;
  if ((bodyWithoutCode.match(/^##\s+/gm) || []).length !== 5) errors.push('H2 섹션은 정확히 5개여야 함');
  errors.push(...validateFaqLayout(bodyWithoutCode));
  if (langCode === 'ko' && nonSpaceLength < 1800) errors.push('한국어 본문 공백 제외 1,800자 미만');
  if (langCode === 'ko' && nonSpaceLength > 3600) errors.push('한국어 본문 공백 제외 3,600자 초과');
  if (langCode === 'ja' && nonSpaceLength < 900) errors.push('일본어 본문 공백 제외 900자 미만');
  if (!['ko', 'ja'].includes(langCode) && words < 650) errors.push('본문 650단어 미만');
  if (!['ko', 'ja'].includes(langCode) && words > 1500) errors.push('본문 1,500단어 초과');

  const hangulCount = (plainBody.match(/[가-힣]/g) || []).length;
  const kanaCount = (plainBody.match(/[\u3040-\u30ff]/g) || []).length;
  const latinCount = (plainBody.match(/\p{Script=Latin}/gu) || []).length;
  if (langCode === 'ko' && hangulCount < 300) errors.push('한국어 본문 한글 문자 부족');
  if (langCode === 'ja' && kanaCount < 80) errors.push('일본어 본문 가나 문자 부족');
  if (langCode !== 'ko' && hangulCount > 0) errors.push('비한국어 본문에 한글 포함');
  if (langCode !== 'ja' && kanaCount > 40) errors.push('일본어 외 본문에 가나 문자 과다 포함');
  if (!['ko', 'ja'].includes(langCode) && latinCount < words * 0.6)
    errors.push('본문 문자 체계가 라틴 문자 locale과 맞지 않음');
  return errors;
}
async function generateSinglePost(lang, index) {
  const checkpointPath = path.join(checkpointDir, `${lang.code}.enc`);
  if (fs.existsSync(checkpointPath)) {
    try {
      const cachedText = readEncryptedCheckpoint(checkpointPath);
      const refreshedCachedText = refreshPublishDate(cachedText, CURRENT_PUBLISH_DATE);
      const cachedErrors = validateGeneratedPost(refreshedCachedText, lang.code);
      if (cachedErrors.length === 0) {
        if (refreshedCachedText !== cachedText) writeEncryptedCheckpoint(checkpointPath, refreshedCachedText);
        generatedPostContents.set(lang.code, refreshedCachedText);
        console.log(`\n♻️ [${index + 1}/12] ${lang.name} (${lang.code}) 암호화된 검증 원고 재사용`);
        return true;
      }
      fs.unlinkSync(checkpointPath);
      console.warn(`⚠️ ${lang.code} 체크포인트 검수 실패로 다시 생성합니다: ${cachedErrors.join(', ')}`);
    } catch {
      fs.unlinkSync(checkpointPath);
      console.warn(`⚠️ ${lang.code} 암호화 체크포인트를 읽을 수 없어 다시 생성합니다.`);
    }
  }

  const selectedTheme = THEME_PRESETS[Math.floor(Math.random() * THEME_PRESETS.length)];
  const selectedScenario = currentTopic;
  const i18n = I18N_SECTIONS[lang.code] || I18N_SECTIONS.ko;

  console.log(
    `\n🚀 [${index + 1}/12] ${lang.name} (${lang.code}) 2호기 애드센스 표준 생성 중... (테마: ${selectedTheme.name})`
  );

  const { coverUrl, bodyUrl } = getPostImages(currentTopic, index);
  const pubDateIso = CURRENT_PUBLISH_DATE;

  // 🎯 [애드센스 승인 최적화 프롬프트: 2,400~2,600자 정량화]
  const prompt = `
Write as a clear, warm, knowledgeable guide for ${lang.name} readers; do not claim to be a repair technician or to have personally handled this phone.
Write an original, high-quality, practical mobile technology guide about the assigned topic, natively in ${lang.name}. This is a separate locale-specific generation call, not a translation of another locale's finished article.
Target Culture: "${lang.localeContext}"
Assigned Situation: "${selectedScenario}"
Topic: "${currentTopic}"

[ADSENSE QUALITY & LENGTH REQUIREMENT]
- For Korean (ko): Write exactly around 2,400 - 2,600 characters (do NOT exceed 3,000 characters).
- For other languages: Write exactly 900 - 1,100 words.
- Tone: Highly informative, professional, practical technician advice.
- Narrative voice: Carry a natural, topic-fit first-person storytelling voice throughout the full article. Use the guide narrator's reasoning, choices, and transitions to move the explanation forward; make first person the default narrative voice, not a personal anecdote.
- Keep roughly 30% engaging narrative and narrator reasoning/transitions and 70% verified explanations, practical steps, and safety information. Use phrasing such as "I would first check…" to explain what to check and why, but do not force "I" into every sentence. Never imply that the author actually performed the repair or experienced the event.
- In the opening paragraph, naturally present a specific situation the reader may recognize and the key unresolved question; answer it in useful stages so each section gives a reason to keep reading. Use the narrator's first-person reasoning and brief transitions to connect sections. Avoid exaggeration, clickbait, fabricated experiences, and rigid opening formulas; phrase this naturally for the locale.
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
    const normalizeGeneratedResponse = (rawText) => {
      let text = rawText.trim();
      if (text.startsWith('```markdown')) text = text.replace(/^```markdown\n/, '').replace(/\n```$/, '');
      if (text.startsWith('```')) text = text.replace(/^```\n/, '').replace(/\n```$/, '');

      const fmMatch = text.match(/^---[\s\S]*?---\n*/);
      if (fmMatch) {
        let frontmatter = fmMatch[0].trim();
        let body = text.slice(fmMatch[0].length).trim();
        body = body.replace(/^#\s+[^\n]+\n+/, '');

        // ⚠️ 2호기 카테고리 'life-tech' 영구 보존 강제 검증
        frontmatter = frontmatter
          .replace(/category:\s*["'][^"']*["']/i, 'category: "life-tech"')
          .replace(/category:\s*[^\n\r]+/i, 'category: "life-tech"');

        // 🩺 [자가 검수 및 치유 엔진 가동]
        body = inspectAndHealMarkdown(body, lang.code);

        if (lang.code === 'ko') {
          console.log(`   📏 [2호기 본문 최종 글자 수] ${body.length}자 (애드센스 표준: 2,400~2,600자)`);
        }

        // 본문 중간 이미지 배치 (2번 섹션 직전)
        const safeAlt = currentTopic
          .replaceAll('[', '')
          .replaceAll(']', '')
          .replaceAll('(', '')
          .replaceAll(')', '')
          .replaceAll('"', '')
          .replaceAll("'", '')
          .trim();
        const middleImageMarkdown = `\n\n![${safeAlt} Mobile Repair Guide](${bodyUrl})\n\n`;

        if (!body.includes(bodyUrl)) {
          if (body.includes('## 2.')) {
            body = body.replace(/(##\s*2\.[^\n]+)/, `${middleImageMarkdown}$1`);
          } else {
            body = `${middleImageMarkdown}${body}`;
          }
        }

        text = `${frontmatter}\n\n${body}\n`;
      }

      return text;
    };

    let text = normalizeGeneratedResponse(await fetchWithRetry(prompt));
    let validationErrors = validateGeneratedPost(text, lang.code);
    for (let correctionAttempt = 1; validationErrors.length > 0 && correctionAttempt <= 2; correctionAttempt++) {
      console.warn(
        `⚠️ ${lang.code} 검수 실패(${validationErrors.join(', ')}). 해당 언어 correction ${correctionAttempt}/2 요청합니다.`
      );
      const repairPrompt = `You are correcting one generated ${lang.name} article for "${currentTopic}".\n\nFailed validation checks: ${validationErrors.join(', ')}. Return the complete Markdown including original frontmatter. Preserve existing useful content and factual meaning. Correct only the listed failures. If H2 headings are missing, use exactly these localized headings: ${[i18n.s1, i18n.s2, i18n.s3, i18n.s4, i18n.s5].map((heading) => '## ' + heading).join(' | ')}. Reorganize relevant existing content without adding filler, unsupported facts, invented first-person experiences, or customer anecdotes. Preserve required FAQ markers and language. Return raw Markdown only.\n\nOriginal article:\n${text}`;
      text = normalizeGeneratedResponse(await fetchWithRetry(repairPrompt));
      validationErrors = validateGeneratedPost(text, lang.code);
    }
    if (validationErrors.length > 0) {
      throw new Error('발행 전 검수 실패(보정 2회 후): ' + validationErrors.join(', '));
    }

    fs.mkdirSync(checkpointDir, { recursive: true });
    writeEncryptedCheckpoint(checkpointPath, text);
    generatedPostContents.set(lang.code, text);
    console.log(`   ✅ [검증 완료] ${lang.code} 원고를 재실행 복구용 체크포인트로 보존했습니다.`);
    return true;
  } catch (error) {
    console.error(`❌ [최종 실패] ${lang.name} 생성 실패:`, error.message);
    return false;
  }
}

async function run() {
  console.log('==================================================');
  console.log('⚡ [2호기 Life & Tech] 12개 언어 원고 검증 및 게시 시작 (최소 10개 통과)');
  console.log('==================================================');

  for (let i = 0; i < TARGET_LANGS.length; i++) {
    await generateSinglePost(TARGET_LANGS[i], i);
    if (i < TARGET_LANGS.length - 1) await delay(2000);
  }

  const publication = decidePublishLocales(TARGET_LANGS, [...generatedPostContents.keys()], 10);
  const successCount = publication.passingCodes.length;
  const failedCodes = publication.failedCodes;
  if (!publication.canPublish) {
    console.error(
      `세트 중단: 검증 통과 ${successCount}/12개로 최소 기준 10개 미만입니다. 실패 언어: ${failedCodes.join(', ')}. 공개 글과 topics.txt는 그대로 두고 암호화 체크포인트를 보존합니다.`
    );
    process.exit(1);
  }

  // 유효한 locale만 게시 직전 재검증하고 기록합니다.
  for (const lang of publication.passingLocales) {
    const text = generatedPostContents.get(lang.code);
    if (typeof text !== 'string') throw new Error(`Missing validated locale checkpoint: ${lang.code}`);
    const errors = validateGeneratedPost(text, lang.code);
    if (errors.length) throw new Error(`${lang.code} 게시 직전 검증 실패: ${errors.join(', ')}`);
  }
  for (const lang of publication.passingLocales) {
    const text = generatedPostContents.get(lang.code);
    if (typeof text !== 'string') throw new Error(`Missing validated locale checkpoint: ${lang.code}`);
    const targetDir = path.join(POSTS_BASE_DIR, lang.code);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, `${fileSlug}.md`), text, 'utf-8');
  }

  lines.shift();
  fs.writeFileSync(TOPICS_FILE, lines.join('\n'), 'utf-8');
  console.log(`\n🧹 ${successCount}/12개 언어를 게시하고 topics.txt에서 주제를 소비했습니다.`);
  if (failedCodes.length > 0) console.warn(`⚠️ 이번 세트에서 제외된 언어: ${failedCodes.join(', ')}`);
  console.log(`📊 남은 주제 수: ${lines.length}개`);
}

run();
