const bpmf: Record<string, string> = {
  小: 'ㄒㄧㄠˇ', 探: 'ㄊㄢˋ', 險: 'ㄒㄧㄢˇ', 隊: 'ㄉㄨㄟˋ',
  學: 'ㄒㄩㄝˊ', 期: 'ㄑㄧˊ', 日: 'ㄖˋ', 曆: 'ㄌㄧˋ',
  今: 'ㄐㄧㄣ', 晚: 'ㄨㄢˇ', 天: 'ㄊㄧㄢ', 任: 'ㄖㄣˋ', 務: 'ㄨˋ',
  不: 'ㄅㄨˋ', 用: 'ㄩㄥˋ', 備: 'ㄅㄟˋ', 一: 'ㄧ', 起: 'ㄑㄧˇ',
  唱: 'ㄔㄤˋ', 玩: 'ㄨㄢˊ', 變: 'ㄅㄧㄢˋ', 強: 'ㄑㄧㄤˊ',
  開: 'ㄎㄞ', 始: 'ㄕˇ', 上: 'ㄕㄤˋ', 課: 'ㄎㄜˋ', 教: 'ㄐㄧㄠˋ', 案: 'ㄢˋ',
  本: 'ㄅㄣˇ', 節: 'ㄐㄧㄝˊ', 核: 'ㄏㄜˊ', 心: 'ㄒㄧㄣ', 字: 'ㄗˋ',
  句: 'ㄐㄩˋ', 型: 'ㄒㄧㄥˊ', 照: 'ㄓㄠˋ', 著: 'ㄓㄜ˙', 做: 'ㄗㄨㄛˋ', 就: 'ㄐㄧㄡˋ', 能: 'ㄋㄥˊ',
  互: 'ㄏㄨˋ', 動: 'ㄉㄨㄥˋ', 完: 'ㄨㄢˊ', 成: 'ㄔㄥˊ',
  後: 'ㄏㄡˋ', 紀: 'ㄐㄧˋ', 錄: 'ㄌㄨˋ', 誰: 'ㄕㄟˊ',
  家: 'ㄐㄧㄚ', 庭: 'ㄊㄧㄥˊ', 共: 'ㄍㄨㄥˋ', 設: 'ㄕㄜˋ', 定: 'ㄉㄧㄥˋ',
  重: 'ㄓㄨㄥˋ', 點: 'ㄉㄧㄢˇ', 獎: 'ㄐㄧㄤˇ', 勵: 'ㄌㄧˋ',
  雲: 'ㄩㄣˊ', 端: 'ㄉㄨㄢ', 同: 'ㄊㄨㄥˊ', 步: 'ㄅㄨˋ',
  歡: 'ㄏㄨㄢ', 迎: 'ㄧㄥˊ', 回: 'ㄏㄨㄟˊ', 到: 'ㄉㄠˋ', 星: 'ㄒㄧㄥ', 際: 'ㄐㄧˋ', 基: 'ㄐㄧ', 地: 'ㄉㄧˋ',
  進: 'ㄐㄧㄣˋ', 入: 'ㄖㄨˋ', 看: 'ㄎㄢˋ', 整: 'ㄓㄥˇ', 個: 'ㄍㄜˋ', 繼: 'ㄐㄧˋ', 續: 'ㄒㄩˋ',
  顯: 'ㄒㄧㄢˇ', 示: 'ㄕˋ', 明: 'ㄇㄧㄥˊ', 暗: 'ㄢˋ',
  冒: 'ㄇㄠˋ', 風: 'ㄈㄥ', 格: 'ㄍㄜˊ', 頭: 'ㄊㄡˊ', 像: 'ㄒㄧㄤˋ',
  孩: 'ㄏㄞˊ', 子: 'ㄗ˙', 名: 'ㄇㄧㄥˊ', 單: 'ㄉㄢ',
  目: 'ㄇㄨˋ', 標: 'ㄅㄧㄠ', 里: 'ㄌㄧˇ', 程: 'ㄔㄥˊ', 碑: 'ㄅㄟ',
  食: 'ㄕˊ', 物: 'ㄨˋ', 暖: 'ㄋㄨㄢˇ', 身: 'ㄕㄣ', 體: 'ㄊㄧˇ',
  帶: 'ㄉㄞˋ', 提: 'ㄊㄧˊ', 醒: 'ㄒㄧㄥˇ',
  加: 'ㄐㄧㄚ', 碼: 'ㄇㄚˇ', 認: 'ㄖㄣˋ', 得: 'ㄉㄜˊ',
  已: 'ㄧˇ', 儲: 'ㄔㄨˊ', 存: 'ㄘㄨㄣˊ', 切: 'ㄑㄧㄝ', 換: 'ㄏㄨㄢˋ',
  長: 'ㄓㄤˇ', 顧: 'ㄍㄨˋ', 者: 'ㄓㄜˇ',
};

const TONES = new Set(['ˊ', 'ˇ', 'ˋ', '˙']);

function splitReading(reading: string) {
  const last = reading.at(-1) ?? '';
  if (TONES.has(last)) return { symbols: reading.slice(0, -1), tone: last, neutral: last === '˙' };
  return { symbols: reading, tone: '', neutral: false };
}

export default function PhoneticText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`phonetic-text ${className}`} aria-label={text}>
      {Array.from(text).map((char, index) => {
        const reading = bpmf[char];
        if (!reading) return <span className="phonetic-plain" key={`${char}-${index}`}>{char}</span>;
        const { symbols, tone, neutral } = splitReading(reading);
        return (
          <span className="phonetic-unit" key={`${char}-${index}`}>
            <span className="phonetic-hanzi">{char}</span>
            <span className={`phonetic-bpmf ${neutral ? 'is-neutral' : ''}`} aria-hidden="true">
              <span className="phonetic-symbols">{symbols}</span>
              {tone && <span className="phonetic-tone">{tone}</span>}
            </span>
          </span>
        );
      })}
    </span>
  );
}
