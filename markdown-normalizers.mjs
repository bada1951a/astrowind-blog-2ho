export function normalizeBoldSpacing(markdown) {
  return markdown
    .replace(/\*\*[ \t]+([^*\r\n]+?)[ \t]+\*\*/g, '**$1**')
    .replace(/\*\*[ \t]+([^*\r\n]+?)\*\*/g, '**$1**')
    .replace(/\*\*([^*\r\n]+?)[ \t]+\*\*/g, '**$1**');
}

export function validateFaqLayout(markdown) {
  const errors = [];
  for (const number of [1, 2, 3]) {
    const questionMarker = '**Q' + number + '.**';
    const answerMarker = '**A' + number + '.**';
    if (markdown.split(questionMarker).length - 1 !== 1) {
      errors.push('FAQ 질문 Q' + number + ' 표식이 정확히 1개 필요');
    }
    if (markdown.split(answerMarker).length - 1 !== 1) {
      errors.push('FAQ 답변 A' + number + ' 표식이 정확히 1개 필요');
    }
    if (!new RegExp('^\\*\\*Q' + number + '\\.\\*\\*[ \t]+[^\\r\\n]+$', 'm').test(markdown)) {
      errors.push('FAQ 질문 Q' + number + '은 별도 줄에 있어야 함');
    }
    if (!new RegExp('^\\*\\*A' + number + '\\.\\*\\*[ \t]+[^\\r\\n]+$', 'm').test(markdown)) {
      errors.push('FAQ 답변 A' + number + '은 별도 줄에 있어야 함');
    }
    const pair = new RegExp(
      '^\\*\\*Q' + number + '\\.\\*\\*[^\\r\\n]*\\r?\\n\\r?\\n\\*\\*A' + number + '\\.\\*\\*[^\\r\\n]+$',
      'm'
    );
    if (!pair.test(markdown)) {
      errors.push('FAQ 질문 Q' + number + '과 답변 A' + number + ' 사이에 빈 줄이 필요');
    }
  }
  return errors;
}
