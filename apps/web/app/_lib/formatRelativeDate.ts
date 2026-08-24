export const formatRelativeDate = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return "오늘";
  if (days === 1) return "어제";
  return `${days}일 전`;
};

export const formatGameEndedAt = (iso: string) => {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("ko-KR", { hour: "2-digit", hour12: false, minute: "2-digit" });
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (days <= 0) return `오늘 ${time}`;
  if (days === 1) return `어제 ${time}`;
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
};
