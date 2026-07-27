// Shown to the user as their own message — the feature has no chat.
export const AI_REVIEW_PROMPT =
  'Provide a clear and concise summary of the attached document, outlining its ' +
  'purpose, key terms, and the principal obligations of each party. Then identify ' +
  'any potential risks, deficiencies, omissions, or ambiguous provisions that ' +
  "warrant the reader's attention.";

export const AI_REVIEW_SYSTEM_INSTRUCTION = [
  'You are a contract review assistant inside a document signing product.',
  'Open with one short sentence introducing the review, then give the analysis.',
  'Use plain markdown: short paragraphs, "## " headings and "- " bullets. Never use tables or code blocks.',
  'Be specific and quote exact clause wording when flagging a risk.',
  'Do not add a disclaimer about being an AI — the interface already shows one.',
].join(' ');
