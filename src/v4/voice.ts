import type { AppSettings } from "../types";

export type EnglishVoiceOption = { id: string; name: string; label: string };

function isEnglishVoice(voice: SpeechSynthesisVoice) {
  return /^en(?:-|_)/i.test(voice.lang);
}

function voiceScore(voice: SpeechSynthesisVoice, preference: "female" | "male") {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const preferred = preference === "female"
    ? /ava|samantha|allison|karen|moira|victoria|zira|jenny|aria|serena|female/
    : /alex|daniel|fred|lee|david|guy|mark|eddy|male/;
  let score = preferred.test(name) ? 100 : 0;
  if (/premium|enhanced|natural|neural|online/.test(name)) score += 40;
  if (voice.default) score += 8;
  if (/compact|espeak|festival/.test(name)) score -= 80;
  return score;
}

export function availableEnglishVoices(): EnglishVoiceOption[] {
  if (!("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().filter(isEnglishVoice).sort((a, b) => a.name.localeCompare(b.name)).map((voice) => ({ id: voice.voiceURI, name: voice.name, label: `${voice.name} · ${voice.lang}` }));
}

export function speakEnglish(text: string, settings?: Pick<AppSettings, "voicePreference" | "voiceId" | "voiceRate">) {
  if (!("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const preference = settings?.voicePreference === "male" ? "male" : "female";
  const voices = window.speechSynthesis.getVoices().filter(isEnglishVoice);
  const selected = settings?.voiceId ? voices.find((voice) => voice.voiceURI === settings.voiceId) : undefined;
  const voice = selected ?? [...voices].sort((a, b) => voiceScore(b, preference) - voiceScore(a, preference))[0];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || "en-US";
  utterance.voice = voice ?? null;
  utterance.rate = settings?.voiceRate === 0.9 ? 0.9 : 0.78;
  utterance.pitch = preference === "female" ? 1.03 : 0.97;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}
