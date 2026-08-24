export const formatRelativeDate = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
};
