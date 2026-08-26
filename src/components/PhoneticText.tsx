const bpmf: Record<string, string> = {
  小: 'ㄒㄧㄠˇ', 探: 'ㄊㄢˋ', 險: 'ㄒㄧㄢˇ', 隊: 'ㄉㄨㄟˋ',
  學: 'ㄒㄩㄝˊ', 期: 'ㄑㄧˊ', 日: 'ㄖˋ', 曆: 'ㄌㄧˋ',
  今: 'ㄐㄧㄣ', 天: 'ㄊㄧㄢ', 任: 'ㄖㄣˋ', 務: 'ㄨˋ',
  開: 'ㄎㄞ', 始: 'ㄕˇ', 上: 'ㄕㄤˋ', 課: 'ㄎㄜˋ',
  本: 'ㄅㄣˇ', 節: 'ㄐㄧㄝˊ', 核: 'ㄏㄜˊ', 心: 'ㄒㄧㄣ', 字: 'ㄗˋ',
  句: 'ㄐㄩˋ', 型: 'ㄒㄧㄥˊ', 照: 'ㄓㄠˋ', 著: 'ㄓㄜ˙', 做: 'ㄗㄨㄛˋ', 就: 'ㄐㄧㄡˋ', 能: 'ㄋㄥˊ',
  互: 'ㄏㄨˋ', 動: 'ㄉㄨㄥˋ', 完: 'ㄨㄢˊ', 成: 'ㄔㄥˊ',
  後: 'ㄏㄡˋ', 紀: 'ㄐㄧˋ', 錄: 'ㄌㄨˋ',
  誰: 'ㄕㄟˊ', 一: 'ㄧ', 起: 'ㄑㄧˇ',
  家: 'ㄐㄧㄚ', 庭: 'ㄊㄧㄥˊ', 共: 'ㄍㄨㄥˋ', 設: 'ㄕㄜˋ', 定: 'ㄉㄧㄥˋ',
  重: 'ㄓㄨㄥˋ', 點: 'ㄉㄧㄢˇ', 獎: 'ㄐㄧㄤˇ', 勵: 'ㄌㄧˋ',
  雲: 'ㄩㄣˊ', 端: 'ㄉㄨㄢ', 同: 'ㄊㄨㄥˊ', 步: 'ㄅㄨˋ',
};

export default function PhoneticText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={`phonetic-text ${className}`} aria-label={text}>
      {Array.from(text).map((char, index) => {
        const reading = bpmf[char];
        if (!reading) return <span className="phonetic-plain" key={`${char}-${index}`}>{char}</span>;
        return (
          <span className="phonetic-unit" key={`${char}-${index}`}>
            <span className="phonetic-hanzi">{char}</span>
            <span className="phonetic-bpmf" aria-hidden="true">{reading}</span>
          </span>
        );
      })}
    </span>
  );
}
