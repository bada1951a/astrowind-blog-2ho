import fs from 'fs';
import path from 'path';

const POSTS_BASE_DIR = path.resolve('src/data/post');

// 2호기 전용 12개국 표준 소제목 딕셔너리
const I18N_SECTIONS = {
  ko: {
    s1: "1. 스마트폰 먹통 돌발 위기 상황",
    s2: "2. 충전 오류 및 하드웨어 결함의 핵심 원인 분석",
    s3: "3. 1분 만에 끝내는 단계별 실전 응급 조치법",
    s4: "4. 현직 수리 기사가 전하는 주의사항 및 팁",
    s5: "5. 자주 묻는 질문 (FAQ)"
  },
  en: {
    s1: "1. Critical Smartphone Emergency Situation",
    s2: "2. Root Cause Breakdown of Port and Hardware Failures",
    s3: "3. Step-by-Step Practical Emergency Resolution",
    s4: "4. Professional Repair Technician Precautions & Tips",
    s5: "5. Frequently Asked Questions (FAQ)"
  },
  ja: {
    s1: "1. スマホが突然動かなくなった緊急トラブル",
    s2: "2. 充電不良とハードウェア障害の根本原因",
    s3: "3. 1分で完了する実践的な応急処置手順",
    s4: "4. 現役修理技術者が教える注意点とコツ",
    s5: "5. よくある質問 (FAQ)"
  },
  de: {
    s1: "1. Kritischer Smartphone-Notfall im Alltag",
    s2: "2. Detaillierte Ursachenanalyse von Lade- und Hardwarefehlern",
    s3: "3. Schritt-für-Schritt-Anleitung zur Notfallbehebung",
    s4: "4. Praxistipps und Warnungen vom Reparatur-Experten",
    s5: "5. Häufig gestellte Fragen (FAQ)"
  },
  fr: {
    s1: "1. Situation d'urgence critique sur smartphone",
    s2: "2. Analyse approfondie des pannes matérielles et de charge",
    s3: "3. Guide pratique de dépannage étape par étape",
    s4: "4. Conseils et précautions d'un réparateur professionnel",
    s5: "5. Foire Aux Questions (FAQ)"
  },
  es: {
    s1: "1. Emergencia crítica con el teléfono móvil",
    s2: "2. Análisis de causas raíz de fallos de carga y hardware",
    s3: "3. Solución práctica de emergencia paso a paso",
    s4: "4. Consejos y advertencias de un técnico reparador",
    s5: "5. Preguntas Frecuentes (FAQ)"
  },
  it: {
    s1: "1. Emergenza improvvisa con lo smartphone",
    s2: "2. Analisi approfondita dei guasti hardware e di ricarica",
    s3: "3. Guida pratica di risoluzione passo dopo passo",
    s4: "4. Avvertenze e suggerimenti del tecnico riparatore",
    s5: "5. Domande Frequenti (FAQ)"
  },
  pt: {
    s1: "1. Situação de emergência com o smartphone",
    s2: "2. Análise da causa raiz de falhas de carregamento e hardware",
    s3: "3. Guia prático de primeiros socorros passo a passo",
    s4: "4. Alertas e recomendações de técnicos especialistas",
    s5: "5. Perguntas Frequentes (FAQ)"
  },
  nl: {
    s1: "1. Kritieke smartphone-noodsituatie",
    s2: "2. Grondige oorzaakanalyse van laad- en hardwareproblemen",
    s3: "3. Stapsgewijze praktische noodoplossing",
    s4: "4. Belangrijke waarschuwingen van reparatiespecialisten",
    s5: "5. Veelgestelde Vragen (FAQ)"
  },
  pl: {
    s1: "1. Awaryjna sytuacja ze smartfonem",
    s2: "2. Szczegółowa analiza przyczyn problemów z ładowaniem i sprzętem",
    s3: "3. Praktyczne rozwiązanie problemu krok po kroku",
    s4: "4. Wskazówki i ostrzeżenia profesjonalnego serwisanta",
    s5: "5. Najczęściej zadawane pytania (FAQ)"
  },
  id: {
    s1: "1. Situasi Darurat Kritis pada Smartphone",
    s2: "2. Analisis Mendalam Kerusakan Port dan Hardware",
    s3: "3. Panduan Praktis Langkah demi Langkah Perbaikan Darurat",
    s4: "4. Tips & Peringatan Penting Teknisi Reparasi",
    s5: "5. Pertanyaan yang Sering Diajukan (FAQ)"
  },
  vi: {
    s1: "1. Tình huống sự cố điện thoại thông minh khẩn cấp",
    s2: "2. Phân tích nguyên nhân gốc rễ lỗi sạc và phần cứng",
    s3: "3. Các bước xử lý khẩn cấp thực tế từng bước",
    s4: "4. Lưu ý và lời khuyên quan trọng từ thợ sửa chữa",
    s5: "5. Các câu hỏi thường gặp (FAQ)"
  }
};

function getAllMarkdownFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllMarkdownFiles(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

function cleanPost(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const langMatch = filePath.match(/post[/\\]([a-z]{2})[/\\]/i);
  const langCode = langMatch ? langMatch[1].toLowerCase() : 'ko';
  const i18n = I18N_SECTIONS[langCode] || I18N_SECTIONS.ko;

  const fmMatch = content.match(/^---[\s\S]*?---\n*/);
  if (!fmMatch) return false;

  let frontmatter = fmMatch[0].trim();
  let body = content.slice(fmMatch[0].length).trim();

  // 1. 최상단 H1 삭제
  body = body.replace(/^#\s+[^\n]+\n+/, '');

  // 2. [2호기 핵심] 대괄호 영문 태그 및 헤더 누락을 현지어 H2 헤더로 100% 강제 치환
  body = body.replace(/^#{0,3}\s*1\.?\s*(\[Opening Story.*?\]|Opening Story.*?)/gmi, `## ${i18n.s1}`);
  body = body.replace(/^#{0,3}\s*2\.?\s*(\[Root Cause.*?\]|Root Cause Breakdown.*?|Root Cause.*?)/gmi, `## ${i18n.s2}`);
  body = body.replace(/^#{0,3}\s*3\.?\s*(\[Step-by-Step.*?\]|Step-by-Step Resolution.*?|Step-by-Step.*?)/gmi, `## ${i18n.s3}`);
  body = body.replace(/^#{0,3}\s*4\.?\s*(\[Expert.*?\]|Expert Advice.*?|Expert.*?)/gmi, `## ${i18n.s4}`);
  body = body.replace(/^#{0,3}\s*5\.?\s*(\[Frequently Asked Questions.*?\]|Frequently Asked Questions.*?|FAQ)/gmi, `## ${i18n.s5}`);

  // 번호 없이 단독으로 나온 영문 변칙 헤더 치환 (예: 캡처 7번 글 대응)
  body = body.replace(/^#{0,3}\s*Root Cause Breakdown.*$/gmi, `## ${i18n.s2}`);
  body = body.replace(/^#{0,3}\s*Step-by-Step Resolution.*$/gmi, `## ${i18n.s3}`);
  body = body.replace(/^#{0,3}\s*Expert Warning.*$/gmi, `## ${i18n.s4}`);
  body = body.replace(/^#{0,3}\s*Frequently Asked Questions.*$/gmi, `## ${i18n.s5}`);

  // 잔여 태그 도려내기
  body = body.replace(/\[(Opening Story\/Problem|Root Cause Breakdown|Step-by-Step Resolution|Expert Advice)\]/gi, '');

  // 3. 1번 헤더 누락 시 주입 및 직후 중복 1줄 정밀 제거
  if (!body.startsWith('## 1.')) {
    body = `## ${i18n.s1}\n\n` + body;
  }
  body = body.replace(/^(## 1\.[^\n]+)\n+(\s*1\.\s+[^\n]+)\n+/m, '$1\n\n');

  // 4. 단축키 주변 $ 기호 안전 백틱 치환
  body = body.replace(/\$(?:Strg|Ctrl|Win|Shift|Alt|Esc)\s*[^$\n]*\$/gi, (match) => {
    return `\`${match.replace(/\$/g, '').trim()}\``;
  });

  // 5. 볼드 및 Q&A 정렬
  body = body.replace(/^(#{1,6}\s*)\*\*(.*?)\*\*/gm, '$1$2');
  body = body.replace(/([^\n])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?)/gi, '$1\n\n$2');
  body = body.replace(/([^\n])\s+([QA][0-9]*\s*[:.])/g, '$1\n\n$2');
  body = body.replace(/([.!?])\s*(\*\*?[QA][0-9]*\s*[:.]\*\*?)/gi, '$1\n\n$2');

  // 6. 물음표 뒤 띄어쓰기 및 과도한 개행 압축
  body = body.replace(/\?([A-Za-z\u00C0-\u024F\u1EA0-\u1EF9가-힣])/g, '? $1');
  body = body.replace(/\n{3,}/g, '\n\n');

  // 7. 상단 21줄 공백 원천 차단 (프론트매터와 본문 사이 정확히 2줄 개행)
  const finalContent = `${frontmatter}\n\n${body.trim()}\n`;

  if (content !== finalContent) {
    fs.writeFileSync(filePath, finalContent, 'utf-8');
    return true;
  }
  return false;
}

function run() {
  console.log("==================================================");
  console.log("🛠️ 2호기 마크다운 기존 글 일괄 정밀 복구 스크립트 가동");
  console.log("==================================================");

  const files = getAllMarkdownFiles(POSTS_BASE_DIR);
  console.log(`총 ${files.length}개의 포스트를 검사합니다...\n`);

  let modifiedCount = 0;
  for (const file of files) {
    const isModified = cleanPost(file);
    const relPath = path.relative(process.cwd(), file);
    if (isModified) {
      console.log(`✨ [정밀 복구 완료] ${relPath}`);
      modifiedCount++;
    } else {
      console.log(`✔️ [이상 없음] ${relPath}`);
    }
  }

  console.log(`\n🎉 2호기 작업 완료: 총 ${files.length}개 중 ${modifiedCount}개 파일 복구 완료.`);
}

run();
