import { Apiz } from "apiz-sdk";

async function main(): Promise<void> {
  const client = new Apiz();

  // Provide the audio URL and the known subtitle text.
  const result = await client.align({
    audio_url:
      "https://fal-task-hk.tos-cn-hongkong.volces.com/transfer/audio/2026/04/20/619fa17492bf40079afe2ee5e43aa42b.mp3",
    audio_text:
      "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。",
    mode: "speech",
  });

  console.log(`duration: ${result.duration}s, ${result.utterances.length} utterances`);
  for (const u of result.utterances) {
    console.log(`[${u.start_time}-${u.end_time}ms] ${u.text}`);
    for (const w of u.words) {
      console.log(`  ${w.start_time}-${w.end_time} ${w.text}`);
    }
  }
}

void main();
