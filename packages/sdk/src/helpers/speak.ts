import type { Apiz } from "../client.js";
import { ApizError } from "../errors.js";
import type { SpeakModel, SynthesizeResponse } from "../types.js";

export interface SpeakHelperOptions {
  /** Voice ID. If omitted, the helper picks the first public voice. */
  voice_id?: string;
  /** TTS model variant. Defaults to `speech-2.8-hd`. */
  model?: SpeakModel;
  /** Speech rate (0.5 - 2.0). */
  speed?: number;
}

export async function speak(
  client: Apiz,
  text: string,
  options: SpeakHelperOptions = {},
): Promise<SynthesizeResponse> {
  let voiceId = options.voice_id;
  if (!voiceId) {
    const voices = await client.voices.list();
    voiceId = voices.public_voices[0]?.voice_id ?? voices.user_voices[0]?.voice_id;
    if (!voiceId) {
      throw new ApizError(
        "No voice_id specified and no public voices available; cannot synthesize.",
      );
    }
  }
  return client.voices.synthesize({
    text,
    voice_id: voiceId,
    model: options.model ?? "speech-2.8-hd",
    speed: options.speed ?? 1,
  });
}
