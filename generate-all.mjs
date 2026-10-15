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
  const bodySeed = ((coverSeed + 499) % 1000) + 1; // 커버와 겹치지 않는 본문 번호

  // 엑박 원천 차단: Picsum 고유 Seed 이미지
  const coverUrl = `https://picsum.photos/seed/phone${coverSeed}/1200/630`;
  const bodyUrl = `https://picsum.photos/seed/mobile${bodySeed}/1000/550`;

  return { coverUrl, bodyUrl };
}

// 3
