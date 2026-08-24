declare module "stockfish" {
  namespace stockfish {
    type Variant = "full" | "lite" | "single" | "lite-single" | "single-lite" | "asm";

    interface Engine {
      listener?: (line: string) => void;
      sendCommand(command: string): void;
    }

    type ReadyCallback = (error: unknown, engine: Engine) => void;
  }

  function stockfish(enginePath?: stockfish.Variant | string): Promise<stockfish.Engine>;
  function stockfish(callback: stockfish.ReadyCallback): stockfish.Engine;
  function stockfish(enginePath: stockfish.Variant | string, callback: stockfish.ReadyCallback): stockfish.Engine;

  export = stockfish;
}
