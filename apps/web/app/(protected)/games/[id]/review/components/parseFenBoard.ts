export function parseFenBoard(fen: string): (string | null)[][] {
  const boardPart = fen.split(" ")[0] ?? "";

  return boardPart.split("/").map((rank) => {
    const row: (string | null)[] = [];
    for (const char of rank) {
      if (/\d/.test(char)) row.push(...(Array(Number(char)).fill(null) as null[]));
      else row.push(char);
    }
    return row;
  });
}
