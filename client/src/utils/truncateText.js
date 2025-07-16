// utils/truncateText.js
export const truncateText = (text, maxLength = 30) => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};