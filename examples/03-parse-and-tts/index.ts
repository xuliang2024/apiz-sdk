import { Apiz } from "@apiz/sdk";

async function main(): Promise<void> {
  const client = new Apiz();

  // 1. Parse a public Douyin share link (free).
  const parsed = await client.tools.parseVideo("https://v.douyin.com/iJqPAfre/");
  console.log("video_url:", parsed.video_url);

  // 2. Synthesize a short voice-over (uses the first public voice by default).
  const voice = await client.speak("hello, this is apiz", { model: "speech-2.8-turbo" });
  console.log("audio_url:", voice.audio_url);
}

void main();
